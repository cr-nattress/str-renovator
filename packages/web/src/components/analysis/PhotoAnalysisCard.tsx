import { useNavigate } from "react-router-dom";
import type { DbAnalysisPhoto, DbPhoto, Priority } from "@str-renovator/shared";

const BASE_URL = import.meta.env.VITE_API_URL || "";

const PRIORITY_STYLES: Record<Priority, string> = {
  high: "bg-red-100 text-red-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-green-100 text-green-800",
};

interface Props {
  analysisPhoto: DbAnalysisPhoto & { photo: DbPhoto };
}

export function PhotoAnalysisCard({ analysisPhoto }: Props) {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="aspect-video relative">
        <img
          src={`${BASE_URL}/api/v1/photos/${analysisPhoto.photo.id}/file`}
          alt={analysisPhoto.room}
          className="w-full h-full object-cover"
        />
        <span
          className={`absolute top-2 right-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${PRIORITY_STYLES[analysisPhoto.priority]}`}
        >
          {analysisPhoto.priority}
        </span>
      </div>

      <div className="p-4">
        <h4 className="font-semibold text-gray-900">{analysisPhoto.room}</h4>

        <div className="mt-2 flex flex-wrap gap-1">
          {analysisPhoto.strengths.map((s, i) => (
            <span
              key={i}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700"
            >
              {s}
            </span>
          ))}
        </div>

        <p className="mt-2 text-sm text-gray-600 line-clamp-3">
          {analysisPhoto.renovations}
        </p>

        <button
          onClick={() =>
            navigate(
              `/analysis-photos/${analysisPhoto.id}/renovations`,
            )
          }
          className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors duration-150"
        >
          View Renovation &rarr;
        </button>
      </div>
    </div>
  );
}
