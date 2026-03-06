import type { Job } from "bullmq";
import { supabase } from "../config/supabase.js";
import * as analysisService from "../services/analysis.service.js";
import * as storageService from "../services/storage.service.js";
import * as reportService from "../services/report.service.js";
import { enqueueRenovation } from "../services/queue.service.js";
import type {
  DbPhoto,
  DbProperty,
  ImageQuality,
  ImageSize,
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

    // 4. Download photo buffers from storage
    const buffers: Buffer[] = [];
    const filenames: string[] = [];
    for (const photo of typedPhotos) {
      const buffer = await storageService.downloadPhoto(photo.storage_path);
      buffers.push(buffer);
      filenames.push(photo.filename);
    }

    // 5. Call analysis service
    const analysis = await analysisService.analyzeProperty({
      buffers,
      filenames,
      context: (property as DbProperty)?.context ?? undefined,
    });

    // 6. Save analysis results
    await supabase
      .from("analyses")
      .update({
        property_assessment: analysis.property_assessment,
        style_direction: analysis.style_direction,
        raw_json: analysis,
      })
      .eq("id", analysisId);

    // 7. Create analysis_photos rows matching photos by filename
    const analysisPhotoIds: { id: string; renovations: string }[] = [];
    for (const photoAnalysis of analysis.photos) {
      const matchedPhoto = typedPhotos.find(
        (p) => p.filename === photoAnalysis.filename
      );
      if (!matchedPhoto) continue;

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

    // 8. Create design_journey_items from action_plan
    for (const action of analysis.action_plan) {
      await supabase.from("design_journey_items").insert({
        property_id: propertyId,
        analysis_id: analysisId,
        user_id: userId,
        priority: action.priority,
        title: action.item,
        estimated_cost: action.estimated_cost,
        impact: action.impact,
        rooms_affected: action.rooms_affected,
      });
    }

    // 9. Update status to generating_images
    await supabase
      .from("analyses")
      .update({ status: "generating_images" })
      .eq("id", analysisId);

    // 10. Enqueue renovation jobs for each analysis_photo
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

    // 11. Enqueue report generation for each analysis_photo
    for (const ap of analysisPhotoIds) {
      const report = await reportService.generateTextReport(ap.renovations);
      await supabase
        .from("analysis_photos")
        .update({ report })
        .eq("id", ap.id);
    }

    // 12. Update status — will be set to completed once all renovations finish
    // Check if there are no renovation jobs (edge case)
    if (analysisPhotoIds.length === 0) {
      await supabase
        .from("analyses")
        .update({ status: "completed" })
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
