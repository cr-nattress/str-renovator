import { useState } from "react";
import type {
  DbDesignJourneyItem,
  JourneyStatus,
  Priority,
  UpdateJourneyItemDto,
} from "@str-renovator/shared";

const IMPACT_STYLES: Record<Priority, string> = {
  high: "bg-red-100 text-red-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-green-100 text-green-800",
};

const STATUS_OPTIONS: { value: JourneyStatus; label: string }[] = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "skipped", label: "Skipped" },
];

interface Props {
  item: DbDesignJourneyItem;
  onUpdate: (id: string, data: UpdateJourneyItemDto) => void;
  isSaving?: boolean;
}

export function ActionItemCard({ item, onUpdate, isSaving }: Props) {
  const [status, setStatus] = useState<JourneyStatus>(item.status);
  const [actualCost, setActualCost] = useState(
    item.actual_cost?.toString() ?? "",
  );
  const [notes, setNotes] = useState(item.notes ?? "");
  const [dirty, setDirty] = useState(false);

  const handleSave = () => {
    onUpdate(item.id, {
      status,
      actual_cost: actualCost ? Number(actualCost) : undefined,
      notes: notes || undefined,
    });
    setDirty(false);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
          {item.priority}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold text-gray-900">{item.title}</h4>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${IMPACT_STYLES[item.impact]}`}
            >
              {item.impact} impact
            </span>
          </div>

          {item.description && (
            <p className="text-sm text-gray-600 mt-1">{item.description}</p>
          )}

          <div className="flex flex-wrap gap-1 mt-2">
            {item.rooms_affected.map((room, i) => (
              <span
                key={i}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600"
              >
                {room}
              </span>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as JourneyStatus);
                  setDirty(true);
                }}
                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Est. Cost
              </label>
              <p className="text-sm text-gray-700 py-1.5">
                {item.estimated_cost || "N/A"}
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Actual Cost ($)
              </label>
              <input
                type="number"
                value={actualCost}
                onChange={(e) => {
                  setActualCost(e.target.value);
                  setDirty(true);
                }}
                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0"
              />
            </div>
          </div>

          <div className="mt-3">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setDirty(true);
              }}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Add notes..."
            />
          </div>

          {dirty && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150 disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
