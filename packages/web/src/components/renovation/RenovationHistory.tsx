import type { RenovationWithDetails } from "../../api/renovations";

const BASE_URL = import.meta.env.VITE_API_URL || "";

interface Props {
  renovations: RenovationWithDetails[];
  currentId: string;
}

export function RenovationHistory({ renovations, currentId }: Props) {
  const sorted = [...renovations].sort((a, b) => a.iteration - b.iteration);

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">
        Iteration History
      </h3>
      <div className="space-y-4">
        {sorted.map((ren) => (
          <div
            key={ren.id}
            className={`flex items-start gap-3 p-3 rounded-lg ${
              ren.id === currentId ? "bg-blue-50 border border-blue-200" : ""
            }`}
          >
            <div className="flex-shrink-0 w-16 h-16 rounded overflow-hidden bg-gray-100">
              {ren.storage_path && (
                <img
                  src={`${BASE_URL}/api/v1/renovations/${ren.id}/image`}
                  alt={`Iteration ${ren.iteration}`}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">
                  Iteration {ren.iteration}
                </span>
                {ren.id === currentId && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Current
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {new Date(ren.created_at).toLocaleString()}
              </p>
              {ren.feedback_context && (
                <p className="text-xs text-gray-600 mt-1 truncate">
                  Feedback: {ren.feedback_context}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
