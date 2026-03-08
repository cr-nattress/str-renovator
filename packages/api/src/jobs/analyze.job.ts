import type { Job } from "bullmq";
import pLimit from "p-limit";
import { supabase } from "../config/supabase.js";
import { createChildLogger } from "../config/logger.js";
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
  const log = createChildLogger({ jobType: "analysis", analysisId, propertyId });

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
            await supabase.rpc("increment_counter", {
              p_table: "analyses",
              p_column: "completed_batches",
              p_id: analysisId,
            });
          } catch (err) {
            failedCount++;
            await supabase.rpc("increment_counter", {
              p_table: "analyses",
              p_column: "failed_batches",
              p_id: analysisId,
            });
            log.error(
              { batchIndex: batch.batch_index, err: err instanceof Error ? err.message : err },
              "batch failed"
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
    const { data: analysis, metadata: aggregationMeta } = await batchService.aggregateBatchResults(analysisId);

    // 9. Save merged results with AI metadata
    await supabase
      .from("analyses")
      .update({
        property_assessment: analysis.property_assessment,
        style_direction: analysis.style_direction,
        raw_json: analysis,
        prompt_version: aggregationMeta.promptVersion,
        model: aggregationMeta.model,
        tokens_used: aggregationMeta.tokensUsed,
      })
      .eq("id", analysisId);

    // 10. Determine which photo IDs were in successful batches
    const { data: successfulBatches } = await supabase
      .from("analysis_batches")
      .select("photo_ids, filenames")
      .eq("analysis_id", analysisId)
      .eq("status", "completed")
      .order("batch_index");

    const successfulPhotoIds = new Set(
      (successfulBatches ?? []).flatMap((b: any) => b.photo_ids as string[])
    );

    // Build ordered list of all filenames across successful batches for index-based fallback
    const allBatchFilenames: string[] = (successfulBatches ?? []).flatMap(
      (b: any) => b.filenames as string[]
    );

    // 11. Create analysis_photos rows from merged result (only for successful batch photos)
    const analysisPhotoIds: { id: string; renovations: string }[] = [];
    for (let i = 0; i < analysis.photos.length; i++) {
      const photoAnalysis = analysis.photos[i];

      // Try exact filename match first
      let matchedPhoto = typedPhotos.find(
        (p) => p.filename === photoAnalysis.filename
      );

      // Fallback: match by position (AI may have re-numbered filenames)
      if (!matchedPhoto && i < allBatchFilenames.length) {
        matchedPhoto = typedPhotos.find(
          (p) => p.filename === allBatchFilenames[i]
        );
      }

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

    // Dedup: query existing journey items for this property
    const { data: existingItems } = await supabase
      .from("design_journey_items")
      .select("id, priority, title, image_status, image_storage_path, source_photo_id")
      .eq("property_id", propertyId);

    const existingByKey = new Map(
      (existingItems ?? []).map((i) => [`${i.priority}::${i.title}`, i])
    );

    for (const action of analysis.action_plan) {
      // Resolve sourcePhotoId before dedup check so both paths can use it
      let sourcePhotoId: string | null = null;
      for (const room of action.rooms_affected) {
        const matched = roomToPhotoId.get(room.toLowerCase());
        if (matched) {
          sourcePhotoId = matched;
          break;
        }
      }
      if (!sourcePhotoId) sourcePhotoId = firstPhotoId;

      const dedupKey = `${action.priority}::${action.item}`;
      const existing = existingByKey.get(dedupKey);

      if (existing) {
        // Completed image exists — skip entirely
        if (existing.image_status === "completed" && existing.image_storage_path) {
          continue;
        }

        // Already in flight — skip
        if (existing.image_status === "pending" || existing.image_status === "processing") {
          continue;
        }

        // Failed or skipped — update and re-enqueue if source photo now available
        if (existing.image_status === "failed" || existing.image_status === "skipped") {
          const updates: Record<string, unknown> = { analysis_id: analysisId };
          if (sourcePhotoId) {
            updates.source_photo_id = sourcePhotoId;
            updates.image_status = "pending";
          }
          await supabase
            .from("design_journey_items")
            .update(updates)
            .eq("id", existing.id);

          if (sourcePhotoId) {
            const matchedRoom = action.rooms_affected[0] ?? "Room";
            await enqueueActionImage(
              existing.id,
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
          continue;
        }
      }

      // No existing match — insert new item
      const imageStatus = sourcePhotoId ? "pending" : "skipped";

      const { data: journeyItem, error: jiError } = await supabase
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

      if (jiError || !journeyItem) {
        log.error({ item: action.item, err: jiError?.message ?? "no data returned" }, "failed to create journey item");
        continue;
      }

      if (sourcePhotoId) {
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

    // 13. Status → generating_images, update total_photos to actual analysis_photo count
    await supabase
      .from("analyses")
      .update({
        status: "generating_images",
        total_photos: analysisPhotoIds.length,
      })
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
      const { data: report } = await reportService.generateTextReport(ap.renovations);
      await supabase
        .from("analysis_photos")
        .update({ report })
        .eq("id", ap.id);
    }

    // 16. Final status
    if (analysisPhotoIds.length === 0) {
      // No analysis photos created — nothing to renovate, so complete now
      const finalStatus = failedCount > 0 ? "partially_completed" : "completed";
      await supabase
        .from("analyses")
        .update({ status: finalStatus })
        .eq("id", analysisId);
    } else if (failedCount > 0) {
      // Renovation jobs are running; store failure marker so the renovation
      // completion handler can set partially_completed instead of completed
      await supabase
        .from("analyses")
        .update({ failed_batches: failedCount })
        .eq("id", analysisId);
    }
    // When analysisPhotoIds.length > 0 and failedCount === 0, status stays
    // at generating_images — renovate.job.ts sets completed once all finish
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await supabase
      .from("analyses")
      .update({ status: "failed", error: message })
      .eq("id", analysisId);
    throw err;
  }
}
