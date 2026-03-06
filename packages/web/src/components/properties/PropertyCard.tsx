import { useNavigate } from "react-router-dom";
import type { DbProperty } from "@str-renovator/shared";

interface Props {
  property: DbProperty;
  photoCount?: number;
  lastAnalysis?: string | null;
}

export function PropertyCard({ property, photoCount, lastAnalysis }: Props) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/properties/${property.id}`)}
      className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow duration-150"
    >
      <h3 className="text-lg font-semibold text-gray-900 truncate">
        {property.name}
      </h3>
      {property.description && (
        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
          {property.description}
        </p>
      )}
      <div className="mt-4 flex items-center gap-3">
        {photoCount !== undefined && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {photoCount} photos
          </span>
        )}
        {lastAnalysis && (
          <span className="text-xs text-gray-400">
            Last analysis:{" "}
            {new Date(lastAnalysis).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
}
