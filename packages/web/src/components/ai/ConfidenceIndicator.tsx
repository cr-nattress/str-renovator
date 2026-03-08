interface Props {
  confidence: number;
  className?: string;
}

/**
 * Displays a confidence level as a colored badge.
 * Maps 0.0–1.0 to Low/Medium/High with corresponding colors.
 */
export function ConfidenceIndicator({ confidence, className = "" }: Props) {
  const pct = Math.round(confidence * 100);
  let label: string;
  let colorClass: string;

  if (confidence >= 0.8) {
    label = "High confidence";
    colorClass = "bg-green-100 text-green-800";
  } else if (confidence >= 0.5) {
    label = "Medium confidence";
    colorClass = "bg-yellow-100 text-yellow-800";
  } else {
    label = "Low confidence";
    colorClass = "bg-red-100 text-red-800";
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colorClass} ${className}`}
      title={`${pct}% confidence`}
    >
      <span
        className="inline-block w-1.5 h-1.5 rounded-full"
        style={{ opacity: confidence }}
        aria-hidden="true"
      />
      {label} ({pct}%)
    </span>
  );
}
