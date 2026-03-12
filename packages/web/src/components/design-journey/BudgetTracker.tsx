import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface Props {
  totalEstimatedMin: number;
  totalEstimatedMax: number;
  totalActual: number;
}

export function BudgetTracker({ totalEstimatedMin, totalEstimatedMax, totalActual }: Props) {
  const midpoint = (totalEstimatedMin + totalEstimatedMax) / 2;
  const max = Math.max(totalEstimatedMax, totalActual, 1);
  const estMinPct = (totalEstimatedMin / max) * 100;
  const estMaxPct = (totalEstimatedMax / max) * 100;
  const actPct = (totalActual / max) * 100;
  const hasRange = totalEstimatedMin !== totalEstimatedMax;

  const fmt = (val: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(val);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Budget</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Estimated</span>
            <span className="font-medium">
              {hasRange ? `${fmt(totalEstimatedMin)} – ${fmt(totalEstimatedMax)}` : fmt(totalEstimatedMin)}
            </span>
          </div>
          <div className="relative w-full bg-secondary rounded-full h-2.5">
            {hasRange ? (
              <>
                <div
                  className="absolute bg-primary/30 h-2.5 rounded-full transition-all duration-500"
                  style={{ left: `${estMinPct}%`, width: `${estMaxPct - estMinPct}%` }}
                />
                <div
                  className="bg-primary h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${estMinPct}%` }}
                />
              </>
            ) : (
              <div
                className="bg-primary h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${estMaxPct}%` }}
              />
            )}
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Actual</span>
            <span className="font-medium">
              {fmt(totalActual)}
            </span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ${
                totalActual > midpoint ? "bg-destructive" : "bg-green-500"
              }`}
              style={{ width: `${actPct}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
