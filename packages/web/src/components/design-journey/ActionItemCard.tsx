import { useState } from "react";
import { Link } from "react-router-dom";
import type {
  JourneyStatus,
  Priority,
  UpdateJourneyItemDto,
} from "@str-renovator/shared";
import type { JourneyItemWithImage } from "../../api/journey";

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
  item: JourneyItemWithImage;
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
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {item.image_status === "completed" && item.image_url && (
        <Link to={`/journey/${item.id}`} className="block aspect-video w-full overflow-hidden hover:opacity-90 transition-opacity">
          <img
            src={item.image_url}
            alt={item.title}
            className="w-full h-full object-cover"
          />
        </Link>
      )}
      {(item.image_status === "pending" || item.image_status === "processing") && (
        <div className="aspect-video w-full bg-gray-100 animate-pulse flex items-center justify-center">
          <span className="text-sm text-gray-400">Generating image...</span>
        </div>
      )}
      {item.image_status === "failed" && (
        <div className="aspect-video w-full bg-red-50 flex flex-col items-center justify-center gap-1">
          <svg className="w-6 h-6 text-red-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <span className="text-sm text-red-500">Image generation failed</span>
        </div>
      )}
      {item.image_status === "skipped" && (
        <div className="aspect-video w-full bg-gray-50 flex flex-col items-center justify-center gap-1">
          <svg className="w-6 h-6 text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
          </svg>
          <span className="text-sm text-gray-400">No source photo available</span>
        </div>
      )}
      <div className="p-4">
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
          {item.priority}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link to={`/journey/${item.id}`} className="font-semibold text-gray-900 hover:text-blue-600 transition-colors">
              {item.title}
            </Link>
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
    </div>
  );
}
