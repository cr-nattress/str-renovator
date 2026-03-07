import { useParams, Link } from "react-router-dom";
import { useAnalysis } from "../api/analyses";
import { useRealtimeUpdates } from "../hooks/useRealtimeUpdates";
import { AnalysisProgress } from "../components/analysis/AnalysisProgress";
import { PropertyAssessment } from "../components/analysis/PropertyAssessment";
import { PhotoAnalysisCard } from "../components/analysis/PhotoAnalysisCard";
import { ActionPlanTable } from "../components/analysis/ActionPlanTable";
import { useJourneyItems } from "../api/journey";

export function AnalysisView() {
  const { id } = useParams<{ id: string }>();
  const { data: analysis, isLoading } = useAnalysis(id!);
  const realtime = useRealtimeUpdates(id!);
  const { data: journeyItems } = useJourneyItems(analysis?.property_id ?? "");

  if (isLoading || !analysis) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
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

      <h1 className="text-2xl font-bold text-gray-900 mt-3 mb-6">
        Analysis Results
      </h1>

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
            />
          )}

          {analysis.photos && analysis.photos.length > 0 && (
            <>
              <h2 className="text-lg font-semibold text-gray-900">
                Photo Analysis
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {analysis.photos.map((ap) => (
                  <PhotoAnalysisCard key={ap.id} analysisPhoto={ap} />
                ))}
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
