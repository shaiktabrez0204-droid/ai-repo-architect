import { AnalysisWorkspace } from "@/components/analysis-workspace";

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <section className="border-b border-zinc-900">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-14">
          <div className="space-y-5">
            <div className="inline-flex rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1 font-mono text-xs text-emerald-200">
              AI Repo Architect
            </div>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-zinc-50 sm:text-5xl">
                Repository architecture analysis for working developers.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-zinc-400">
                Submit a public GitHub repository and get a structured
                architecture overview, dependency review, code smell notes,
                recommendations, and a README draft.
              </p>
            </div>
            <div className="grid gap-2 text-sm text-zinc-500">
              <p>Public GitHub API ingestion. No cloning. No code execution.</p>
              <p>Deterministic profiling first, staged AI analysis second.</p>
            </div>
          </div>

          <AnalysisWorkspace />
        </div>
      </section>
    </main>
  );
}
