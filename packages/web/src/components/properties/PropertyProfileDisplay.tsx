interface Props {
  profile: Record<string, unknown>;
}

interface RenovationPriority {
  priority: string;
  rationale: string;
  estimated_impact: "high" | "medium" | "low";
}

const IMPACT_STYLES: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-green-100 text-green-700",
};

function formatKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function renderList(items: unknown[]): React.ReactNode {
  return (
    <ul className="list-disc list-inside space-y-1">
      {items.map((item, i) => (
        <li key={i} className="text-sm text-gray-700">{String(item)}</li>
      ))}
    </ul>
  );
}

function renderRenovationPriorities(items: RenovationPriority[]): React.ReactNode {
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-gray-900">{item.priority}</span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                IMPACT_STYLES[item.estimated_impact] ?? "bg-gray-100 text-gray-600"
              }`}
            >
              {item.estimated_impact} impact
            </span>
          </div>
          <p className="text-sm text-gray-600">{item.rationale}</p>
        </div>
      ))}
    </div>
  );
}

function renderValue(key: string, value: unknown): React.ReactNode {
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
    return <p className="text-sm text-gray-700 whitespace-pre-line">{value}</p>;
  }
  return <p className="text-sm text-gray-700">{String(value)}</p>;
}

// Display order and grouping for the profile sections
const SECTION_ORDER = [
  "property_summary",
  "competitive_positioning",
  "target_guests",
  "key_selling_points",
  "amenity_highlights",
  "amenity_gaps",
  "renovation_priorities",
  "design_direction",
  "seasonal_insights",
  "host_insights",
];

const SKIP_KEYS = new Set([
  "property_type", "capacity", "pricing", "reputation",
  "address", "area_type",
]);

export function PropertyProfileDisplay({ profile }: Props) {
  const summary = profile.property_summary as string | undefined;
  const areaType = profile.area_type as string | undefined;
  const propertyType = profile.property_type as string | undefined;
  const capacity = profile.capacity as Record<string, unknown> | undefined;
  const pricing = profile.pricing as Record<string, unknown> | undefined;
  const reputation = profile.reputation as Record<string, unknown> | undefined;

  // Ordered sections first, then any extra keys
  const orderedSections = SECTION_ORDER
    .filter((key) => profile[key] != null && profile[key] !== "")
    .map((key) => [key, profile[key]] as [string, unknown]);

  const extraSections = Object.entries(profile)
    .filter(
      ([key, value]) =>
        !SKIP_KEYS.has(key) &&
        !SECTION_ORDER.includes(key) &&
        key !== "property_summary" &&
        value != null &&
        value !== ""
    );

  const allSections = [...orderedSections, ...extraSections];

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Property Intelligence</h3>
        {areaType && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            {areaType}
          </span>
        )}
        {propertyType && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            {propertyType}
          </span>
        )}
      </div>

      {/* Quick stats bar */}
      {(capacity || pricing || reputation) && (
        <div className="flex flex-wrap gap-4 mb-5 p-3 bg-gray-50 rounded-lg text-sm">
          {capacity && (
            <>
              {capacity.bedrooms != null && (
                <span className="text-gray-600">{String(capacity.bedrooms)} BR</span>
              )}
              {capacity.bathrooms != null && (
                <span className="text-gray-600">{String(capacity.bathrooms)} BA</span>
              )}
              {capacity.max_guests != null && (
                <span className="text-gray-600">{String(capacity.max_guests)} guests</span>
              )}
            </>
          )}
          {pricing?.nightly_rate != null && (
            <span className="text-gray-600 font-medium">${String(pricing.nightly_rate)}/night</span>
          )}
          {reputation?.rating != null && (
            <span className="text-gray-600">{String(reputation.rating)} rating</span>
          )}
          {reputation?.review_count != null && (
            <span className="text-gray-600">{String(reputation.review_count)} reviews</span>
          )}
        </div>
      )}

      {summary && (
        <p className="text-sm text-gray-700 mb-5 leading-relaxed">{summary}</p>
      )}

      <div className="space-y-4">
        {allSections.map(([key, value]) => (
          <div key={key} className="border-t border-gray-100 pt-3">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              {formatKey(key)}
            </h4>
            {renderValue(key, value)}
          </div>
        ))}
      </div>
    </div>
  );
}
