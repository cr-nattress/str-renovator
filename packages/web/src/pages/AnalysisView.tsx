import { useParams, Link } from "react-router-dom";
import { useAnalysis } from "../api/analyses";
import { useRealtimeUpdates } from "../hooks/useRealtimeUpdates";
import { AnalysisProgress } from "../components/analysis/AnalysisProgress";
import { PropertyAssessment } from "../components/analysis/PropertyAssessment";
import { PhotoAnalysisCard } from "../components/analysis/PhotoAnalysisCard";
import { ActionPlanTable } from "../components/analysis/ActionPlanTable";

export function AnalysisView() {
  const { id } = useParams<{ id: string }>();
  const { data: analysis, isLoading } = useAnalysis(id!);
  const realtime = useRealtimeUpdates(id!);

  if (isLoading || !analysis) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  const isComplete = analysis.status === "completed";
  const isFailed = analysis.status === "failed";

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

      {!isComplete && !isFailed && (
        <div className="mb-6">
          <AnalysisProgress
            status={realtime.status ?? analysis.status}
            completedPhotos={
              realtime.completedPhotos || analysis.completed_photos
            }
            totalPhotos={realtime.totalPhotos || analysis.total_photos}
            isConnected={realtime.isConnected}
          />
        </div>
      )}

      {isFailed && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-700">
            Analysis failed: {analysis.error || "Unknown error"}
          </p>
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
              <ActionPlanTable actionPlan={analysis.raw_json.action_plan} />
            )}
        </div>
      )}
    </div>
  );
}
