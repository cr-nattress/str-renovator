interface Props {
  data: Record<string, unknown>;
}

const SECTION_GROUPS: Record<string, string[]> = {
  "Basic Info": ["title", "description", "property_type", "bedrooms", "bathrooms", "beds", "max_guests", "nightly_rate", "rating", "review_count"],
  "Amenities": ["amenities"],
  "Rules & Policies": ["house_rules", "check_in_time", "check_out_time"],
  "Host": ["host_name", "superhost"],
  "Location": ["neighborhood", "address_line1", "address_line2", "city", "state", "zip_code", "country"],
};

function formatKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function renderValue(value: unknown): React.ReactNode {
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
  return <span className="text-sm text-gray-700">{String(value)}</span>;
}

export function ScrapedDataDisplay({ data }: Props) {
  const assignedKeys = new Set(Object.values(SECTION_GROUPS).flat());
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
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Listing Data</h3>
      <div className="space-y-5">
        {sections.map((section) => (
          <div key={section.title}>
            <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
              {section.title}
            </h4>
            <div className="space-y-2">
              {section.entries.map(({ key, value }) => (
                <div key={key} className="flex flex-col sm:flex-row sm:gap-3">
                  <span className="text-sm font-medium text-gray-600 sm:w-40 shrink-0">
                    {formatKey(key)}
                  </span>
                  <div className="flex-1">{renderValue(value)}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
