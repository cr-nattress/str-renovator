import type { ActionItem, Priority } from "@str-renovator/shared";

const IMPACT_STYLES: Record<Priority, string> = {
  high: "bg-red-100 text-red-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-green-100 text-green-800",
};

interface Props {
  actionPlan: ActionItem[];
}

export function ActionPlanTable({ actionPlan }: Props) {
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
            {actionPlan.map((item) => (
              <tr key={item.priority} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-gray-500 font-medium">
                  {item.priority}
                </td>
                <td className="px-6 py-4 text-gray-900">{item.item}</td>
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
