import { useNavigate } from "react-router-dom";
import type { DbAnalysisPhoto, DbPhoto, Priority } from "@str-renovator/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const BASE_URL = import.meta.env.VITE_API_URL || "";

const PRIORITY_VARIANT: Record<Priority, "destructive" | "secondary" | "default"> = {
  high: "destructive",
  medium: "secondary",
  low: "default",
};

interface Props {
  analysisPhoto: DbAnalysisPhoto & { photos: DbPhoto & { url?: string } };
}

export function PhotoAnalysisCard({ analysisPhoto }: Props) {
  const navigate = useNavigate();

  return (
    <Card className="overflow-hidden">
      <div className="aspect-video relative">
        <img
          src={`${BASE_URL}/api/v1/photos/${analysisPhoto.photos.id}/file`}
          alt={analysisPhoto.room}
          className="w-full h-full object-cover"
        />
        <Badge
          variant={PRIORITY_VARIANT[analysisPhoto.priority]}
          className="absolute top-2 right-2"
        >
          {analysisPhoto.priority}
        </Badge>
      </div>

      <CardContent className="p-4">
        <h4 className="font-semibold">{analysisPhoto.room}</h4>

        <div className="mt-2 flex flex-wrap gap-1">
          {analysisPhoto.strengths.map((s, i) => (
            <Badge key={i} variant="outline" className="text-xs">
              {s}
            </Badge>
          ))}
        </div>

        <p className="mt-2 text-sm text-muted-foreground line-clamp-3">
          {analysisPhoto.renovations}
        </p>

        <Button
          variant="link"
          className="mt-3 p-0 h-auto"
          onClick={() =>
            navigate(
              `/analysis-photos/${analysisPhoto.id}/renovations`,
            )
          }
        >
          View Renovation &rarr;
        </Button>
      </CardContent>
    </Card>
  );
}
