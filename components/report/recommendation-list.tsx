import type { ImprovementRecommendation } from "@/lib/shared/analysis-types";

interface RecommendationListProps {
  recommendations: ImprovementRecommendation[];
}

export function RecommendationList({ recommendations }: RecommendationListProps) {
  if (recommendations.length === 0) {
    return <p className="text-sm text-zinc-500">No recommendations returned.</p>;
  }

  return (
    <ol className="space-y-3">
      {recommendations.map((recommendation, index) => (
        <li
          className="rounded-md border border-zinc-800 p-3"
          key={`${recommendation.title}-${index}`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-zinc-500">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3 className="text-sm font-semibold text-zinc-100">
              {recommendation.title}
            </h3>
            <PriorityBadge priority={recommendation.priority} />
            <span className="rounded-md border border-zinc-800 px-2 py-0.5 text-xs text-zinc-500">
              {recommendation.basis}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            {recommendation.rationale}
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            {recommendation.suggestedAction}
          </p>
        </li>
      ))}
    </ol>
  );
}

function PriorityBadge({
  priority,
}: {
  priority: ImprovementRecommendation["priority"];
}) {
  const className =
    priority === "high"
      ? "border-emerald-700 text-emerald-200"
      : priority === "medium"
        ? "border-cyan-800 text-cyan-200"
        : "border-zinc-700 text-zinc-400";

  return (
    <span className={`rounded-md border px-2 py-0.5 text-xs ${className}`}>
      {priority}
    </span>
  );
}
