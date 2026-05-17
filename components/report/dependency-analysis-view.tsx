import type { DependencyAnalysis } from "@/lib/shared/analysis-types";

interface DependencyAnalysisViewProps {
  analysis: DependencyAnalysis;
}

export function DependencyAnalysisView({
  analysis,
}: DependencyAnalysisViewProps) {
  return (
    <div className="space-y-5">
      <DependencyGroup
        title="Runtime Dependencies"
        items={analysis.runtimeDependencies}
      />
      <DependencyGroup
        title="Development Dependencies"
        items={analysis.developmentDependencies}
      />

      {analysis.notableFindings.length > 0 ? (
        <div>
          <h3 className="text-sm font-semibold text-zinc-200">
            Notable findings
          </h3>
          <ul className="mt-3 space-y-2">
            {analysis.notableFindings.map((finding) => (
              <li
                className="rounded-md border border-zinc-800 px-3 py-2 text-sm leading-6 text-zinc-300"
                key={finding}
              >
                {finding}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function DependencyGroup({
  title,
  items,
}: {
  title: string;
  items: DependencyAnalysis["runtimeDependencies"];
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-zinc-200">{title}</h3>
      {items.length > 0 ? (
        <div className="mt-3 divide-y divide-zinc-800 rounded-md border border-zinc-800">
          {items.map((item) => (
            <div className="p-3" key={`${title}-${item.name}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm text-emerald-200">
                  {item.name}
                </span>
                <span className="rounded-md border border-zinc-800 px-2 py-0.5 text-xs text-zinc-500">
                  {item.basis}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-zinc-300">
                {item.observation}
              </p>
              {item.evidence.length > 0 ? (
                <p className="mt-2 font-mono text-xs text-zinc-500">
                  {item.evidence.join(" | ")}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-zinc-500">No entries returned.</p>
      )}
    </div>
  );
}
