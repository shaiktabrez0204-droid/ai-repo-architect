import "server-only";

import { AI_CONTEXT_LIMITS } from "@/lib/shared/analysis-constants";
import type { SelectedRepositoryFile } from "@/lib/shared/repository-ingestion-types";
import type { RepositoryProfile } from "@/lib/shared/repository-profile-types";

export interface AiContextLimits {
  maxContextFiles: number;
  maxFileExcerptBytes: number;
  maxTotalContextBytes: number;
}

export interface PreparedContextFile {
  path: string;
  category: string;
  sha: string;
  originalBytes: number;
  includedBytes: number;
  truncated: boolean;
  excerpt: string;
}

export interface OmittedContextFile {
  path: string;
  reason: "duplicate" | "file-limit" | "context-budget";
  originalBytes: number;
}

export interface PreparedAnalysisContext {
  profile: RepositoryProfile;
  files: PreparedContextFile[];
  omittedFiles: OmittedContextFile[];
  estimatedBytes: number;
  limits: AiContextLimits;
}

const CATEGORY_PRIORITY = new Map<string, number>([
  ["package-manifest", 100],
  ["typescript-config", 95],
  ["next-config", 94],
  ["readme", 90],
  ["lint-format-config", 85],
  ["lockfile", 80],
  ["root-config", 75],
  ["route-file", 60],
]);

export function prepareAnalysisContext(input: {
  profile: RepositoryProfile;
  selectedFiles: SelectedRepositoryFile[];
  limits?: Partial<AiContextLimits>;
}): PreparedAnalysisContext {
  const limits = {
    maxContextFiles: AI_CONTEXT_LIMITS.maxContextFiles,
    maxFileExcerptBytes: AI_CONTEXT_LIMITS.maxFileExcerptBytes,
    maxTotalContextBytes: AI_CONTEXT_LIMITS.maxTotalContextBytes,
    ...input.limits,
  };
  const files: PreparedContextFile[] = [];
  const omittedFiles: OmittedContextFile[] = [];
  const seenShas = new Set<string>();
  let estimatedBytes = estimateJsonBytes(input.profile);

  for (const selectedFile of [...input.selectedFiles].sort(compareSelectedFiles)) {
    const originalBytes = Buffer.byteLength(selectedFile.content, "utf8");

    if (seenShas.has(selectedFile.sha)) {
      omittedFiles.push({
        path: selectedFile.path,
        reason: "duplicate",
        originalBytes,
      });
      continue;
    }

    if (files.length >= limits.maxContextFiles) {
      omittedFiles.push({
        path: selectedFile.path,
        reason: "file-limit",
        originalBytes,
      });
      continue;
    }

    const excerpt = truncateUtf8(
      selectedFile.content,
      limits.maxFileExcerptBytes,
    );
    const includedBytes = Buffer.byteLength(excerpt, "utf8");

    if (estimatedBytes + includedBytes > limits.maxTotalContextBytes) {
      omittedFiles.push({
        path: selectedFile.path,
        reason: "context-budget",
        originalBytes,
      });
      continue;
    }

    files.push({
      path: selectedFile.path,
      category: selectedFile.category,
      sha: selectedFile.sha,
      originalBytes,
      includedBytes,
      truncated: includedBytes < originalBytes,
      excerpt,
    });
    seenShas.add(selectedFile.sha);
    estimatedBytes += includedBytes;
  }

  return {
    profile: input.profile,
    files,
    omittedFiles,
    estimatedBytes,
    limits,
  };
}

function compareSelectedFiles(
  first: SelectedRepositoryFile,
  second: SelectedRepositoryFile,
): number {
  const firstPriority = CATEGORY_PRIORITY.get(first.category) ?? 0;
  const secondPriority = CATEGORY_PRIORITY.get(second.category) ?? 0;

  if (firstPriority !== secondPriority) {
    return secondPriority - firstPriority;
  }

  return first.path.localeCompare(second.path);
}

function truncateUtf8(content: string, maxBytes: number): string {
  if (Buffer.byteLength(content, "utf8") <= maxBytes) {
    return content;
  }

  let low = 0;
  let high = content.length;

  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    const bytes = Buffer.byteLength(content.slice(0, mid), "utf8");

    if (bytes <= maxBytes) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }

  return `${content.slice(0, low)}\n[truncated]`;
}

function estimateJsonBytes(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}
