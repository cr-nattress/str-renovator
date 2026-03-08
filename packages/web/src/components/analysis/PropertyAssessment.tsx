import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ConfidenceIndicator } from "../ai/ConfidenceIndicator";
import { ReasoningExpander } from "../ai/ReasoningExpander";

interface Props {
  assessment: string;
  styleDirection: string;
  confidence?: number;
  reasoning?: string;
}

export function PropertyAssessment({ assessment, styleDirection, confidence, reasoning }: Props) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg">Property Assessment</CardTitle>
          {confidence != null && (
            <ConfidenceIndicator confidence={confidence} />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">
          {assessment}
        </p>

        {reasoning && <ReasoningExpander reasoning={reasoning} />}

        {styleDirection && (
          <>
            <h4 className="text-sm font-semibold mt-4 mb-2">
              Style Direction
            </h4>
            <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">
              {styleDirection}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
