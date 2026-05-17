import type { ReactNode } from "react";

interface ReportCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

export function ReportCard({
  title,
  description,
  children,
  defaultOpen = true,
}: ReportCardProps) {
  return (
    <details
      className="group rounded-lg border border-zinc-800 bg-zinc-950"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 px-5 py-4">
        <span>
          <span className="block text-base font-semibold text-zinc-100">
            {title}
          </span>
          {description ? (
            <span className="mt-1 block text-sm text-zinc-500">
              {description}
            </span>
          ) : null}
        </span>
        <span
          aria-hidden="true"
          className="grid size-7 place-items-center rounded-md border border-zinc-800 font-mono text-sm text-zinc-500 group-open:hidden"
        >
          +
        </span>
        <span
          aria-hidden="true"
          className="hidden size-7 place-items-center rounded-md border border-zinc-800 font-mono text-sm text-zinc-500 group-open:grid"
        >
          -
        </span>
      </summary>
      <div className="border-t border-zinc-800 px-5 py-5">{children}</div>
    </details>
  );
}
