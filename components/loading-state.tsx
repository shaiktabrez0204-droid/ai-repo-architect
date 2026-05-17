interface LoadingStateProps {
  message: string;
  step: number;
  totalSteps: number;
}

export function LoadingState({ message, step, totalSteps }: LoadingStateProps) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-100">{message}</p>
          <p className="mt-1 text-sm text-zinc-500">
            Step {step} of {totalSteps}. Larger repositories may take longer.
          </p>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-md bg-zinc-900 sm:w-56">
          <div
            className="h-full rounded-md bg-emerald-300 transition-[width] duration-500"
            style={{ width: `${Math.round((step / totalSteps) * 100)}%` }}
          />
        </div>
      </div>
    </section>
  );
}
