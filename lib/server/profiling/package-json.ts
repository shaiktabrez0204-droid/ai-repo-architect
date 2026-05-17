import "server-only";

import type { SelectedRepositoryFile } from "@/lib/shared/repository-ingestion-types";

export interface ParsedPackageJson {
  name: string | null;
  version: string | null;
  packageManager: string | null;
  type: string | null;
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
  optionalDependencies: Record<string, string>;
}

export interface PackageJsonParseResult {
  packageJson: ParsedPackageJson | null;
  warning?: string;
}

export function parseRootPackageJson(
  selectedFiles: SelectedRepositoryFile[],
): PackageJsonParseResult {
  const packageFile = selectedFiles.find((file) => file.path === "package.json");

  if (!packageFile) {
    return {
      packageJson: null,
      warning: "No root package.json was selected for profiling.",
    };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(packageFile.content);
  } catch {
    return {
      packageJson: null,
      warning: "Root package.json could not be parsed as JSON.",
    };
  }

  if (!isRecord(parsed)) {
    return {
      packageJson: null,
      warning: "Root package.json did not contain a JSON object.",
    };
  }

  return {
    packageJson: {
      name: readString(parsed.name),
      version: readString(parsed.version),
      packageManager: readString(parsed.packageManager),
      type: readString(parsed.type),
      scripts: readStringRecord(parsed.scripts),
      dependencies: readStringRecord(parsed.dependencies),
      devDependencies: readStringRecord(parsed.devDependencies),
      peerDependencies: readStringRecord(parsed.peerDependencies),
      optionalDependencies: readStringRecord(parsed.optionalDependencies),
    },
  };
}

export function parseJsonObject(content: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(content);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function readString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function readStringRecord(value: unknown): Record<string, string> {
  if (!isRecord(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
