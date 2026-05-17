import type { ApiErrorResponse } from "@/lib/shared/api-types";

interface ErrorAlertProps {
  response: ApiErrorResponse;
}

export function ErrorAlert({ response }: ErrorAlertProps) {
  return (
    <section className="rounded-lg border border-red-900/80 bg-red-950/20 p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold text-red-200">
            Analysis could not complete
          </p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-300">
            {response.error.message}
          </p>
          <p className="mt-3 text-sm text-zinc-500">
            {errorGuidance(response.error.code)}
          </p>
        </div>
        <span className="w-fit rounded-md border border-red-900/80 px-2 py-1 font-mono text-xs text-red-200">
          {response.error.code}
        </span>
      </div>
    </section>
  );
}

function errorGuidance(code: ApiErrorResponse["error"]["code"]): string {
  if (code.startsWith("GITHUB_")) {
    return "Check that the repository is public, not oversized for the MVP limits, and that GitHub rate limits have not been exhausted.";
  }

  if (code.startsWith("AI_")) {
    return "The repository was read, but the AI stage failed. This can happen when the provider times out, rate limits the request, or returns malformed structured output.";
  }

  if (code === "MISSING_ENVIRONMENT") {
    return "Set the required server environment variables before running analysis.";
  }

  return "Verify the URL format and retry. The app does not show raw stack traces for safety.";
}
