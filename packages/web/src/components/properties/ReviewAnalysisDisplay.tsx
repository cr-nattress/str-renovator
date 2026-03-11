import { Badge } from "@/components/ui/badge";
import { ConfidenceIndicator } from "@/components/ai/ConfidenceIndicator";
import { ReasoningExpander } from "@/components/ai/ReasoningExpander";
import { EditableText } from "@/components/ai/EditableText";
import { CollapsibleSection } from "./CollapsibleSection";
import { renderList } from "./shared-renderers";

interface Props {
  data: Record<string, unknown>;
  onFieldUpdate?: (fieldPath: string, value: string) => Promise<void>;
  isSaving?: boolean;
}

const SENTIMENT_STYLE: Record<string, string> = {
  positive: "bg-green-100 text-green-700 border-green-200",
  mixed: "bg-yellow-100 text-yellow-700 border-yellow-200",
  negative: "bg-red-100 text-red-700 border-red-200",
};

function renderQuotes(quotes: unknown[]): React.ReactNode {
  return (
    <div className="space-y-2">
      {quotes.map((quote, i) => (
        <blockquote
          key={i}
          className="border-l-2 border-gray-300 pl-3 text-sm text-gray-600 italic"
        >
          "{String(quote)}"
        </blockquote>
      ))}
    </div>
  );
}

export function ReviewAnalysisDisplay({ data, onFieldUpdate, isSaving }: Props) {
  const summary = data.review_summary as string | undefined;
  const sentiment = data.overall_sentiment as string | undefined;
  const totalReviews = data.total_reviews_analyzed as number | undefined;
  const strengths = data.strengths as string[] | undefined;
  const concerns = data.concerns as string[] | undefined;
  const quotes = data.memorable_quotes as string[] | undefined;
  const improvements = data.improvement_opportunities as string[] | undefined;
  const themes = data.themes as string[] | undefined;
  const confidence = data.confidence as number | undefined;
  const reasoning = data.reasoning as string | undefined;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Guest Review Analysis</h3>
        {sentiment && (
          <Badge variant="outline" className={SENTIMENT_STYLE[sentiment] ?? ""}>
            {sentiment}
          </Badge>
        )}
        {confidence != null && (
          <ConfidenceIndicator confidence={confidence} />
        )}
        {totalReviews != null && totalReviews > 0 && (
          <span className="text-xs text-gray-500">
            ~{totalReviews} reviews analyzed
          </span>
        )}
      </div>

      {summary && (
        onFieldUpdate ? (
          <div className="mb-4">
            <EditableText
              value={summary}
              onSave={(newValue) => onFieldUpdate("review_summary", newValue)}
              isSaving={isSaving}
            />
          </div>
        ) : (
          <p className="text-sm text-gray-700 mb-4 leading-relaxed">{summary}</p>
        )
      )}

      {reasoning && (
        <ReasoningExpander reasoning={reasoning} />
      )}

      <div className="space-y-1">
        {strengths && strengths.length > 0 && (
          <CollapsibleSection title="Strengths" defaultOpen>
            {renderList(strengths)}
          </CollapsibleSection>
        )}

        {concerns && concerns.length > 0 && (
          <CollapsibleSection title="Concerns" defaultOpen>
            {renderList(concerns)}
          </CollapsibleSection>
        )}

        {quotes && quotes.length > 0 && (
          <CollapsibleSection title="Memorable Quotes">
            {renderQuotes(quotes)}
          </CollapsibleSection>
        )}

        {improvements && improvements.length > 0 && (
          <CollapsibleSection title="Improvement Opportunities">
            {renderList(improvements)}
          </CollapsibleSection>
        )}

        {themes && themes.length > 0 && (
          <CollapsibleSection title="Themes">
            <div className="flex flex-wrap gap-1.5">
              {themes.map((theme, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {theme}
                </Badge>
              ))}
            </div>
          </CollapsibleSection>
        )}
      </div>
    </div>
  );
}
