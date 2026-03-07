import type { Job } from "bullmq";
import pLimit from "p-limit";
import { supabase } from "../config/supabase.js";
import * as batchService from "../services/batch.service.js";
import * as reportService from "../services/report.service.js";
import { enqueueRenovation, enqueueActionImage } from "../services/queue.service.js";
import {
  CONCURRENCY,
  type DbPhoto,
  type DbProperty,
  type ImageQuality,
  type ImageSize,
} from "@str-renovator/shared";

interface AnalysisJobData {
  analysisId: string;
  propertyId: string;
  userId: string;
  quality: ImageQuality;
  size: ImageSize;
}

export async function processAnalysisJob(
  job: Job<AnalysisJobData>
): Promise<void> {
  const { analysisId, propertyId, userId, quality, size } = job.data;

  try {
    // 1. Update status to analyzing
    await supabase
      .from("analyses")
      .update({ status: "analyzing" })
      .eq("id", analysisId);

    // 2. Fetch property for context
    const { data: property } = await supabase
      .from("properties")
      .select("*")
      .eq("id", propertyId)
      .single();

    // 3. Fetch all photos for property
    const { data: photos, error: photosError } = await supabase
      .from("photos")
      .select("*")
      .eq("property_id", propertyId);

    if (photosError || !photos || photos.length === 0) {
      throw new Error("No photos found for property");
    }

    const typedPhotos = photos as DbPhoto[];
    const context = (property as DbProperty)?.context ?? undefined;

    // 4. Create batch records
    const batches = await batchService.createBatchRecords(
      analysisId,
      typedPhotos,
      CONCURRENCY.analysisBatchSize
    );

    // Update total_batches on analysis
    await supabase
      .from("analyses")
      .update({ total_batches: batches.length })
      .eq("id", analysisId);

    // 5. Process batches with concurrency limit
    const limit = pLimit(CONCURRENCY.analysisBatchConcurrency);
    let completedCount = 0;
    let failedCount = 0;

    await Promise.all(
      batches.map((batch) =>
        limit(async () => {
          try {
            await batchService.processSingleBatch(
              batch,
              typedPhotos,
              context,
              batches.length
            );
            completedCount++;
            await supabase
              .from("analyses")
              .update({ completed_batches: completedCount })
              .eq("id", analysisId);
          } catch (err) {
            failedCount++;
            await supabase
              .from("analyses")
              .update({ failed_batches: failedCount })
              .eq("id", analysisId);
            console.error(
              `Batch ${batch.batch_index} failed:`,
              err instanceof Error ? err.message : err
            );
          }
        })
      )
    );

    // 6. If ALL batches failed, mark analysis as failed
    if (completedCount === 0) {
      throw new Error(
        `All ${batches.length} batches failed. Analysis cannot proceed.`
      );
    }

    // 7. Status → aggregating
    await supabase
      .from("analyses")
      .update({ status: "aggregating" })
      .eq("id", analysisId);

    // 8. Aggregate batch results
    const analysis = await batchService.aggregateBatchResults(analysisId);

    // 9. Save merged results
    await supabase
      .from("analyses")
      .update({
        property_assessment: analysis.property_assessment,
        style_direction: analysis.style_direction,
        raw_json: analysis,
      })
      .eq("id", analysisId);

    // 10. Determine which photo IDs were in successful batches
    const { data: successfulBatches } = await supabase
      .from("analysis_batches")
      .select("photo_ids")
      .eq("analysis_id", analysisId)
      .eq("status", "completed");

    const successfulPhotoIds = new Set(
      (successfulBatches ?? []).flatMap((b: any) => b.photo_ids as string[])
    );

    // 11. Create analysis_photos rows from merged result (only for successful batch photos)
    const analysisPhotoIds: { id: string; renovations: string }[] = [];
    for (const photoAnalysis of analysis.photos) {
      const matchedPhoto = typedPhotos.find(
        (p) => p.filename === photoAnalysis.filename
      );
      if (!matchedPhoto) continue;
      if (!successfulPhotoIds.has(matchedPhoto.id)) continue;

      const { data: analysisPhoto, error: apError } = await supabase
        .from("analysis_photos")
        .insert({
          analysis_id: analysisId,
          photo_id: matchedPhoto.id,
          room: photoAnalysis.room,
          strengths: photoAnalysis.strengths,
          renovations: photoAnalysis.renovations,
          priority: photoAnalysis.priority,
        })
        .select("id")
        .single();

      if (apError || !analysisPhoto) continue;
      analysisPhotoIds.push({
        id: analysisPhoto.id,
        renovations: photoAnalysis.renovations,
      });
    }

    // 12. Create design_journey_items from action_plan + enqueue action image jobs
    // Build room → photo_id map from analysis_photos (case-insensitive)
    const { data: analysisPhotosForMap } = await supabase
      .from("analysis_photos")
      .select("id, photo_id, room")
      .eq("analysis_id", analysisId);

    const roomToPhotoId = new Map<string, string>();
    for (const ap of analysisPhotosForMap ?? []) {
      roomToPhotoId.set(ap.room.toLowerCase(), ap.photo_id);
    }

    const firstPhotoId = typedPhotos[0]?.id ?? null;
    const styleDirection = analysis.style_direction ?? "";

    for (const action of analysis.action_plan) {
      // Match rooms_affected to find a source photo
      let sourcePhotoId: string | null = null;
      for (const room of action.rooms_affected) {
        const matched = roomToPhotoId.get(room.toLowerCase());
        if (matched) {
          sourcePhotoId = matched;
          break;
        }
      }
      // Fallback to first available photo
      if (!sourcePhotoId) sourcePhotoId = firstPhotoId;

      const imageStatus = sourcePhotoId ? "pending" : "skipped";

      const { data: journeyItem } = await supabase
        .from("design_journey_items")
        .insert({
          property_id: propertyId,
          analysis_id: analysisId,
          user_id: userId,
          priority: action.priority,
          title: action.item,
          estimated_cost: action.estimated_cost,
          impact: action.impact,
          rooms_affected: action.rooms_affected,
          source_photo_id: sourcePhotoId,
          image_status: imageStatus,
        })
        .select("id")
        .single();

      if (journeyItem && sourcePhotoId) {
        const matchedRoom = action.rooms_affected[0] ?? "Room";
        await enqueueActionImage(
          journeyItem.id,
          sourcePhotoId,
          userId,
          propertyId,
          action.item,
          matchedRoom,
          styleDirection,
          quality,
          size
        );
      }
    }

    // 13. Status → generating_images
    await supabase
      .from("analyses")
      .update({ status: "generating_images" })
      .eq("id", analysisId);

    // 14. Enqueue renovation jobs for each analysis_photo
    for (const ap of analysisPhotoIds) {
      const { data: renovation, error: renError } = await supabase
        .from("renovations")
        .insert({
          analysis_photo_id: ap.id,
          user_id: userId,
          iteration: 1,
          status: "pending",
        })
        .select("id")
        .single();

      if (renError || !renovation) continue;
      await enqueueRenovation(renovation.id, ap.id, userId, quality, size);
    }

    // 15. Generate reports for each analysis_photo
    for (const ap of analysisPhotoIds) {
      const report = await reportService.generateTextReport(ap.renovations);
      await supabase
        .from("analysis_photos")
        .update({ report })
        .eq("id", ap.id);
    }

    // 16. Final status — partially_completed if any batches failed
    if (analysisPhotoIds.length === 0) {
      const finalStatus = failedCount > 0 ? "partially_completed" : "completed";
      await supabase
        .from("analyses")
        .update({ status: finalStatus })
        .eq("id", analysisId);
    } else if (failedCount > 0) {
      // Will be set to partially_completed once all renovations finish
      // Store a marker so the renovation completion handler knows
      await supabase
        .from("analyses")
        .update({ failed_batches: failedCount })
        .eq("id", analysisId);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await supabase
      .from("analyses")
      .update({ status: "failed", error: message })
      .eq("id", analysisId);
    throw err;
  }
}
