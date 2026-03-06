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
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Budget</h3>

      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">Estimated</span>
            <span className="font-medium text-gray-900">
              {formatCurrency(totalEstimated)}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${estPct}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">Actual</span>
            <span className="font-medium text-gray-900">
              {formatCurrency(totalActual)}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ${
                totalActual > totalEstimated ? "bg-red-500" : "bg-green-500"
              }`}
              style={{ width: `${actPct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
