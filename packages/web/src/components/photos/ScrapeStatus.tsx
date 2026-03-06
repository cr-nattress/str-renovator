import { useScrapeJob, type ScrapeJob } from "../../api/scrape";

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
  downloading: {
    label: "Downloading photos...",
    color: "text-purple-600",
    bgColor: "bg-purple-100",
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
  const { data: job } = useScrapeJob(jobId);

  if (!job) {
    return (
      <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <Spinner />
        <span className="text-sm text-gray-600">Starting import...</span>
      </div>
    );
  }

  const config = STATUS_CONFIG[job.status];
  const isActive = job.status === "pending" || job.status === "scraping" || job.status === "downloading";
  const showProgress = job.status === "downloading" && job.total_photos > 0;
  const pct = showProgress
    ? Math.round((job.downloaded_photos / job.total_photos) * 100)
    : 0;

  return (
    <div className={`p-3 rounded-lg border ${config.bgColor} border-opacity-50`}>
      <div className="flex items-center gap-2">
        {isActive && <Spinner />}
        {job.status === "completed" && (
          <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
        {job.status === "failed" && (
          <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
        <span className={`text-sm font-medium ${config.color}`}>
          {config.label}
        </span>
        {showProgress && (
          <span className="text-xs text-gray-500 ml-auto">
            {job.downloaded_photos} / {job.total_photos} photos
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

      {job.status === "failed" && job.error && (
        <p className="text-xs text-red-600 mt-1.5">{job.error}</p>
      )}

      {job.status === "completed" && (
        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs text-green-700">
            {job.downloaded_photos} photo{job.downloaded_photos !== 1 ? "s" : ""} imported
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
