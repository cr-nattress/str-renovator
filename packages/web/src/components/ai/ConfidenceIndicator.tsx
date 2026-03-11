interface Props {
  confidence: number;
  className?: string;
}

/**
 * Displays a confidence level as a colored badge.
 * Maps 0.0-1.0 to Low/Medium/High with corresponding colors.
 * High-confidence items pulse to feel alive.
 */
export function ConfidenceIndicator({ confidence, className = "" }: Props) {
  const pct = Math.round(confidence * 100);
  let label: string;
  let colorClass: string;
  let dotColor: string;

  if (confidence >= 0.8) {
    label = "High confidence";
    colorClass = "bg-green-100 text-green-800";
    dotColor = "bg-green-500";
  } else if (confidence >= 0.5) {
    label = "Medium confidence";
    colorClass = "bg-yellow-100 text-yellow-800";
    dotColor = "bg-yellow-500";
  } else {
    label = "Low confidence";
    colorClass = "bg-red-100 text-red-800";
    dotColor = "bg-red-500";
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${colorClass} ${className}`}
      title={`${pct}% confidence`}
    >
      {confidence >= 0.8 ? (
        <span className="relative flex h-1.5 w-1.5">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full ${dotColor} opacity-75`}
          />
          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${dotColor}`} />
        </span>
      ) : (
        <span
          className={`inline-block w-1.5 h-1.5 rounded-full ${dotColor}`}
          style={{ opacity: confidence }}
          aria-hidden="true"
        />
      )}
      {label} ({pct}%)
    </span>
  );
}
