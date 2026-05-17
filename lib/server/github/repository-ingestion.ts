import "server-only";

import {
  defaultRepositoryIngestionLimits,
  type RepositoryIngestionLimits,
  type RepositoryIngestionResult,
  type SelectedRepositoryFile,
  type SkippedRepositoryFile,
} from "@/lib/shared/repository-ingestion-types";
import type { RepositoryReference } from "@/lib/shared/analysis-types";
import { GitHubIngestionError } from "./errors";
import {
  fetchRepositoryFileContent,
  fetchRepositoryMetadata,
  fetchRepositoryTree,
} from "./github-api-client";
import { selectHighSignalFiles } from "./file-selector";
import { filterIgnoredRepositoryPaths } from "./path-filter";

export interface IngestGitHubRepositoryOptions {
  repository: RepositoryReference;
  branch?: string;
  limits?: Partial<RepositoryIngestionLimits>;
}

export async function ingestGitHubRepository({
  repository,
  branch,
  limits: limitOverrides,
}: IngestGitHubRepositoryOptions): Promise<RepositoryIngestionResult> {
  const limits = {
    ...defaultRepositoryIngestionLimits(),
    ...limitOverrides,
  };

  const metadata = await fetchRepositoryMetadata(repository);
  const resolvedBranch = branch ?? metadata.defaultBranch;
  const tree = await fetchRepositoryTree(metadata.repository, resolvedBranch);

  if (tree.truncated) {
    throw new GitHubIngestionError(
      "GITHUB_REPOSITORY_TOO_LARGE",
      "GitHub truncated the repository tree, so the repository is too large for safe MVP ingestion.",
      413,
      { maxFilesScanned: limits.maxFilesScanned },
    );
  }

  const allFiles = tree.entries.filter((entry) => entry.type === "file");
  const filteredTree = filterIgnoredRepositoryPaths(tree.entries);

  if (filteredTree.files.length > limits.maxFilesScanned) {
    throw new GitHubIngestionError(
      "GITHUB_REPOSITORY_TOO_LARGE",
      "Repository has more files than the MVP ingestion limit after ignored paths are removed.",
      413,
      {
        filesScanned: filteredTree.files.length,
        maxFilesScanned: limits.maxFilesScanned,
      },
    );
  }

  const selection = selectHighSignalFiles(filteredTree.files, limits);
  const fetchedFiles: SelectedRepositoryFile[] = [];
  const skippedDuringFetch: SkippedRepositoryFile[] = [];
  let fetchedPayloadBytes = 0;

  for (const selectedFile of selection.selectedFiles) {
    const content = await fetchRepositoryFileContent(
      metadata.repository,
      selectedFile.path,
      resolvedBranch,
    );

    if (content === null) {
      skippedDuringFetch.push({
        path: selectedFile.path,
        reason: "missing-file",
        size: selectedFile.size,
      });
      continue;
    }

    const contentBytes = Buffer.byteLength(content, "utf8");

    if (contentBytes > limits.maxFileBytes) {
      skippedDuringFetch.push({
        path: selectedFile.path,
        reason: "oversized-file",
        size: contentBytes,
      });
      continue;
    }

    if (fetchedPayloadBytes + contentBytes > limits.maxTotalSelectedBytes) {
      skippedDuringFetch.push({
        path: selectedFile.path,
        reason: "payload-limit",
        size: contentBytes,
      });
      continue;
    }

    fetchedFiles.push({
      path: selectedFile.path,
      category: selectedFile.category,
      size: contentBytes,
      sha: selectedFile.sha,
      content,
    });
    fetchedPayloadBytes += contentBytes;
  }

  const skippedFiles = [
    ...filteredTree.ignoredFiles,
    ...selection.skippedFiles,
    ...skippedDuringFetch,
  ];

  return {
    metadata: {
      ...metadata,
      repository: {
        ...metadata.repository,
        branch: resolvedBranch,
      },
    },
    tree: {
      totalEntries: tree.entries.length,
      totalFiles: allFiles.length,
      ignoredFiles: filteredTree.ignoredFiles.length,
      scannedFiles: filteredTree.files.length,
      selectedFiles: fetchedFiles.length,
      skippedFiles: skippedFiles.length,
      truncated: tree.truncated,
    },
    fileTree: {
      scannedFilePaths: filteredTree.files.map((file) => file.path).sort(),
      selectedFilePaths: fetchedFiles.map((file) => file.path),
    },
    selectedFiles: fetchedFiles,
    skippedFiles,
    limits,
  };
}
