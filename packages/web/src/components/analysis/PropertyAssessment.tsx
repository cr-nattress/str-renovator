import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface Props {
  assessment: string;
  styleDirection: string;
}

export function PropertyAssessment({ assessment, styleDirection }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Property Assessment</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">
          {assessment}
        </p>

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
