import { useState } from "react";
import type { FeedbackRating } from "@str-renovator/shared";

interface Props {
  onSubmit: (rating: FeedbackRating, comment?: string) => void;
  isLoading?: boolean;
  isSubmitted?: boolean;
}

export function RenovationFeedback({
  onSubmit,
  isLoading,
  isSubmitted,
}: Props) {
  const [rating, setRating] = useState<FeedbackRating | null>(null);
  const [comment, setComment] = useState("");

  if (isSubmitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-700">
        Thank you for your feedback!
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          onClick={() => setRating("like")}
          className={`px-4 py-2 rounded-lg text-lg transition-colors duration-150 ${
            rating === "like"
              ? "bg-green-100 border-2 border-green-500"
              : "bg-gray-100 border-2 border-transparent hover:bg-gray-200"
          }`}
        >
          {"\uD83D\uDC4D"}
        </button>
        <button
          onClick={() => setRating("dislike")}
          className={`px-4 py-2 rounded-lg text-lg transition-colors duration-150 ${
            rating === "dislike"
              ? "bg-red-100 border-2 border-red-500"
              : "bg-gray-100 border-2 border-transparent hover:bg-gray-200"
          }`}
        >
          {"\uD83D\uDC4E"}
        </button>
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        placeholder="Optional: add details about what you liked or would change..."
      />

      <button
        onClick={() => {
          if (rating) onSubmit(rating, comment || undefined);
        }}
        disabled={!rating || isLoading}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? "Submitting..." : "Submit Feedback"}
      </button>
    </div>
  );
}
