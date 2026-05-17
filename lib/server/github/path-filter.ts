import "server-only";

import { IGNORED_REPOSITORY_DIRECTORIES } from "@/lib/shared/analysis-constants";
import type {
  RepositoryTreeEntry,
  SkippedRepositoryFile,
} from "@/lib/shared/repository-ingestion-types";

export interface FilteredRepositoryTree {
  files: RepositoryTreeEntry[];
  ignoredFiles: SkippedRepositoryFile[];
}

const IGNORED_DIRECTORY_SET = new Set<string>(IGNORED_REPOSITORY_DIRECTORIES);

export function filterIgnoredRepositoryPaths(
  entries: RepositoryTreeEntry[],
): FilteredRepositoryTree {
  const files: RepositoryTreeEntry[] = [];
  const ignoredFiles: SkippedRepositoryFile[] = [];

  for (const entry of entries) {
    if (entry.type !== "file") {
      continue;
    }

    if (isIgnoredPath(entry.path)) {
      ignoredFiles.push({
        path: entry.path,
        reason: "ignored-path",
        size: entry.size,
      });
      continue;
    }

    files.push(entry);
  }

  return {
    files,
    ignoredFiles,
  };
}

function isIgnoredPath(path: string): boolean {
  const segments = path.split("/");

  return segments.some((segment) => IGNORED_DIRECTORY_SET.has(segment));
}
