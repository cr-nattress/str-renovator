import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import {
  useRenovations,
  useSubmitFeedback,
  useRerunRenovation,
} from "../api/renovations";
import { PhotoCompare } from "../components/photos/PhotoCompare";
import { RenovationFeedback } from "../components/renovation/RenovationFeedback";
import { RenovationHistory } from "../components/renovation/RenovationHistory";
import { RenovationViewSkeleton } from "../components/skeletons";
import type { FeedbackRating } from "@str-renovator/shared";

const BASE_URL = import.meta.env.VITE_API_URL || "";

export function RenovationView() {
  const { analysisPhotoId } = useParams<{ analysisPhotoId: string }>();
  const { data, isLoading } = useRenovations(analysisPhotoId!);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [rerunFeedback, setRerunFeedback] = useState("");

  const latestRenovationId = useMemo(() => {
    if (!data?.renovation_images?.length) return "";
    return data.renovation_images.reduce((a, b) =>
      a.iteration > b.iteration ? a : b,
    ).id;
  }, [data]);

  const submitFeedback = useSubmitFeedback(latestRenovationId);
  const rerunRenovation = useRerunRenovation(latestRenovationId);

  if (isLoading || !data) {
    return <RenovationViewSkeleton />;
  }

  const latestRenovation = data.renovation_images.length
    ? data.renovation_images.reduce((a, b) =>
        a.iteration > b.iteration ? a : b,
      )
    : null;

  const handleFeedback = (rating: FeedbackRating, comment?: string) => {
    submitFeedback.mutate(
      { rating, comment },
      { onSuccess: () => setFeedbackSubmitted(true) },
    );
  };

  return (
    <div>
      <Link
        to={`/analyses/${data.analysis_id}`}
        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
      >
        &larr; Back to Analysis
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mt-3 mb-2">
        {data.room} Renovation
      </h1>

      <div className="flex items-center gap-2 mb-6">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {data.priority} priority
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {latestRenovation?.storage_path && (
            <PhotoCompare
              beforeSrc={`${BASE_URL}/api/v1/photos/${data.photo.id}/file`}
              afterSrc={`${BASE_URL}/api/v1/renovations/${latestRenovation.id}/image`}
            />
          )}

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Suggested Renovations
            </h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {data.renovations}
            </p>

            {data.report && (
              <>
                <h3 className="text-sm font-semibold text-gray-900 mt-4 mb-2">
                  Detailed Report
                </h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {data.report}
                </p>
              </>
            )}
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Feedback
            </h3>
            <RenovationFeedback
              onSubmit={handleFeedback}
              isLoading={submitFeedback.isPending}
              isSubmitted={feedbackSubmitted}
            />
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Re-run with Feedback
            </h3>
            <textarea
              value={rerunFeedback}
              onChange={(e) => setRerunFeedback(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-3"
              placeholder="Describe what you'd like changed in the renovation..."
            />
            <button
              onClick={() =>
                rerunRenovation.mutate(rerunFeedback || undefined)
              }
              disabled={rerunRenovation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150 disabled:opacity-50"
            >
              {rerunRenovation.isPending
                ? "Re-running..."
                : "Re-run Renovation"}
            </button>
          </div>
        </div>

        <div>
          {data.renovation_images.length > 0 && (
            <RenovationHistory
              renovations={data.renovation_images}
              currentId={latestRenovation?.id ?? ""}
            />
          )}
        </div>
      </div>
    </div>
  );
}
