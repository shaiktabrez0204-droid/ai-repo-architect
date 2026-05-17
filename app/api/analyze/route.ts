import {
  ANALYSIS_LIMITS,
  IGNORED_REPOSITORY_DIRECTORIES,
  SUPPORTED_ANALYSIS_DEPTHS,
} from "@/lib/shared/analysis-constants";
import type { AnalysisDepth } from "@/lib/shared/analysis-types";
import type {
  AnalyzeRepositoryRequest,
  ApiErrorCode,
  ApiErrorResponse,
  JsonRecord,
} from "@/lib/shared/api-types";
import { randomUUID } from "crypto";
import { AiExecutionError } from "@/lib/server/ai/errors";
import { GeminiProvider } from "@/lib/server/ai/gemini-provider";
import { runArchitectureAnalysis } from "@/lib/server/ai/analysis-pipeline";
import { EnvValidationError, getServerEnv } from "@/lib/server/config/env";
import { GitHubIngestionError } from "@/lib/server/github/errors";
import {
  parseGitHubRepositoryUrl,
  validateGitHubBranchName,
} from "@/lib/server/github/github-url";
import { ingestGitHubRepository } from "@/lib/server/github/repository-ingestion";
import { createRepositoryProfile } from "@/lib/server/profiling/repository-profiler";

export const runtime = "nodejs";

type RequestValidationResult =
  | {
      ok: true;
      body: AnalyzeRepositoryRequest;
    }
  | {
      ok: false;
      response: Response;
    };

export async function POST(request: Request): Promise<Response> {
  try {
    const validatedRequest = await validateRequestBody(request);

    if (!validatedRequest.ok) {
      return validatedRequest.response;
    }

    const repositoryResult = parseGitHubRepositoryUrl(
      validatedRequest.body.repositoryUrl,
    );

    if (!repositoryResult.ok) {
      return errorResponse(
        "INVALID_GITHUB_URL",
        repositoryResult.message,
        400,
        repositoryResult.details,
      );
    }

    const branchResult = validatedRequest.body.branch
      ? validateGitHubBranchName(validatedRequest.body.branch)
      : null;

    if (branchResult && !branchResult.ok) {
      return errorResponse(
        "INVALID_REQUEST",
        branchResult.message,
        400,
        branchResult.details,
      );
    }

    const repository = {
      ...repositoryResult.repository,
      ...(branchResult?.ok ? { branch: branchResult.branch } : {}),
    };
    const ingestion = await ingestGitHubRepository({
      repository,
      branch: repository.branch,
    });
    const profile = createRepositoryProfile(ingestion);
    const env = getServerEnv();
    const provider = new GeminiProvider({
      apiKey: env.geminiApiKey,
      model: env.geminiModel,
      timeoutMs: env.geminiTimeoutMs,
    });
    const analysis = await runArchitectureAnalysis({
      provider,
      profile,
      selectedFiles: ingestion.selectedFiles,
    });

    return Response.json({
      ok: true,
      phase: "analysis",
      analysisId: randomUUID(),
      repository: ingestion.metadata.repository,
      profile,
      report: analysis.report,
      metadata: {
        analyzedAt: new Date().toISOString(),
        provider: provider.name,
        model: env.geminiModel,
        depth: validatedRequest.body.depth ?? "standard",
        limits: {
          ignoredDirectories: [...IGNORED_REPOSITORY_DIRECTORIES],
          maxFilesScanned: ANALYSIS_LIMITS.maxFilesScanned,
          maxTreeEntries: ANALYSIS_LIMITS.maxTreeEntries,
          maxSelectedFiles: ANALYSIS_LIMITS.maxSelectedFiles,
          maxFileBytes: ANALYSIS_LIMITS.maxFileBytes,
          maxTotalSelectedBytes: ANALYSIS_LIMITS.maxTotalSelectedBytes,
        },
        context: analysis.context,
        stages: analysis.stages,
      },
    });
  } catch (error) {
    if (error instanceof EnvValidationError) {
      return errorResponse(
        "MISSING_ENVIRONMENT",
        "Server configuration is missing required environment variables.",
        500,
        { missingKeys: error.missingKeys },
      );
    }

    if (error instanceof GitHubIngestionError) {
      return errorResponse(
        error.code,
        error.message,
        error.status,
        error.details,
      );
    }

    if (error instanceof AiExecutionError) {
      return errorResponse(
        error.code,
        error.message,
        error.status,
        {
          ...(error.details ?? {}),
          stageId: error.stageId ?? null,
        },
      );
    }

    console.error("Unexpected analysis route failure:", error);

    return errorResponse(
      "INTERNAL_ERROR",
      "An unexpected error occurred while preparing the analysis request.",
      500,
    );
  }
}

async function validateRequestBody(
  request: Request,
): Promise<RequestValidationResult> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";

  if (!contentType.includes("application/json")) {
    return {
      ok: false,
      response: errorResponse(
        "INVALID_REQUEST",
        "Request content type must be application/json.",
        400,
      ),
    };
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return {
      ok: false,
      response: errorResponse(
        "INVALID_JSON",
        "Request body must be valid JSON.",
        400,
      ),
    };
  }

  if (!isPlainRecord(body)) {
    return {
      ok: false,
      response: errorResponse(
        "INVALID_REQUEST",
        "Request body must be a JSON object.",
        400,
      ),
    };
  }

  const repositoryUrl = body.repositoryUrl;

  if (typeof repositoryUrl !== "string" || !repositoryUrl.trim()) {
    return {
      ok: false,
      response: errorResponse(
        "INVALID_REQUEST",
        "repositoryUrl is required and must be a non-empty string.",
        400,
      ),
    };
  }

  if (repositoryUrl.length > ANALYSIS_LIMITS.maxRepositoryUrlLength) {
    return {
      ok: false,
      response: errorResponse(
        "INVALID_REQUEST",
        "repositoryUrl is too long.",
        400,
        { maxLength: ANALYSIS_LIMITS.maxRepositoryUrlLength },
      ),
    };
  }

  const branch = body.branch;

  if (branch !== undefined && typeof branch !== "string") {
    return {
      ok: false,
      response: errorResponse(
        "INVALID_REQUEST",
        "branch must be a string when provided.",
        400,
      ),
    };
  }

  const depth = body.depth;

  if (depth !== undefined && !isSupportedAnalysisDepth(depth)) {
    return {
      ok: false,
      response: errorResponse(
        "INVALID_REQUEST",
        "depth must be one of the supported analysis depths.",
        400,
        { supportedDepths: [...SUPPORTED_ANALYSIS_DEPTHS] },
      ),
    };
  }

  return {
    ok: true,
    body: {
      repositoryUrl,
      ...(branch !== undefined ? { branch } : {}),
      ...(depth !== undefined ? { depth } : {}),
    },
  };
}

function isSupportedAnalysisDepth(value: unknown): value is AnalysisDepth {
  return (
    typeof value === "string" &&
    (SUPPORTED_ANALYSIS_DEPTHS as readonly string[]).includes(value)
  );
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function errorResponse(
  code: ApiErrorCode,
  message: string,
  status: number,
  details?: JsonRecord,
): Response {
  const body: ApiErrorResponse = {
    ok: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  };

  return Response.json(body, { status });
}
