import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface Props {
  reasoning: string;
}

/**
 * Expandable panel showing the AI's reasoning behind a recommendation.
 * Provides transparency into why the AI made specific decisions.
 */
export function ReasoningExpander({ reasoning }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-3 border border-dashed border-muted-foreground/30 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
      >
        <span className="text-[10px]">&#10022;</span>
        {expanded ? "Hide AI reasoning" : "See why the AI recommended this"}
        <ChevronDown
          className={`w-3 h-3 ml-auto transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
        />
      </button>
      <div
        className={`grid transition-all duration-200 ease-out ${expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden">
          <p className="px-3 pb-3 text-xs text-muted-foreground leading-relaxed">
            {reasoning}
          </p>
        </div>
      </div>
    </div>
  );
}
