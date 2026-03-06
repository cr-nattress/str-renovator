import type { AnalysisStatus } from "@str-renovator/shared";

interface Props {
  status: AnalysisStatus | null;
  completedPhotos: number;
  totalPhotos: number;
  isConnected: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Queued",
  analyzing: "Analyzing photos",
  generating_images: "Generating renovated images",
  generating_reports: "Writing reports",
  completed: "Completed",
  failed: "Failed",
};

export function AnalysisProgress({
  status,
  completedPhotos,
  totalPhotos,
  isConnected,
}: Props) {
  const pct = totalPhotos > 0 ? (completedPhotos / totalPhotos) * 100 : 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">
          Analysis in Progress
        </h3>
        {isConnected && (
          <span className="inline-flex items-center gap-1.5 text-xs text-green-600">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Live
          </span>
        )}
      </div>

      <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
        <div
          className="bg-blue-600 h-3 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">
          {status ? STATUS_LABELS[status] || status : "Connecting..."}
        </span>
        <span className="text-gray-500">
          {completedPhotos} of {totalPhotos} photos
        </span>
      </div>
    </div>
  );
}
