import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfidenceIndicator } from "@/components/ai/ConfidenceIndicator";
import { ReasoningExpander } from "@/components/ai/ReasoningExpander";
import { EditableText } from "@/components/ai/EditableText";
import { CollapsibleSection } from "./CollapsibleSection";
import { formatKey, renderList } from "./shared-renderers";
import { RefreshCw } from "lucide-react";

interface Props {
  profile: Record<string, unknown>;
  onRefresh: () => void;
  isRefreshing?: boolean;
  onFieldUpdate?: (fieldPath: string, value: string) => Promise<void>;
  isSaving?: boolean;
}

function renderSection(
  key: string,
  value: unknown,
  onFieldUpdate?: (fieldPath: string, value: string) => Promise<void>,
  isSaving?: boolean,
): React.ReactNode {
  if (Array.isArray(value)) {
    return renderList(value);
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
  return <p className="text-sm text-gray-700">{JSON.stringify(value)}</p>;
}

export function LocationProfileDisplay({ profile, onRefresh, isRefreshing, onFieldUpdate, isSaving }: Props) {
  const areaType = profile.area_type as string | undefined;
  const areaBio = profile.area_bio as string | undefined;
  const confidence = profile.confidence as number | undefined;
  const reasoning = profile.reasoning as string | undefined;

  const skipKeys = new Set(["area_type", "area_bio", "confidence", "reasoning"]);
  const otherSections = Object.entries(profile).filter(
    ([key, value]) => !skipKeys.has(key) && value != null && value !== ""
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900">Location Profile</h3>
          {areaType && (
            <Badge variant="secondary">{areaType}</Badge>
          )}
          {confidence != null && (
            <ConfidenceIndicator confidence={confidence} />
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-1.5 ${isRefreshing ? "animate-spin" : ""}`} />
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {areaBio && (
        onFieldUpdate ? (
          <div className="mb-4">
            <EditableText
              value={areaBio}
              onSave={(newValue) => onFieldUpdate("area_bio", newValue)}
              isSaving={isSaving}
            />
          </div>
        ) : (
          <p className="text-sm text-gray-700 mb-4 leading-relaxed whitespace-pre-line">
            {areaBio}
          </p>
        )
      )}

      {reasoning && (
        <ReasoningExpander reasoning={reasoning} />
      )}

      {otherSections.length > 0 && (
        <div className="space-y-1">
          {otherSections.map(([key, value]) => (
            <CollapsibleSection key={key} title={formatKey(key)}>
              {renderSection(key, value, onFieldUpdate, isSaving)}
            </CollapsibleSection>
          ))}
        </div>
      )}
    </div>
  );
}
