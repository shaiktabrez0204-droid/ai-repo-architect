interface RepositoryInputFormProps {
  repositoryUrl: string;
  isAnalyzing: boolean;
  onRepositoryUrlChange: (value: string) => void;
  onAnalyze: () => void;
}

export function RepositoryInputForm({
  repositoryUrl,
  isAnalyzing,
  onRepositoryUrlChange,
  onAnalyze,
}: RepositoryInputFormProps) {
  const canSubmit = repositoryUrl.trim().length > 0 && !isAnalyzing;

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.24)] sm:p-5">
      <form
        className="grid gap-3 md:grid-cols-[1fr_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          onAnalyze();
        }}
      >
        <label className="sr-only" htmlFor="repository-url">
          GitHub repository URL
        </label>
        <input
          id="repository-url"
          type="url"
          inputMode="url"
          autoComplete="url"
          spellCheck={false}
          value={repositoryUrl}
          onChange={(event) => onRepositoryUrlChange(event.target.value)}
          placeholder="https://github.com/vercel/next-learn"
          disabled={isAnalyzing}
          className="min-h-12 rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 font-mono text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
        />
        <button
          type="submit"
          disabled={!canSubmit}
          className="min-h-12 rounded-md border border-emerald-300 bg-emerald-300 px-5 py-3 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-200 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:bg-zinc-800 disabled:text-zinc-500"
        >
          {isAnalyzing ? "Analyzing" : "Analyze Repository"}
        </button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-500">
        <span className="rounded-md border border-zinc-800 px-2 py-1">
          GitHub public repos only
        </span>
        <span className="rounded-md border border-zinc-800 px-2 py-1">
          No code execution
        </span>
        <span className="rounded-md border border-zinc-800 px-2 py-1">
          Curated AI context
        </span>
      </div>
    </section>
  );
}
