import { Badge } from "@/components/ui/badge";
import { ConfidenceIndicator } from "@/components/ai/ConfidenceIndicator";
import { ReasoningExpander } from "@/components/ai/ReasoningExpander";
import { EditableText } from "@/components/ai/EditableText";
import { CollapsibleSection } from "./CollapsibleSection";
import { formatKey, renderList } from "./shared-renderers";

interface Props {
  profile: Record<string, unknown>;
  onFieldUpdate?: (fieldPath: string, value: string) => Promise<void>;
  isSaving?: boolean;
}

interface RenovationPriority {
  priority: string;
  rationale: string;
  estimated_impact: "high" | "medium" | "low";
}

const IMPACT_VARIANT: Record<string, string> = {
  high: "bg-red-100 text-red-700 border-red-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  low: "bg-green-100 text-green-700 border-green-200",
};

function renderRenovationPriorities(items: RenovationPriority[]): React.ReactNode {
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-gray-900">{item.priority}</span>
            <Badge
              variant="outline"
              className={IMPACT_VARIANT[item.estimated_impact] ?? ""}
            >
              {item.estimated_impact} impact
            </Badge>
          </div>
          <p className="text-sm text-gray-600">{item.rationale}</p>
        </div>
      ))}
    </div>
  );
}

function renderValue(
  key: string,
  value: unknown,
  onFieldUpdate?: (fieldPath: string, value: string) => Promise<void>,
  isSaving?: boolean,
): React.ReactNode {
  if (key === "renovation_priorities" && Array.isArray(value)) {
    return renderRenovationPriorities(value as RenovationPriority[]);
  }
  if (Array.isArray(value)) {
    return renderList(value);
  }
  if (typeof value === "object" && value !== null) {
    return (
      <div className="space-y-1">
        {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
          <div key={k} className="flex gap-2 text-sm">
            <span className="text-gray-500 min-w-[100px]">{formatKey(k)}:</span>
            <span className="text-gray-700">{String(v)}</span>
          </div>
        ))}
      </div>
    );
  }
  if (typeof value === "string") {
    if (onFieldUpdate) {
      return (
        <EditableText
          value={value}
          onSave={(newValue) => onFieldUpdate(key, newValue)}
          isSaving={isSaving}
        />
      );
    }
    return <p className="text-sm text-gray-700 whitespace-pre-line">{value}</p>;
  }
  return <p className="text-sm text-gray-700">{String(value)}</p>;
}

const SECTION_ORDER = [
  "property_summary",
  "guest_sentiment",
  "competitive_positioning",
  "target_guests",
  "key_selling_points",
  "review_highlights",
  "review_concerns",
  "amenity_highlights",
  "amenity_gaps",
  "renovation_priorities",
  "design_direction",
  "seasonal_insights",
  "host_insights",
];

const DEFAULT_OPEN_SECTIONS = new Set([
  "competitive_positioning",
  "target_guests",
  "key_selling_points",
  "review_highlights",
  "review_concerns",
]);

const SKIP_KEYS = new Set([
  "property_type", "capacity", "pricing", "reputation",
  "address", "area_type", "property_summary",
  "confidence", "reasoning",
]);

export function PropertyProfileDisplay({ profile, onFieldUpdate, isSaving }: Props) {
  const summary = profile.property_summary as string | undefined;
  const areaType = profile.area_type as string | undefined;
  const confidence = profile.confidence as number | undefined;
  const reasoning = profile.reasoning as string | undefined;

  const orderedSections = SECTION_ORDER
    .filter((key) => !SKIP_KEYS.has(key) && profile[key] != null && profile[key] !== "")
    .map((key) => [key, profile[key]] as [string, unknown]);

  const extraSections = Object.entries(profile)
    .filter(
      ([key, value]) =>
        !SKIP_KEYS.has(key) &&
        !SECTION_ORDER.includes(key) &&
        value != null &&
        value !== ""
    );

  const allSections = [...orderedSections, ...extraSections];

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Property Intelligence</h3>
        {areaType && (
          <Badge variant="secondary">{areaType}</Badge>
        )}
        {confidence != null && (
          <ConfidenceIndicator confidence={confidence} />
        )}
      </div>

      {summary && (
        onFieldUpdate ? (
          <div className="mb-4">
            <EditableText
              value={summary}
              onSave={(newValue) => onFieldUpdate("property_summary", newValue)}
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
        {allSections.map(([key, value]) => (
          <CollapsibleSection
            key={key}
            title={formatKey(key)}
            defaultOpen={DEFAULT_OPEN_SECTIONS.has(key)}
          >
            {renderValue(key, value, onFieldUpdate, isSaving)}
          </CollapsibleSection>
        ))}
      </div>
    </div>
  );
}
