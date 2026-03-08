import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useJourneyItem, useUpdateJourneyItem } from "../api/journey";
import { PhotoCompare } from "../components/photos/PhotoCompare";
import type {
  JourneyStatus,
  Priority,
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

const COMING_SOON_SECTIONS = [
  {
    title: "Detailed Analysis & Rationale",
    description:
      "AI-powered deep dive into why this renovation was recommended, including ROI projections and market comparisons.",
  },
  {
    title: "Cost Breakdown",
    description:
      "Itemized cost estimates for materials, labor, and permits based on your local market.",
  },
  {
    title: "Materials & Shopping Links",
    description:
      "Curated materials list with links to purchase recommended products.",
  },
  {
    title: "How-To Videos",
    description:
      "Step-by-step video tutorials for DIY-friendly renovation tasks.",
  },
  {
    title: "Local Service Providers",
    description:
      "Vetted contractors and service providers in your area who specialize in this type of work.",
  },
];

export function JourneyItemDetail() {
  const { journeyItemId } = useParams<{ journeyItemId: string }>();
  const { data: item, isLoading } = useJourneyItem(journeyItemId!);

  const propertyId = item?.property_id ?? "";
  const updateItem = useUpdateJourneyItem(propertyId);

  const [status, setStatus] = useState<JourneyStatus | null>(null);
  const [actualCost, setActualCost] = useState<string | null>(null);
  const [notes, setNotes] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  // Initialize local state from item data when it loads
  const currentStatus = status ?? item?.status ?? "not_started";
  const currentActualCost =
    actualCost ?? (item?.actual_cost?.toString() ?? "");
  const currentNotes = notes ?? (item?.notes ?? "");

  const handleSave = () => {
    if (!item) return;
    updateItem.mutate(
      {
        id: item.id,
        data: {
          status: currentStatus,
          actual_cost: currentActualCost ? Number(currentActualCost) : undefined,
          notes: currentNotes || undefined,
        },
      },
      { onSuccess: () => setDirty(false) },
    );
  };

  if (isLoading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  if (!item) {
    return (
      <div className="text-center py-12 text-gray-500">
        Journey item not found.
      </div>
    );
  }

  const hasBeforePhoto = !!item.source_photo_url;
  const hasAfterImage =
    item.image_status === "completed" && !!item.image_url;
  const isGenerating =
    item.image_status === "pending" || item.image_status === "processing";
  const isFailed = item.image_status === "failed";
  const isSkipped = item.image_status === "skipped";

  return (
    <div>
      <Link
        to={`/properties/${item.property_id}/journey`}
        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
      >
        &larr; Back to Design Journey
      </Link>

      <div className="flex items-center gap-3 mt-3 mb-6">
        <span className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center text-lg font-bold">
          {item.priority}
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-bold text-gray-900">{item.title}</h1>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${IMPACT_STYLES[item.impact]}`}
          >
            {item.impact} impact
          </span>
        </div>
      </div>

      {item.rooms_affected.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-6">
          {item.rooms_affected.map((room, i) => (
            <span
              key={i}
              className="inline-flex items-center px-2.5 py-1 rounded text-xs bg-gray-100 text-gray-600"
            >
              {room}
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Photo compare hero */}
          {hasBeforePhoto && hasAfterImage ? (
            <PhotoCompare
              beforeSrc={item.source_photo_url!}
              afterSrc={item.image_url!}
              beforeLabel="Original"
              afterLabel="After Renovation"
            />
          ) : isGenerating ? (
            <div className="aspect-video w-full bg-gray-100 rounded-lg animate-pulse flex flex-col items-center justify-center gap-1">
              <span className="text-sm text-gray-400">
                Generating renovation image...
              </span>
              {item.updated_at && (
                <span className="text-xs text-gray-400">
                  Started {new Date(item.updated_at).toLocaleTimeString()}
                </span>
              )}
            </div>
          ) : isFailed ? (
            <div className="aspect-video w-full bg-red-50 rounded-lg border-2 border-dashed border-red-200 flex flex-col items-center justify-center gap-2">
              <svg className="w-8 h-8 text-red-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
              <span className="text-sm font-medium text-red-600">Image generation failed</span>
              <span className="text-xs text-red-400">Will be retried on next analysis</span>
            </div>
          ) : isSkipped ? (
            <div className="aspect-video w-full bg-amber-50 rounded-lg border-2 border-dashed border-amber-200 flex flex-col items-center justify-center gap-2">
              <svg className="w-8 h-8 text-amber-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
              </svg>
              <span className="text-sm font-medium text-amber-600">No source photo available</span>
              <span className="text-xs text-amber-400">Couldn't be matched to a room photo</span>
            </div>
          ) : hasAfterImage ? (
            <div className="aspect-video w-full rounded-lg overflow-hidden">
              <img
                src={item.image_url!}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="aspect-video w-full bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center">
              <span className="text-sm text-gray-400">
                No renovation image available
              </span>
            </div>
          )}

          {/* Description */}
          {item.description && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                Description
              </h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {item.description}
              </p>
            </div>
          )}

          {/* Coming soon placeholders */}
          {COMING_SOON_SECTIONS.map((section) => (
            <div
              key={section.title}
              className="bg-white rounded-lg border border-gray-200 shadow-sm p-6"
            >
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-sm font-semibold text-gray-900">
                  {section.title}
                </h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
                  Coming soon
                </span>
              </div>
              <p className="text-sm text-gray-500">{section.description}</p>
            </div>
          ))}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Summary card */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Summary
            </h3>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-gray-500">Priority</dt>
                <dd className="font-medium text-gray-900">{item.priority}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Impact</dt>
                <dd className="font-medium text-gray-900 capitalize">
                  {item.impact}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Estimated Cost</dt>
                <dd className="font-medium text-gray-900">
                  {item.estimated_cost || "N/A"}
                </dd>
              </div>
              {item.rooms_affected.length > 0 && (
                <div>
                  <dt className="text-gray-500">Rooms</dt>
                  <dd className="font-medium text-gray-900">
                    {item.rooms_affected.join(", ")}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Status & Tracking card */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Status & Tracking
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Status
                </label>
                <select
                  value={currentStatus}
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
                  Actual Cost ($)
                </label>
                <input
                  type="number"
                  value={currentActualCost}
                  onChange={(e) => {
                    setActualCost(e.target.value);
                    setDirty(true);
                  }}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Notes
                </label>
                <textarea
                  value={currentNotes}
                  onChange={(e) => {
                    setNotes(e.target.value);
                    setDirty(true);
                  }}
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Add notes..."
                />
              </div>

              {dirty && (
                <button
                  onClick={handleSave}
                  disabled={updateItem.isPending}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150 disabled:opacity-50"
                >
                  {updateItem.isPending ? "Saving..." : "Save Changes"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
