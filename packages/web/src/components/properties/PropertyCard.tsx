import { useNavigate } from "react-router-dom";
import type { DbProperty } from "@str-renovator/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Props {
  property: DbProperty;
  photoCount?: number;
  lastAnalysis?: string | null;
}

export function PropertyCard({ property, photoCount, lastAnalysis }: Props) {
  const navigate = useNavigate();

  return (
    <Card
      onClick={() => navigate(`/properties/${property.id}`)}
      className="cursor-pointer hover:shadow-md transition-shadow duration-150"
    >
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-foreground truncate">
          {property.name}
        </h3>
        {property.description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {property.description}
          </p>
        )}
        <div className="mt-4 flex items-center gap-3">
          {photoCount !== undefined && (
            <Badge variant="secondary">
              {photoCount} photos
            </Badge>
          )}
          {lastAnalysis && (
            <span className="text-xs text-muted-foreground">
              Last analysis:{" "}
              {new Date(lastAnalysis).toLocaleDateString()}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
