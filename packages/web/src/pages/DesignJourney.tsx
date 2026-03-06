import { useParams, Link } from "react-router-dom";
import {
  useJourneyItems,
  useJourneySummary,
  useUpdateJourneyItem,
} from "../api/journey";
import { BudgetTracker } from "../components/design-journey/BudgetTracker";
import { ActionItemCard } from "../components/design-journey/ActionItemCard";
import type { JourneyStatus, UpdateJourneyItemDto } from "@str-renovator/shared";

const SECTIONS: { status: JourneyStatus; label: string }[] = [
  { status: "not_started", label: "Not Started" },
  { status: "in_progress", label: "In Progress" },
  { status: "completed", label: "Completed" },
  { status: "skipped", label: "Skipped" },
];

export function DesignJourney() {
  const { id } = useParams<{ id: string }>();
  const { data: items, isLoading } = useJourneyItems(id!);
  const { data: summary } = useJourneySummary(id!);
  const updateItem = useUpdateJourneyItem(id!);

  const handleUpdate = (itemId: string, data: UpdateJourneyItemDto) => {
    updateItem.mutate({ id: itemId, data });
  };

  if (isLoading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  return (
    <div>
      <Link
        to={`/properties/${id}`}
        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
      >
        &larr; Back to Property
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mt-3 mb-6">
        Design Journey
      </h1>

      {summary && (
        <div className="mb-6">
          <BudgetTracker
            totalEstimated={summary.totalEstimated}
            totalActual={summary.totalActual}
          />
        </div>
      )}

      {!items || items.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No journey items yet.</p>
          <p className="text-sm text-gray-400 mt-1">
            Run an analysis and add action plan items to your design journey.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {SECTIONS.map((section) => {
            const sectionItems = items.filter(
              (i) => i.status === section.status,
            );
            if (sectionItems.length === 0) return null;

            return (
              <div key={section.status}>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">
                  {section.label}{" "}
                  <span className="text-sm font-normal text-gray-400">
                    ({sectionItems.length})
                  </span>
                </h2>
                <div className="space-y-3">
                  {sectionItems
                    .sort((a, b) => a.priority - b.priority)
                    .map((item) => (
                      <ActionItemCard
                        key={item.id}
                        item={item}
                        onUpdate={handleUpdate}
                        isSaving={updateItem.isPending}
                      />
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
