import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface Props {
  totalEstimated: number;
  totalActual: number;
}

export function BudgetTracker({ totalEstimated, totalActual }: Props) {
  const max = Math.max(totalEstimated, totalActual, 1);
  const estPct = (totalEstimated / max) * 100;
  const actPct = (totalActual / max) * 100;

  const formatCurrency = (val: number) =>
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
              {formatCurrency(totalEstimated)}
            </span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2.5">
            <div
              className="bg-primary h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${estPct}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Actual</span>
            <span className="font-medium">
              {formatCurrency(totalActual)}
            </span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ${
                totalActual > totalEstimated ? "bg-destructive" : "bg-green-500"
              }`}
              style={{ width: `${actPct}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
