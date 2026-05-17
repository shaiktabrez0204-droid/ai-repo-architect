import type { AnalyzeRepositorySuccessResponse } from "@/lib/shared/api-types";

interface MetadataSummaryProps {
  response: AnalyzeRepositorySuccessResponse;
}

export function MetadataSummary({ response }: MetadataSummaryProps) {
  const frameworks = response.profile.frameworks
    .map((framework) => framework.name)
    .join(", ");

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm text-zinc-500">Repository</p>
          <h2 className="mt-1 font-mono text-xl text-zinc-100">
            {response.repository.owner}/{response.repository.name}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
            {response.profile.metadata.description ??
              "No repository description was provided by GitHub."}
          </p>
        </div>
        <a
          href={response.repository.url}
          target="_blank"
          rel="noreferrer"
          className="w-fit rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-200 transition-colors hover:border-emerald-300 hover:text-emerald-200"
        >
          Open repository
        </a>
      </div>

      <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryItem label="Branch" value={response.repository.branch ?? "-"} />
        <SummaryItem
          label="Project"
          value={response.profile.ecosystem.projectType}
        />
        <SummaryItem
          label="Language"
          value={response.profile.ecosystem.primaryLanguage}
        />
        <SummaryItem
          label="Package manager"
          value={response.profile.ecosystem.packageManager}
        />
        <SummaryItem label="Frameworks" value={frameworks || "None detected"} />
        <SummaryItem label="Model" value={response.metadata.model} />
        <SummaryItem
          label="Context files"
          value={`${response.metadata.context.includedFileCount} included`}
        />
        <SummaryItem
          label="Omitted files"
          value={`${response.metadata.context.omittedFileCount} omitted`}
        />
      </dl>
    </section>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-3">
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="mt-1 truncate text-sm font-medium text-zinc-200">
        {value}
      </dd>
    </div>
  );
}
