import type { CodeSmellObservation } from "@/lib/shared/analysis-types";

interface CodeSmellListProps {
  observations: CodeSmellObservation[];
}

export function CodeSmellList({ observations }: CodeSmellListProps) {
  if (observations.length === 0) {
    return <p className="text-sm text-zinc-500">No code smell observations returned.</p>;
  }

  return (
    <div className="space-y-3">
      {observations.map((observation) => (
        <article
          className="rounded-md border border-zinc-800 p-3"
          key={`${observation.title}-${observation.severity}`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-zinc-100">
              {observation.title}
            </h3>
            <SeverityBadge severity={observation.severity} />
            <span className="rounded-md border border-zinc-800 px-2 py-0.5 text-xs text-zinc-500">
              {observation.basis}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            {observation.evidence}
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            {observation.recommendation}
          </p>
        </article>
      ))}
    </div>
  );
}

function SeverityBadge({
  severity,
}: {
  severity: CodeSmellObservation["severity"];
}) {
  const className =
    severity === "high"
      ? "border-red-800 text-red-200"
      : severity === "medium"
        ? "border-amber-800 text-amber-200"
        : "border-zinc-700 text-zinc-400";

  return (
    <span className={`rounded-md border px-2 py-0.5 text-xs ${className}`}>
      {severity}
    </span>
  );
}
