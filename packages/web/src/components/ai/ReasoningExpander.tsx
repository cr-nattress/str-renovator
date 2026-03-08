import { useState } from "react";

interface Props {
  reasoning: string;
}

/**
 * A "Why?" button that expands to show the AI's reasoning.
 * Provides transparency into why the AI made specific recommendations.
 */
export function ReasoningExpander({ reasoning }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline"
      >
        {expanded ? "Hide reasoning" : "Why?"}
      </button>
      {expanded && (
        <p className="mt-1.5 text-xs text-muted-foreground bg-muted/50 rounded-md p-2.5 leading-relaxed">
          {reasoning}
        </p>
      )}
    </div>
  );
}
