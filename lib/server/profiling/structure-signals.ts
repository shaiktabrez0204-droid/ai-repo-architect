import "server-only";

import type {
  ArchitecturalHint,
  ConfigSummary,
  EcosystemProfile,
  FrameworkSignal,
  RouterProfile,
  ScriptSignal,
  SourceStructureEntry,
  ToolingProfile,
} from "@/lib/shared/repository-profile-types";
import type { SelectedRepositoryFile } from "@/lib/shared/repository-ingestion-types";
import type { ParsedPackageJson } from "./package-json";
import { parseJsonObject } from "./package-json";

export function profileConfigs(
  selectedFiles: SelectedRepositoryFile[],
): ConfigSummary[] {
  return selectedFiles
    .filter((file) => file.category !== "route-file" && file.category !== "readme")
    .map((file) => ({
      path: file.path,
      kind: configKind(file.path),
      signals: configSignals(file),
    }))
    .sort((first, second) => first.path.localeCompare(second.path));
}

export function profileSourceStructure(
  scannedFilePaths: string[],
  selectedFilePaths: string[],
): SourceStructureEntry[] {
  const selected = new Set(selectedFilePaths);
  const groups = new Map<string, { fileCount: number; selectedFileCount: number }>();

  for (const path of scannedFilePaths) {
    const segment = topLevelSegment(path);
    const existing = groups.get(segment) ?? {
      fileCount: 0,
      selectedFileCount: 0,
    };

    existing.fileCount += 1;
    existing.selectedFileCount += selected.has(path) ? 1 : 0;
    groups.set(segment, existing);
  }

  return [...groups.entries()]
    .map(([path, counts]) => ({
      path,
      fileCount: counts.fileCount,
      selectedFileCount: counts.selectedFileCount,
      role: describeStructureRole(path),
    }))
    .sort((first, second) => {
      if (first.path === "(root)") return -1;
      if (second.path === "(root)") return 1;
      return second.fileCount - first.fileCount;
    })
    .slice(0, 16);
}

export function profileRouter(filePaths: string[]): RouterProfile {
  const appRouterEvidence = filePaths.filter((path) =>
    /(?:^|\/)(?:src\/)?app\/(?:.+\/)?(?:page|layout|route)\.(?:js|jsx|ts|tsx)$/i.test(path),
  );
  const pagesRouterEvidence = filePaths.filter((path) =>
    /(?:^|\/)(?:src\/)?pages\/(?:.+\/)?(?:index|_app|_document|[^/]+)\.(?:js|jsx|ts|tsx)$/i.test(path),
  );
  const apiRouteEvidence = filePaths.filter((path) =>
    /(?:^|\/)(?:src\/)?pages\/api\/.+\.(?:js|jsx|ts|tsx)$/i.test(path),
  );
  const routeHandlerEvidence = filePaths.filter((path) =>
    /(?:^|\/)(?:src\/)?app\/(?:.+\/)?route\.(?:js|jsx|ts|tsx)$/i.test(path),
  );

  return {
    nextAppRouter: appRouterEvidence.length > 0,
    nextPagesRouter: pagesRouterEvidence.length > 0,
    pagesApiRoutes: apiRouteEvidence.length > 0,
    routeHandlerCount: routeHandlerEvidence.length + apiRouteEvidence.length,
    evidence: [
      ...appRouterEvidence.slice(0, 8),
      ...pagesRouterEvidence.slice(0, 8),
      ...apiRouteEvidence.slice(0, 8),
    ],
  };
}

export function profileEcosystem(input: {
  packageJson: ParsedPackageJson | null;
  frameworks: FrameworkSignal[];
  filePaths: string[];
}): EcosystemProfile {
  const frameworkNames = new Set(input.frameworks.map((framework) => framework.name));
  const packageManager = detectPackageManager(input.packageJson, input.filePaths);
  const usesTypeScript =
    input.filePaths.some((path) => /^tsconfig(?:\..*)?\.json$/i.test(basename(path))) ||
    hasDependency(input.packageJson, "typescript") ||
    input.filePaths.some((path) => /\.(ts|tsx)$/i.test(path));

  return {
    primaryLanguage: usesTypeScript
      ? "TypeScript"
      : input.packageJson
        ? "JavaScript"
        : "Unknown",
    runtime: input.packageJson ? "node" : "unknown",
    packageManager,
    projectType: frameworkNames.has("Next.js")
      ? "Next.js application"
      : frameworkNames.has("React")
        ? "React application"
        : input.packageJson
          ? "Node.js package or application"
          : "Unknown repository type",
    usesTypeScript,
  };
}

