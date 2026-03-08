import { Link } from "react-router-dom";
import type { ActionItem, Priority } from "@str-renovator/shared";
import type { JourneyItemWithImage } from "../../api/journey";

const IMPACT_STYLES: Record<Priority, string> = {
  high: "bg-red-100 text-red-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-green-100 text-green-800",
};

interface Props {
  actionPlan: ActionItem[];
  journeyItems?: JourneyItemWithImage[];
}

function findMatchingImage(
  item: ActionItem,
  journeyItems?: JourneyItemWithImage[]
): string | null {
  if (!journeyItems) return null;
  const match = journeyItems.find(
    (ji) => ji.priority === item.priority && ji.title === item.item
  );
  return match?.image_url ?? null;
}

export function ActionPlanTable({ actionPlan, journeyItems }: Props) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Action Plan</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                #
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                Preview
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                Item
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                Est. Cost
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                Impact
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                Rooms
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {actionPlan.map((item) => {
              const imageUrl = findMatchingImage(item, journeyItems);
              const matchingItem = journeyItems?.find(
                (ji) => ji.priority === item.priority && ji.title === item.item
              );
              const imageStatus = matchingItem?.image_status;

              return (
                <tr key={item.priority} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-500 font-medium">
                    {item.priority}
                  </td>
                  <td className="px-6 py-4">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={item.item}
                        className="w-12 h-12 rounded object-cover"
                      />
                    ) : imageStatus === "pending" || imageStatus === "processing" ? (
                      <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-gray-400 animate-spin"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      </div>
                    ) : imageStatus === "failed" ? (
                      <div className="w-12 h-12 rounded bg-red-50 flex items-center justify-center" title={`${item.item} — image generation failed`}>
                        <svg className="w-5 h-5 text-red-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded bg-gray-50 flex items-center justify-center">
                        <svg className="w-5 h-5 text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                        </svg>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-900">
                    {matchingItem ? (
                      <Link to={`/journey/${matchingItem.id}`} className="hover:text-blue-600 transition-colors">
                        {item.item}
                      </Link>
                    ) : (
                      item.item
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {item.estimated_cost}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${IMPACT_STYLES[item.impact]}`}
                    >
                      {item.impact}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {item.rooms_affected.map((room, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600"
                        >
                          {room}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
