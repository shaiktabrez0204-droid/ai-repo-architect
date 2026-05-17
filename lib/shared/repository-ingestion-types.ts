import { ANALYSIS_LIMITS } from "./analysis-constants";
import type { RepositoryReference } from "./analysis-types";

export interface RepositoryIngestionLimits {
  maxFilesScanned: number;
  maxSelectedFiles: number;
  maxFileBytes: number;
  maxTotalSelectedBytes: number;
}

export interface RepositoryMetadata {
  repository: RepositoryReference;
  defaultBranch: string;
  description: string | null;
  homepageUrl: string | null;
  isFork: boolean;
  isArchived: boolean;
  isDisabled: boolean;
  visibility: "public";
  stars: number;
  forks: number;
  openIssues: number;
  pushedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  sizeKb: number;
  language: string | null;
  topics: string[];
}

export type RepositoryTreeEntryType = "file" | "directory";

export interface RepositoryTreeEntry {
  path: string;
  type: RepositoryTreeEntryType;
  size: number | null;
  sha: string;
}

export type SelectedFileCategory =
  | "package-manifest"
  | "typescript-config"
  | "next-config"
  | "readme"
  | "lint-format-config"
  | "lockfile"
  | "route-file"
  | "root-config";

export interface SelectedRepositoryFile {
  path: string;
  category: SelectedFileCategory;
  size: number;
  sha: string;
  content: string;
}

export type SkippedFileReason =
  | "ignored-path"
  | "oversized-file"
  | "payload-limit"
  | "selected-file-limit"
  | "missing-file"
  | "unsupported-file-type"
  | "invalid-content";

export interface SkippedRepositoryFile {
  path: string;
  reason: SkippedFileReason;
  size: number | null;
}

export interface RepositoryTreeSummary {
  totalEntries: number;
  totalFiles: number;
  ignoredFiles: number;
  scannedFiles: number;
  selectedFiles: number;
  skippedFiles: number;
  truncated: boolean;
}

export interface RepositoryFileTreeSnapshot {
  scannedFilePaths: string[];
  selectedFilePaths: string[];
}

export interface RepositoryIngestionResult {
  metadata: RepositoryMetadata;
  tree: RepositoryTreeSummary;
  fileTree: RepositoryFileTreeSnapshot;
  selectedFiles: SelectedRepositoryFile[];
  skippedFiles: SkippedRepositoryFile[];
  limits: RepositoryIngestionLimits;
}

export function defaultRepositoryIngestionLimits(): RepositoryIngestionLimits {
  return {
    maxFilesScanned: ANALYSIS_LIMITS.maxFilesScanned,
    maxSelectedFiles: ANALYSIS_LIMITS.maxSelectedFiles,
    maxFileBytes: ANALYSIS_LIMITS.maxFileBytes,
    maxTotalSelectedBytes: ANALYSIS_LIMITS.maxTotalSelectedBytes,
  };
}
