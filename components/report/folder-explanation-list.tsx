import type { FolderExplanation } from "@/lib/shared/analysis-types";

interface FolderExplanationListProps {
  folders: FolderExplanation[];
}

export function FolderExplanationList({ folders }: FolderExplanationListProps) {
  if (folders.length === 0) {
    return <p className="text-sm text-zinc-500">No folder explanations returned.</p>;
  }

  return (
    <div className="divide-y divide-zinc-800 rounded-md border border-zinc-800">
      {folders.map((folder) => (
        <div className="p-3" key={folder.path}>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-mono text-sm text-emerald-200">
              {folder.path}
            </h3>
            <span className="rounded-md border border-zinc-800 px-2 py-0.5 text-xs text-zinc-500">
              {folder.basis}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            {folder.purpose}
          </p>
          {folder.notableFiles.length > 0 ? (
            <p className="mt-2 font-mono text-xs text-zinc-500">
              {folder.notableFiles.join(" | ")}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
