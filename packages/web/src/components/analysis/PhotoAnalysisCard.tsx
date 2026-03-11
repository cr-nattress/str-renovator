import { useNavigate } from "react-router-dom";
import type { DbAnalysisPhoto, DbPhoto } from "@str-renovator/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfidenceIndicator } from "../ai/ConfidenceIndicator";
import { ReasoningExpander } from "../ai/ReasoningExpander";
import { DownloadButton } from "@/components/ui/download-button";
import { PRIORITY_BADGE_VARIANT } from "../properties/shared-renderers";

interface Props {
  analysisPhoto: DbAnalysisPhoto & { photos: DbPhoto & { url?: string } };
  confidence?: number;
  reasoning?: string;
}

export function PhotoAnalysisCard({ analysisPhoto, confidence, reasoning }: Props) {
  const navigate = useNavigate();

  return (
    <Card className="overflow-hidden">
      <div className="aspect-video relative group bg-muted">
        {analysisPhoto.photos.url ? (
          <img
            src={analysisPhoto.photos.url}
            alt={analysisPhoto.room}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">
            No image available
          </div>
        )}
        <Badge
          variant={PRIORITY_BADGE_VARIANT[analysisPhoto.priority]}
          className="absolute top-2 right-2"
        >
          {analysisPhoto.priority}
        </Badge>
        {analysisPhoto.photos.url && (
          <DownloadButton
            url={analysisPhoto.photos.url}
            filename={`${analysisPhoto.room}.png`}
            className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
          />
        )}
      </div>

      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold">{analysisPhoto.room}</h4>
          {confidence != null && (
            <ConfidenceIndicator confidence={confidence} />
          )}
        </div>

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

        {reasoning && <ReasoningExpander reasoning={reasoning} />}

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
