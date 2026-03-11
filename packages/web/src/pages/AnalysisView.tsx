import { useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAnalysis, useUpdateAnalysis, useArchiveAnalysis } from "../api/analyses";
import { useCreateAnalysis } from "../api/analyses";
import { useRealtimeUpdates } from "../hooks/useRealtimeUpdates";
import { AnalysisProgress } from "../components/analysis/AnalysisProgress";
import { PropertyAssessment } from "../components/analysis/PropertyAssessment";
import { PhotoAnalysisCard } from "../components/analysis/PhotoAnalysisCard";
import { ActionPlanTable } from "../components/analysis/ActionPlanTable";
import { ActionBar } from "@/components/ui/action-bar";
import { useJourneyItems } from "../api/journey";
import { AnalysisViewSkeleton } from "../components/skeletons";
import type { AvailableAction } from "@str-renovator/shared";

export function AnalysisView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: analysis, isLoading } = useAnalysis(id!);
  const updateAnalysis = useUpdateAnalysis(id!);
  const realtime = useRealtimeUpdates(id!);
  const { data: journeyItems } = useJourneyItems(analysis?.property_id ?? "");
  const archiveAnalysis = useArchiveAnalysis(analysis?.property_id ?? "");
  const createAnalysis = useCreateAnalysis(analysis?.property_id ?? "");

  const handleAction = useCallback(
    (action: AvailableAction) => {
      if (!analysis) return;
      switch (action.command) {
        case "view-action-plan":
          navigate(`/properties/${analysis.property_id}/journey`);
          break;
        case "archive-analysis":
          archiveAnalysis.mutate(analysis.id, {
            onSuccess: () => navigate(`/properties/${analysis.property_id}`),
          });
          break;
        case "retry-analysis":
          createAnalysis.mutate(undefined, {
            onSuccess: (newAnalysis) => navigate(`/analyses/${newAnalysis.id}`),
          });
          break;
      }
    },
    [analysis, archiveAnalysis, createAnalysis, navigate],
  );

  if (isLoading || !analysis) {
    return <AnalysisViewSkeleton />;
  }

  const currentStatus = realtime.status ?? analysis.status;
  const isComplete =
    currentStatus === "completed" || currentStatus === "partially_completed";
  const isFailed = currentStatus === "failed";
  const errorMessage =
    realtime.error ?? (isFailed ? analysis.error : null) ?? null;

  return (
    <div>
      <Link
        to={`/properties/${analysis.property_id}`}
        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
      >
        &larr; Back to Property
      </Link>

      <div className="flex items-center justify-between mt-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Analysis Results
        </h1>
        {analysis.availableActions && analysis.availableActions.length > 0 && (
          <ActionBar actions={analysis.availableActions} onAction={handleAction} />
        )}
      </div>

      {!isComplete && (
        <div className="mb-6">
          <AnalysisProgress
            status={currentStatus}
            completedPhotos={
              realtime.completedPhotos || analysis.completed_photos
            }
            totalPhotos={realtime.totalPhotos || analysis.total_photos}
            completedBatches={
              realtime.completedBatches || analysis.completed_batches
            }
            totalBatches={realtime.totalBatches || analysis.total_batches}
            failedBatches={realtime.failedBatches || analysis.failed_batches}
            isConnected={realtime.isConnected}
            error={errorMessage}
          />
        </div>
      )}

      {isComplete && currentStatus === "partially_completed" && (
        <div className="mb-6">
          <AnalysisProgress
            status={currentStatus}
            completedPhotos={analysis.completed_photos}
            totalPhotos={analysis.total_photos}
            completedBatches={analysis.completed_batches}
            totalBatches={analysis.total_batches}
            failedBatches={analysis.failed_batches}
            isConnected={false}
            error={null}
          />
        </div>
      )}

      {isComplete && (
        <div className="space-y-6">
          {analysis.property_assessment && (
            <PropertyAssessment
              assessment={analysis.property_assessment}
              styleDirection={analysis.style_direction ?? ""}
              confidence={analysis.raw_json?.confidence}
              reasoning={analysis.raw_json?.reasoning}
              onUpdateAssessment={(v) => updateAnalysis.mutate({ property_assessment: v })}
              onUpdateStyleDirection={(v) => updateAnalysis.mutate({ style_direction: v })}
              isSaving={updateAnalysis.isPending}
            />
          )}

          {analysis.analysis_photos && analysis.analysis_photos.length > 0 && (
            <>
              <h2 className="text-lg font-semibold text-gray-900">
                Photo Analysis
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {analysis.analysis_photos.map((ap) => {
                  const rawPhoto = analysis.raw_json?.photos?.find(
                    (p) => p.filename === ap.photos?.filename
                  );
                  return (
                    <PhotoAnalysisCard
                      key={ap.id}
                      analysisPhoto={ap}
                      confidence={rawPhoto?.confidence}
                      reasoning={rawPhoto?.reasoning}
                    />
                  );
                })}
              </div>
            </>
          )}

          {analysis.raw_json?.action_plan &&
            analysis.raw_json.action_plan.length > 0 && (
              <ActionPlanTable actionPlan={analysis.raw_json.action_plan} journeyItems={journeyItems} />
            )}
        </div>
      )}
    </div>
  );
}
