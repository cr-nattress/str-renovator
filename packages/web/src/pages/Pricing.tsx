import { TIER_LIMITS } from "@str-renovator/shared";
import type { Tier } from "@str-renovator/shared";

const TIERS: { key: Tier; name: string; price: string }[] = [
  { key: "free", name: "Free", price: "$0" },
  { key: "pro", name: "Pro", price: "$29/mo" },
  { key: "business", name: "Business", price: "$99/mo" },
];

function formatLimit(value: number): string {
  return value === Infinity ? "Unlimited" : value.toString();
}

const ROWS: { label: string; getValue: (tier: Tier) => string }[] = [
  {
    label: "Properties",
    getValue: (t) => formatLimit(TIER_LIMITS[t].properties),
  },
  {
    label: "Photos per Property",
    getValue: (t) => formatLimit(TIER_LIMITS[t].photosPerProperty),
  },
  {
    label: "Analyses per Month",
    getValue: (t) => formatLimit(TIER_LIMITS[t].analysesPerMonth),
  },
  {
    label: "Re-runs per Photo",
    getValue: (t) => formatLimit(TIER_LIMITS[t].rerunsPerPhoto),
  },
  {
    label: "Image Quality",
    getValue: (t) => {
      const q = TIER_LIMITS[t].imageQuality;
      return q.charAt(0).toUpperCase() + q.slice(1);
    },
  },
  {
    label: "URL Scraping",
    getValue: (t) => (TIER_LIMITS[t].urlScraping ? "Yes" : "No"),
  },
];

export function Pricing() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900">Pricing Plans</h1>
        <p className="text-gray-500 mt-2">
          Choose the plan that fits your portfolio.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {TIERS.map((tier) => (
          <div
            key={tier.key}
            className={`bg-white rounded-xl border shadow-sm p-6 flex flex-col ${
              tier.key === "pro"
                ? "border-blue-600 ring-2 ring-blue-600"
                : "border-gray-200"
            }`}
          >
            {tier.key === "pro" && (
              <span className="inline-flex self-start items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mb-3">
                Most Popular
              </span>
            )}
            <h2 className="text-xl font-bold text-gray-900">{tier.name}</h2>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {tier.price}
            </p>

            <ul className="mt-6 space-y-3 flex-1">
              {ROWS.map((row) => (
                <li
                  key={row.label}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-gray-600">{row.label}</span>
                  <span className="font-medium text-gray-900">
                    {row.getValue(tier.key)}
                  </span>
                </li>
              ))}
            </ul>

            <button
              className={`mt-6 w-full px-4 py-2 rounded-lg font-medium transition-colors duration-150 ${
                tier.key === "free"
                  ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {tier.key === "free" ? "Current Plan" : "Upgrade"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
