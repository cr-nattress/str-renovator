import { useState } from "react";
import type { FeedbackRating } from "@str-renovator/shared";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
      <Alert>
        <AlertDescription className="text-green-700">
          Thank you for your feedback!
        </AlertDescription>
      </Alert>
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
              : "bg-secondary border-2 border-transparent hover:bg-secondary/80"
          }`}
        >
          {"\uD83D\uDC4D"}
        </button>
        <button
          onClick={() => setRating("dislike")}
          className={`px-4 py-2 rounded-lg text-lg transition-colors duration-150 ${
            rating === "dislike"
              ? "bg-red-100 border-2 border-red-500"
              : "bg-secondary border-2 border-transparent hover:bg-secondary/80"
          }`}
        >
          {"\uD83D\uDC4E"}
        </button>
      </div>

      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        placeholder="Optional: add details about what you liked or would change..."
      />

      <Button
        onClick={() => {
          if (rating) onSubmit(rating, comment || undefined);
        }}
        disabled={!rating || isLoading}
      >
        {isLoading ? "Submitting..." : "Submit Feedback"}
      </Button>
    </div>
  );
}
