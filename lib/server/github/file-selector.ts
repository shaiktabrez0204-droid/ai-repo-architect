import "server-only";

import type {
  RepositoryIngestionLimits,
  RepositoryTreeEntry,
  SelectedFileCategory,
  SkippedRepositoryFile,
} from "@/lib/shared/repository-ingestion-types";

export interface SelectedFileCandidate {
  path: string;
  category: SelectedFileCategory;
  size: number;
  sha: string;
}

export interface FileSelectionResult {
  selectedFiles: SelectedFileCandidate[];
  skippedFiles: SkippedRepositoryFile[];
}

interface ScoredFileCandidate extends SelectedFileCandidate {
  priority: number;
}

const ROOT_LOCKFILES = new Set([
  "package-lock.json",
  "npm-shrinkwrap.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "bun.lock",
]);

const ROOT_CONFIG_FILES = new Set([
  ".browserslistrc",
  ".editorconfig",
  ".env.example",
  ".npmrc",
  "agents.md",
  "biome.json",
  "biome.jsonc",
  "claude.md",
  "components.json",
  "jsconfig.json",
  "netlify.toml",
  "postcss.config.cjs",
  "postcss.config.js",
  "postcss.config.mjs",
  "postcss.config.ts",
  "tailwind.config.cjs",
  "tailwind.config.js",
  "tailwind.config.mjs",
  "tailwind.config.ts",
  "turbo.json",
  "vercel.json",
  "vite.config.js",
  "vite.config.mjs",
  "vite.config.ts",
]);

export function selectHighSignalFiles(
  files: RepositoryTreeEntry[],
  limits: RepositoryIngestionLimits,
): FileSelectionResult {
  const skippedFiles: SkippedRepositoryFile[] = [];
  const candidates = files.flatMap((file) => {
    const scoredCandidate = scoreHighSignalFile(file);

    if (!scoredCandidate) {
      return [];
    }

    if (!isLikelyTextFile(file.path)) {
      skippedFiles.push({
        path: file.path,
        reason: "unsupported-file-type",
        size: file.size,
      });
      return [];
    }

    if (file.size === null || file.size > limits.maxFileBytes) {
      skippedFiles.push({
        path: file.path,
        reason: "oversized-file",
        size: file.size,
      });
      return [];
    }

    return [scoredCandidate];
  });

  const sortedCandidates = candidates.sort(compareCandidates);
  const selectedFiles: SelectedFileCandidate[] = [];
  let selectedPayloadBytes = 0;

  for (const candidate of sortedCandidates) {
    if (selectedFiles.length >= limits.maxSelectedFiles) {
      skippedFiles.push({
        path: candidate.path,
        reason: "selected-file-limit",
        size: candidate.size,
      });
      continue;
    }

    if (selectedPayloadBytes + candidate.size > limits.maxTotalSelectedBytes) {
      skippedFiles.push({
        path: candidate.path,
        reason: "payload-limit",
        size: candidate.size,
      });
      continue;
    }

    selectedFiles.push(candidate);
    selectedPayloadBytes += candidate.size;
  }

  return {
    selectedFiles,
    skippedFiles,
  };
}

function scoreHighSignalFile(
  file: RepositoryTreeEntry,
): ScoredFileCandidate | null {
  const normalizedPath = normalizePath(file.path);
  const filename = basename(normalizedPath);
  const rootFile = !normalizedPath.includes("/");
  const size = file.size ?? 0;

  if (filename === "package.json") {
    return candidate(file, "package-manifest", rootFile ? 100 : 65, size);
  }

  if (rootFile && /^tsconfig(?:\..*)?\.json$/i.test(filename)) {
    return candidate(file, "typescript-config", 95, size);
  }

  if (/^next\.config\.(?:js|mjs|cjs|ts)$/i.test(filename)) {
    return candidate(file, "next-config", rootFile ? 94 : 68, size);
  }

  if (rootFile && /^readme(?:\..*)?$/i.test(filename)) {
    return candidate(file, "readme", 90, size);
  }

  if (rootFile && isLintOrFormatConfig(filename)) {
    return candidate(file, "lint-format-config", 85, size);
  }

  if (rootFile && ROOT_LOCKFILES.has(filename.toLowerCase())) {
    return candidate(file, "lockfile", 80, size);
  }

  if (rootFile && ROOT_CONFIG_FILES.has(filename.toLowerCase())) {
    return candidate(file, "root-config", 75, size);
  }

  if (isRouteFile(normalizedPath)) {
    return candidate(file, "route-file", 60, size);
  }

  return null;
}

function candidate(
  file: RepositoryTreeEntry,
  category: SelectedFileCategory,
  priority: number,
  size: number,
): ScoredFileCandidate {
  return {
    path: file.path,
    category,
    priority,
    size,
    sha: file.sha,
  };
}

function compareCandidates(
  first: ScoredFileCandidate,
  second: ScoredFileCandidate,
): number {
  if (first.priority !== second.priority) {
    return second.priority - first.priority;
  }

  return first.path.localeCompare(second.path);
}

function isLintOrFormatConfig(filename: string): boolean {
  const lowerFilename = filename.toLowerCase();

  return (
    lowerFilename === "eslint.config.js" ||
    lowerFilename === "eslint.config.mjs" ||
    lowerFilename === "eslint.config.cjs" ||
    lowerFilename === "eslint.config.ts" ||
    lowerFilename.startsWith(".eslintrc") ||
    lowerFilename === "prettier.config.js" ||
    lowerFilename === "prettier.config.mjs" ||
    lowerFilename === "prettier.config.cjs" ||
    lowerFilename === "prettier.config.ts" ||
    lowerFilename.startsWith(".prettierrc")
  );
}

function isRouteFile(path: string): boolean {
  return (
    /(?:^|\/)(?:src\/)?app\/(?:.+\/)?route\.(?:js|jsx|ts|tsx)$/i.test(path) ||
    /(?:^|\/)pages\/api\/.+\.(?:js|jsx|ts|tsx)$/i.test(path) ||
    /(?:^|\/)src\/pages\/api\/.+\.(?:js|jsx|ts|tsx)$/i.test(path)
  );
}

function isLikelyTextFile(path: string): boolean {
  const lowerPath = path.toLowerCase();

  return !(
    lowerPath.endsWith(".lockb") ||
    lowerPath.endsWith(".png") ||
    lowerPath.endsWith(".jpg") ||
    lowerPath.endsWith(".jpeg") ||
    lowerPath.endsWith(".gif") ||
    lowerPath.endsWith(".webp") ||
    lowerPath.endsWith(".ico") ||
    lowerPath.endsWith(".pdf") ||
    lowerPath.endsWith(".zip")
  );
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/");
}

function basename(path: string): string {
  const segments = path.split("/");
  return segments[segments.length - 1] ?? path;
}
