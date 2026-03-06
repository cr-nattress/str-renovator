interface Props {
  assessment: string;
  styleDirection: string;
}

export function PropertyAssessment({ assessment, styleDirection }: Props) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">
        Property Assessment
      </h3>
      <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
        {assessment}
      </p>

      {styleDirection && (
        <>
          <h4 className="text-sm font-semibold text-gray-900 mt-4 mb-2">
            Style Direction
          </h4>
          <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
            {styleDirection}
          </p>
        </>
      )}
    </div>
  );
}
