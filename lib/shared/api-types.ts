import type {
  AiProviderName,
  AnalysisDepth,
  AiContextLimitSummary,
  AnalysisLimitSummary,
  AnalysisStageId,
  ArchitectureReport,
  RepositoryReference,
} from "./analysis-types";
import type { RepositoryProfile } from "./repository-profile-types";

export type JsonPrimitive = string | number | boolean | null;

export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonRecord = Record<string, JsonValue>;

export interface AnalyzeRepositoryRequest {
  repositoryUrl: string;
  branch?: string;
  depth?: AnalysisDepth;
}

export interface AnalysisMetadata {
  analyzedAt: string;
  provider: AiProviderName;
  depth: AnalysisDepth;
  limits: AnalysisLimitSummary;
  model: string;
  context: AnalysisContextSummary;
  stages: AnalysisStageSummary[];
}

export interface AnalysisContextSummary {
  estimatedBytes: number;
  includedFileCount: number;
  omittedFileCount: number;
  truncatedFiles: string[];
  omittedFiles: Array<{
    path: string;
    reason: string;
    originalBytes: number;
  }>;
  limits: AiContextLimitSummary;
}

export interface AnalysisStageSummary {
  stageId: AnalysisStageId;
  model: string;
  promptEstimatedBytes: number;
  promptTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
}

export interface AnalyzeRepositorySuccessResponse {
  ok: true;
  phase: "analysis";
  analysisId: string;
  repository: RepositoryReference;
  profile: RepositoryProfile;
  report: ArchitectureReport;
  metadata: AnalysisMetadata;
}

export type ApiErrorCode =
  | "INVALID_JSON"
  | "INVALID_REQUEST"
  | "INVALID_GITHUB_URL"
  | "MISSING_ENVIRONMENT"
  | "GITHUB_REPOSITORY_NOT_FOUND"
  | "GITHUB_REPOSITORY_PRIVATE"
  | "GITHUB_BRANCH_NOT_FOUND"
  | "GITHUB_RATE_LIMITED"
  | "GITHUB_REPOSITORY_TOO_LARGE"
  | "GITHUB_API_ERROR"
  | "GITHUB_RESPONSE_INVALID"
  | "AI_PROVIDER_TIMEOUT"
  | "AI_PROVIDER_RATE_LIMITED"
  | "AI_PROVIDER_ERROR"
  | "AI_RESPONSE_BLOCKED"
  | "AI_RESPONSE_EMPTY"
  | "AI_RESPONSE_INVALID"
  | "INTERNAL_ERROR";

export interface ApiErrorResponse {
  ok: false;
  error: {
    code: ApiErrorCode;
    message: string;
    details?: JsonRecord;
  };
}

export type AnalyzeRepositoryResponse =
  | AnalyzeRepositorySuccessResponse
  | ApiErrorResponse;
