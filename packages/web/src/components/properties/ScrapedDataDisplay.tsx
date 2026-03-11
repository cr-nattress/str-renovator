import { ConfidenceIndicator } from "@/components/ai/ConfidenceIndicator";
import { ReasoningExpander } from "@/components/ai/ReasoningExpander";
import { EditableText } from "@/components/ai/EditableText";
import { CollapsibleSection } from "./CollapsibleSection";
import { formatKey } from "./shared-renderers";

interface Props {
  data: Record<string, unknown>;
  onFieldUpdate?: (fieldPath: string, value: string) => Promise<void>;
  isSaving?: boolean;
}

const SECTION_GROUPS: Record<string, string[]> = {
  "Basic Info": ["title", "description", "property_type", "bedrooms", "bathrooms", "beds", "max_guests", "nightly_rate", "rating", "review_count"],
  "Amenities": ["amenities"],
  "Rules & Policies": ["house_rules", "check_in_time", "check_out_time"],
  "Host": ["host_name", "superhost"],
  "Location": ["neighborhood", "address_line1", "address_line2", "city", "state", "zip_code", "country"],
};

function renderValue(
  key: string,
  value: unknown,
  onFieldUpdate?: (fieldPath: string, value: string) => Promise<void>,
  isSaving?: boolean,
): React.ReactNode {
  if (Array.isArray(value)) {
    return (
      <ul className="list-disc list-inside space-y-0.5">
        {value.map((item, i) => (
          <li key={i} className="text-sm text-gray-700">{String(item)}</li>
        ))}
      </ul>
    );
  }
  if (typeof value === "boolean") {
    return <span className="text-sm text-gray-700">{value ? "Yes" : "No"}</span>;
  }
  if (typeof value === "string" && onFieldUpdate) {
    return (
      <EditableText
        value={value}
        onSave={(newValue) => onFieldUpdate(key, newValue)}
        isSaving={isSaving}
      />
    );
  }
  return <span className="text-sm text-gray-700">{String(value)}</span>;
}

export function ScrapedDataDisplay({ data, onFieldUpdate, isSaving }: Props) {
  const confidence = data.confidence as number | undefined;
  const reasoning = data.reasoning as string | undefined;

  const metaKeys = new Set(["confidence", "reasoning"]);
  const assignedKeys = new Set([...Object.values(SECTION_GROUPS).flat(), ...metaKeys]);
  const otherKeys = Object.keys(data).filter(
    (k) => !assignedKeys.has(k) && data[k] != null && data[k] !== ""
  );

  const sections = Object.entries(SECTION_GROUPS)
    .map(([title, keys]) => ({
      title,
      entries: keys
        .filter((k) => data[k] != null && data[k] !== "")
        .map((k) => ({ key: k, value: data[k] })),
    }))
    .filter((s) => s.entries.length > 0);

  if (otherKeys.length > 0) {
    sections.push({
      title: "Other",
      entries: otherKeys.map((k) => ({ key: k, value: data[k] })),
    });
  }

  if (sections.length === 0) return null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Listing Data</h3>
        {confidence != null && (
          <ConfidenceIndicator confidence={confidence} />
        )}
      </div>

      {reasoning && (
        <ReasoningExpander reasoning={reasoning} />
      )}
      <div className="space-y-1">
        {sections.map((section) => (
          <CollapsibleSection
            key={section.title}
            title={section.title}
            defaultOpen={section.title === "Basic Info"}
          >
            <div className="space-y-2">
              {section.entries.map(({ key, value }) => (
                <div key={key} className="flex flex-col sm:flex-row sm:gap-3">
                  <span className="text-sm font-medium text-gray-600 sm:w-40 shrink-0">
                    {formatKey(key)}
                  </span>
                  <div className="flex-1">{renderValue(key, value, onFieldUpdate, isSaving)}</div>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        ))}
      </div>
    </div>
  );
}
