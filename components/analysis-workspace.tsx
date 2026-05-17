"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  AnalyzeRepositoryResponse,
  ApiErrorResponse,
} from "@/lib/shared/api-types";
import { ErrorAlert } from "./error-alert";
import { LoadingState } from "./loading-state";
import { MetadataSummary } from "./metadata-summary";
import { RepositoryInputForm } from "./repository-input-form";
import { AnalysisReport } from "./report/analysis-report";

const PROGRESS_MESSAGES = [
  "Validating GitHub repository URL",
  "Fetching public repository metadata",
  "Selecting high-signal project files",
  "Building deterministic repository profile",
  "Preparing compact AI context",
  "Running staged Gemini analysis",
  "Validating structured report output",
] as const;

export function AnalysisWorkspace() {
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [response, setResponse] = useState<AnalyzeRepositoryResponse | null>(
    null,
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progressIndex, setProgressIndex] = useState(0);

  useEffect(() => {
    if (!isAnalyzing) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setProgressIndex((currentIndex) =>
        Math.min(currentIndex + 1, PROGRESS_MESSAGES.length - 1),
      );
    }, 2_800);

    return () => window.clearInterval(intervalId);
  }, [isAnalyzing]);

  const errorResponse = useMemo(
    () => (response && !response.ok ? response : null),
    [response],
  );

  async function handleAnalyze() {
    const trimmedUrl = repositoryUrl.trim();

    if (!trimmedUrl || isAnalyzing) {
      return;
    }

    setIsAnalyzing(true);
    setResponse(null);
    setProgressIndex(0);

    try {
      const fetchResponse = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ repositoryUrl: trimmedUrl }),
      });
      const data = (await fetchResponse.json()) as AnalyzeRepositoryResponse;

      setResponse(data);
    } catch {
      const clientError: ApiErrorResponse = {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message:
            "The browser could not reach the analysis service. Check that the local server is running and try again.",
        },
      };

      setResponse(clientError);
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <div className="space-y-8">
      <RepositoryInputForm
        repositoryUrl={repositoryUrl}
        isAnalyzing={isAnalyzing}
        onRepositoryUrlChange={setRepositoryUrl}
        onAnalyze={handleAnalyze}
      />

      {isAnalyzing ? (
        <LoadingState
          message={PROGRESS_MESSAGES[progressIndex]}
          step={progressIndex + 1}
          totalSteps={PROGRESS_MESSAGES.length}
        />
      ) : null}

      {errorResponse ? <ErrorAlert response={errorResponse} /> : null}

      {response?.ok ? (
        <div className="space-y-6">
          <MetadataSummary response={response} />
          <AnalysisReport report={response.report} profile={response.profile} />
        </div>
      ) : null}
    </div>
  );
}
