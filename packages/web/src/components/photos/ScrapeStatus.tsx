import { useStreamProgress } from "../../hooks/useStreamProgress";
import type { ScrapeJob } from "../../api/scrape";

interface Props {
  jobId: string;
  onDone: () => void;
}

const STATUS_CONFIG: Record<
  ScrapeJob["status"],
  { label: string; color: string; bgColor: string }
> = {
  pending: {
    label: "Preparing...",
    color: "text-gray-600",
    bgColor: "bg-gray-100",
  },
  scraping: {
    label: "Finding photos on page...",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  extracting_data: {
    label: "Extracting listing data...",
    color: "text-indigo-600",
    bgColor: "bg-indigo-100",
  },
  analyzing_reviews: {
    label: "Analyzing guest reviews...",
    color: "text-cyan-600",
    bgColor: "bg-cyan-100",
  },
  downloading: {
    label: "Downloading photos...",
    color: "text-purple-600",
    bgColor: "bg-purple-100",
  },
  researching_location: {
    label: "Researching location...",
    color: "text-teal-600",
    bgColor: "bg-teal-100",
  },
  synthesizing: {
    label: "Building property profile...",
    color: "text-amber-600",
    bgColor: "bg-amber-100",
  },
  completed: {
    label: "Import complete!",
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  failed: {
    label: "Import failed",
    color: "text-red-600",
    bgColor: "bg-red-100",
  },
};

export function ScrapeStatus({ jobId, onDone }: Props) {
  const stream = useStreamProgress(`/api/v1/scrape-jobs/${jobId}/stream`, {
    invalidateKeys: [["scrape-job", jobId], ["scrape-jobs"]],
    onDone,
  });

  const status = (stream.currentStatus ?? "pending") as ScrapeJob["status"];
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const displayMessage = stream.currentMessage ?? config.label;
  const isActive = !stream.isDone && !stream.error;
  const showProgress = stream.progress && stream.progress.total > 0;
  const pct = showProgress
    ? Math.round((stream.progress!.completed / stream.progress!.total) * 100)
    : 0;

  return (
    <div className={`p-3 rounded-lg border ${config.bgColor} border-opacity-50`}>
      <div className="flex items-center gap-2">
        {isActive && <Spinner />}
        {stream.isDone && (
          <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
        {stream.error && (
          <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
        <span className={`text-sm font-medium ${config.color}`}>
          {displayMessage}
        </span>
        {showProgress && (
          <span className="text-xs text-gray-500 ml-auto">
            {stream.progress!.completed} / {stream.progress!.total} photos
          </span>
        )}
      </div>

      {showProgress && (
        <div className="mt-2 w-full bg-white/50 rounded-full h-2">
          <div
            className="bg-purple-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {stream.error && (
        <p className="text-xs text-red-600 mt-1.5">{stream.error}</p>
      )}

      {stream.isDone && (
        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs text-green-700">
            {stream.progress
              ? `${stream.progress.completed} photo${stream.progress.completed !== 1 ? "s" : ""} imported`
              : "Import complete"}
          </p>
          <button
            onClick={onDone}
            className="text-xs text-green-700 hover:text-green-800 font-medium underline"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="w-4 h-4 animate-spin text-current"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