export function profileArchitecturalHints(input: {
  router: RouterProfile;
  structure: SourceStructureEntry[];
  tooling: ToolingProfile;
  scripts: ScriptSignal[];
  frameworks: FrameworkSignal[];
}): ArchitecturalHint[] {
  const hints: ArchitecturalHint[] = [];
  const structurePaths = new Set(input.structure.map((entry) => entry.path));
  const frameworkNames = new Set(input.frameworks.map((framework) => framework.name));

  if (frameworkNames.has("Next.js")) {
    hints.push({
      title: "Next.js application architecture detected",
      confidence: "high",
      evidence: input.router.evidence.slice(0, 6),
    });
  }

  if (input.router.nextAppRouter && input.router.nextPagesRouter) {
    hints.push({
      title: "Hybrid App Router and Pages Router structure",
      confidence: "medium",
      evidence: input.router.evidence.slice(0, 8),
    });
  } else if (input.router.nextAppRouter) {
    hints.push({
      title: "App Router routing model",
      confidence: "high",
      evidence: input.router.evidence.slice(0, 8),
    });
  } else if (input.router.nextPagesRouter) {
    hints.push({
      title: "Pages Router routing model",
      confidence: "high",
      evidence: input.router.evidence.slice(0, 8),
    });
  }

  if (structurePaths.has("src")) {
    hints.push({
      title: "Source code is isolated under src",
      confidence: "medium",
      evidence: ["directory:src"],
    });
  }

  if (structurePaths.has("lib")) {
    hints.push({
      title: "Shared library layer detected",
      confidence: "medium",
      evidence: ["directory:lib"],
    });
  }

  if (input.tooling.testing.length === 0) {
    hints.push({
      title: "No deterministic test tooling detected",
      confidence: "low",
      evidence: ["No known test dependency or test script found"],
    });
  }

  return hints;
}

function configKind(path: string): ConfigSummary["kind"] {
  const filename = basename(path).toLowerCase();

  if (filename === "package.json") return "package";
  if (/^tsconfig(?:\..*)?\.json$/.test(filename)) return "typescript";
  if (/^next\.config\./.test(filename)) return "next";
  if (filename.startsWith("eslint.config") || filename.startsWith(".eslintrc")) {
    return "eslint";
  }
  if (filename.startsWith("prettier.config") || filename.startsWith(".prettierrc")) {
    return "prettier";
  }
  if (filename.endsWith("lock") || filename.endsWith("lock.json") || filename.endsWith("lock.yaml")) {
    return "lockfile";
  }
  if (filename === "vercel.json" || filename === "netlify.toml") return "deployment";
  if (filename.includes("tailwind") || filename.includes("postcss") || filename.includes("vite")) {
    return "build";
  }
  return "other";
}

function configSignals(file: SelectedRepositoryFile): string[] {
  if (file.category === "typescript-config") {
    const parsed = parseJsonObject(file.content);
    const compilerOptions = parsed?.compilerOptions;
    if (isRecord(compilerOptions)) {
      return Object.entries(compilerOptions)
        .filter(([key]) =>
          ["strict", "jsx", "module", "moduleResolution", "target", "noEmit"].includes(key),
        )
        .map(([key, value]) => `${key}:${String(value)}`)
        .slice(0, 8);
    }
  }

  if (file.category === "package-manifest") {
    const parsed = parseJsonObject(file.content);
    return [
      readPackageSignal(parsed, "name"),
      readPackageSignal(parsed, "type"),
      readPackageSignal(parsed, "packageManager"),
    ].filter((signal): signal is string => Boolean(signal));
  }

  return [`category:${file.category}`];
}

function readPackageSignal(
  parsed: Record<string, unknown> | null,
  key: string,
): string | null {
  const value = parsed?.[key];
  return typeof value === "string" ? `${key}:${value}` : null;
}

function detectPackageManager(
  packageJson: ParsedPackageJson | null,
  filePaths: string[],
): EcosystemProfile["packageManager"] {
  const packageManager = packageJson?.packageManager?.split("@")[0];

  if (packageManager === "npm" || packageManager === "pnpm" || packageManager === "yarn" || packageManager === "bun") {
    return packageManager;
  }
  if (filePaths.includes("pnpm-lock.yaml")) return "pnpm";
  if (filePaths.includes("yarn.lock")) return "yarn";
  if (filePaths.includes("bun.lock")) return "bun";
  if (filePaths.includes("package-lock.json")) return "npm";
  return "unknown";
}

function hasDependency(
  packageJson: ParsedPackageJson | null,
  dependencyName: string,
): boolean {
  if (!packageJson) {
    return false;
  }

  return Boolean(
    packageJson.dependencies[dependencyName] ||
      packageJson.devDependencies[dependencyName] ||
      packageJson.peerDependencies[dependencyName] ||
      packageJson.optionalDependencies[dependencyName],
  );
}

function topLevelSegment(path: string): string {
  const parts = path.split("/");
  return parts.length === 1 ? "(root)" : parts[0] ?? "(root)";
}

function describeStructureRole(path: string): string {
  switch (path) {
    case "(root)":
      return "Root configuration and project metadata";
    case "app":
      return "Next.js App Router routes and layouts";
    case "pages":
      return "Next.js Pages Router routes";
    case "src":
      return "Application source directory";
    case "components":
      return "Reusable UI components";
    case "lib":
      return "Shared application utilities or server logic";
    case "public":
      return "Static public assets";
    case "test":
    case "tests":
    case "__tests__":
      return "Test files";
    default:
      return "Repository folder";
  }
}

function basename(path: string): string {
  const parts = path.split("/");
  return parts[parts.length - 1] ?? path;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
