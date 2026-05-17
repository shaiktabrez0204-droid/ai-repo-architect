import "server-only";

import type { JsonRecord } from "@/lib/shared/api-types";

export type GitHubIngestionErrorCode =
  | "GITHUB_REPOSITORY_NOT_FOUND"
  | "GITHUB_REPOSITORY_PRIVATE"
  | "GITHUB_BRANCH_NOT_FOUND"
  | "GITHUB_RATE_LIMITED"
  | "GITHUB_REPOSITORY_TOO_LARGE"
  | "GITHUB_API_ERROR"
  | "GITHUB_RESPONSE_INVALID";

export class GitHubIngestionError extends Error {
  readonly code: GitHubIngestionErrorCode;
  readonly status: number;
  readonly details?: JsonRecord;

  constructor(
    code: GitHubIngestionErrorCode,
    message: string,
    status: number,
    details?: JsonRecord,
  ) {
    super(message);
    this.name = "GitHubIngestionError";
    this.code = code;
    this.status = status;
    this.details = details;
    Object.setPrototypeOf(this, GitHubIngestionError.prototype);
  }
}
