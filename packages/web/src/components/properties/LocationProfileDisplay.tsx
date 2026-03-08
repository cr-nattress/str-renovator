interface Props {
  profile: Record<string, unknown>;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

const AREA_TYPE_COLORS: Record<string, string> = {
  urban: "bg-gray-700 text-white",
  suburban: "bg-green-600 text-white",
  rural: "bg-amber-600 text-white",
  beach: "bg-cyan-500 text-white",
  mountain: "bg-emerald-700 text-white",
  lake: "bg-blue-500 text-white",
  desert: "bg-orange-500 text-white",
  ski: "bg-sky-600 text-white",
  island: "bg-teal-500 text-white",
};

function formatKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function renderSection(value: unknown): React.ReactNode {
  if (Array.isArray(value)) {
    return (
      <ul className="list-disc list-inside space-y-1">
        {value.map((item, i) => (
          <li key={i} className="text-sm text-gray-700">{String(item)}</li>
        ))}
      </ul>
    );
  }
  if (typeof value === "string") {
    return <p className="text-sm text-gray-700 whitespace-pre-line">{value}</p>;
  }
  return <p className="text-sm text-gray-700">{JSON.stringify(value)}</p>;
}

export function LocationProfileDisplay({ profile, onRefresh, isRefreshing }: Props) {
  const areaType = profile.area_type as string | undefined;
  const areaBio = profile.area_bio as string | undefined;

  const skipKeys = new Set(["area_type", "area_bio"]);
  const otherSections = Object.entries(profile).filter(
    ([key, value]) => !skipKeys.has(key) && value != null && value !== ""
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900">Location Profile</h3>
          {areaType && (
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                AREA_TYPE_COLORS[areaType] ?? "bg-gray-200 text-gray-800"
              }`}
            >
              {areaType}
            </span>
          )}
        </div>
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
        >
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {areaBio && (
        <p className="text-sm text-gray-700 mb-5 leading-relaxed whitespace-pre-line">
          {areaBio}
        </p>
      )}

      <div className="space-y-4">
        {otherSections.map(([key, value]) => (
          <div key={key} className="border-t border-gray-100 pt-3">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              {formatKey(key)}
            </h4>
            {renderSection(value)}
          </div>
        ))}
      </div>
    </div>
  );
}
