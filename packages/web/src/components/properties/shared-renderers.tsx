import type { Priority } from "@str-renovator/shared";

/** Converts snake_case keys to Title Case labels */
export function formatKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Renders an array of items as a bulleted list */
export function renderList(items: unknown[]): React.ReactNode {
  return (
    <ul className="list-disc list-inside space-y-1">
      {items.map((item, i) => (
        <li key={i} className="text-sm text-gray-700">{String(item)}</li>
      ))}
    </ul>
  );
}

/** Maps priority/impact levels to badge variants — used by ActionPlanTable, PhotoAnalysisCard, ActionItemCard */
export const PRIORITY_BADGE_VARIANT: Record<Priority, "destructive" | "secondary" | "default"> = {
  high: "destructive",
  medium: "secondary",
  low: "default",
};
