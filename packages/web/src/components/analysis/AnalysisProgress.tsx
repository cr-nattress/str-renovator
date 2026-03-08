import { useState, useEffect } from "react";
import type { AnalysisStatus } from "@str-renovator/shared";

interface Props {
  status: AnalysisStatus | null;
  completedPhotos: number;
  totalPhotos: number;
  completedBatches: number;
  totalBatches: number;
  failedBatches: number;
  isConnected: boolean;
  error?: string | null;
}

interface StepInfo {
  label: string;
  description: string;
}

const STEPS: { key: AnalysisStatus; info: StepInfo }[] = [
  {
    key: "pending",
    info: {
      label: "Queued",
      description: "Your analysis is in the queue and will begin shortly.",
    },
  },
  {
    key: "analyzing",
    info: {
      label: "Analyzing photos",
      description:
        "Our AI is studying each photo to identify the room type, current condition, and renovation opportunities.",
    },
  },
  {
    key: "aggregating",
    info: {
      label: "Combining results",
      description:
        "Merging batch analyses into a unified property assessment.",
    },
  },
  {
    key: "generating_images",
    info: {
      label: "Generating renovated images",
      description:
        "Creating AI-rendered previews of how each room could look after renovations.",
    },
  },
  {
    key: "generating_reports",
    info: {
      label: "Writing reports",
      description:
        "Compiling detailed renovation recommendations and cost estimates for each room.",
    },
  },
];

const TIPS = [
  "Tip: Higher-quality photos lead to more accurate renovation suggestions.",
  "Tip: Include photos from multiple angles to get a more complete analysis.",
  "Tip: The AI considers lighting, furniture, finishes, and layout in its assessment.",
  "Tip: Each photo is analyzed independently, then cross-referenced for a cohesive plan.",
  "Tip: Renovation cost estimates are based on national averages and may vary by region.",
  "Tip: You can re-run individual renovations with feedback to refine the results.",
];

function friendlyError(error: string): string {
  const lower = error.toLowerCase();
  if (lower.includes("timeout") || lower.includes("timed out")) {
    return "The analysis took longer than expected. This can happen with large photo sets — please try again.";
  }
  if (lower.includes("rate limit") || lower.includes("429")) {
    return "Our AI service is experiencing high demand. Please wait a moment and try again.";
  }
  if (lower.includes("no photos")) {
    return "No photos were found for this property. Please upload photos before running an analysis.";
  }
  if (
    lower.includes("network") ||
    lower.includes("fetch") ||
    lower.includes("econnrefused")
  ) {
    return "A network issue occurred while processing your analysis. Please check your connection and try again.";
  }
  if (lower.includes("storage") || lower.includes("download")) {
    return "There was a problem accessing your photos. Please try uploading them again.";
  }
  if (lower.includes("openai") || lower.includes("api")) {
    return "Our AI service encountered an issue. This is usually temporary — please try again in a few minutes.";
  }
  return "Something unexpected happened during the analysis. Please try again, and if the issue persists, contact support.";
}

