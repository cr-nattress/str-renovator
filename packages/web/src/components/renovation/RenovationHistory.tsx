import type { RenovationWithDetails } from "../../api/renovations";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const BASE_URL = import.meta.env.VITE_API_URL || "";

interface Props {
  renovations: RenovationWithDetails[];
  currentId: string;
}

export function RenovationHistory({ renovations, currentId }: Props) {
  const sorted = [...renovations].sort((a, b) => a.iteration - b.iteration);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Iteration History</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sorted.map((ren) => (
          <div
            key={ren.id}
            className={`flex items-start gap-3 p-3 rounded-lg ${
              ren.id === currentId ? "bg-accent border border-primary/20" : ""
            }`}
          >
            <div className="flex-shrink-0 w-16 h-16 rounded overflow-hidden bg-muted">
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
                <span className="text-sm font-medium">
                  Iteration {ren.iteration}
                </span>
                {ren.id === currentId && (
                  <Badge variant="secondary">Current</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {new Date(ren.created_at).toLocaleString()}
              </p>
              {ren.feedback_context && (
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  Feedback: {ren.feedback_context}
                </p>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