export function AnalysisProgress({
  status,
  completedPhotos,
  totalPhotos,
  completedBatches,
  totalBatches,
  failedBatches,
  isConnected,
  error,
}: Props) {
  const [tipIndex, setTipIndex] = useState(
    () => Math.floor(Math.random() * TIPS.length),
  );

  // Rotate tips every 8 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % TIPS.length);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  const currentStepIndex = STEPS.findIndex((s) => s.key === status);
  const currentStep =
    currentStepIndex >= 0 ? STEPS[currentStepIndex] : undefined;

  // Overall progress: step-based + batch/photo-based within steps
  let overallPct = 0;
  if (status === "pending") {
    overallPct = 5;
  } else if (status === "analyzing") {
    const batchPct = totalBatches > 0
      ? (completedBatches + failedBatches) / totalBatches
      : 0;
    overallPct = 10 + batchPct * 15; // 10% – 25%
  } else if (status === "aggregating") {
    overallPct = 28;
  } else if (status === "generating_images") {
    const photoPct = totalPhotos > 0 ? completedPhotos / totalPhotos : 0;
    overallPct = 30 + photoPct * 55; // 30% – 85%
  } else if (status === "generating_reports") {
    overallPct = 90;
  } else if (status === "completed" || status === "partially_completed") {
    overallPct = 100;
  }

  if (status === "partially_completed") {
    return (
      <div className="bg-white rounded-lg border border-amber-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-3">
          <svg
            className="w-5 h-5 text-amber-500 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126Z"
            />
          </svg>
          <h3 className="text-sm font-semibold text-amber-900">
            Analysis partially completed
          </h3>
        </div>
        <p className="text-sm text-amber-700">
          Some photo batches could not be analyzed ({failedBatches} of{" "}
          {totalBatches} failed). Results below reflect the photos that were
          successfully processed.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-red-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-3">
          <svg
            className="w-5 h-5 text-red-500 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
            />
          </svg>
          <h3 className="text-sm font-semibold text-red-900">
            Analysis could not be completed
          </h3>
        </div>
        <p className="text-sm text-red-700">{friendlyError(error)}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border-2 border-blue-200 animate-pulse-border shadow-sm p-6">
      {/* Header with spinner */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <svg
            className="w-5 h-5 text-blue-600 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <h3 className="text-sm font-semibold text-gray-900">
            Analysis in Progress
          </h3>
        </div>
        {isConnected && (
          <span className="inline-flex items-center gap-1.5 text-xs text-green-600">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Live
          </span>
        )}
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-1 mb-4">
        {STEPS.map((step, i) => {
          const isActive = i === currentStepIndex;
          const isDone = currentStepIndex > i;
          return (
            <div key={step.key} className="flex-1 flex flex-col items-center">
              <div
                className={`h-2 w-full rounded-full transition-colors duration-500 ${
                  isDone
                    ? "bg-blue-600"
                    : isActive
                      ? "bg-blue-400 animate-pulse"
                      : "bg-gray-200"
                }`}
              />
              <span
                className={`text-[10px] mt-1.5 ${
                  isActive
                    ? "text-blue-700 font-semibold"
                    : isDone
                      ? "text-blue-600"
                      : "text-gray-400"
                }`}
              >
                {step.info.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Main progress bar with shimmer */}
      <div className="w-full bg-gray-200 rounded-full h-3.5 mb-3 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out relative"
          style={{
            width: `${Math.max(overallPct, 2)}%`,
            background: "linear-gradient(90deg, #2563eb 0%, #60a5fa 50%, #2563eb 100%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 2s infinite linear",
          }}
        />
      </div>

      {/* Status text and progress counts */}
      <div className="flex items-center justify-between text-sm mb-4">
        <span className="text-gray-700 font-medium">
          {currentStep?.info.label ?? "Connecting"}
          <span className="inline-block w-6 text-left after:animate-ellipsis after:content-['...']">
          </span>
        </span>
        {status === "analyzing" && totalBatches > 1 && (
          <span className="text-gray-500 tabular-nums">
            Batch {completedBatches + failedBatches} of {totalBatches}
          </span>
        )}
        {status === "generating_images" && totalPhotos > 0 && (
          <span className="text-gray-500 tabular-nums">
            {completedPhotos} of {totalPhotos} photos
          </span>
        )}
      </div>

      {/* Friendly description of what's happening */}
      {currentStep && (
        <div className="bg-blue-50 rounded-lg px-4 py-3 mb-3">
          <p className="text-sm text-blue-700">
            {currentStep.info.description}
          </p>
        </div>
      )}

      {/* Rotating tips */}
      <div className="border-t border-gray-100 pt-3 min-h-[2.5rem]">
        <p
          key={tipIndex}
          className="text-xs text-gray-400 italic animate-fade-in"
        >
          {TIPS[tipIndex]}
        </p>
      </div>
    </div>
  );
}
