import type { RepositoryMetadata } from "./repository-ingestion-types";

export type DetectionConfidence = "low" | "medium" | "high";

export type DependencyGroupName =
  | "runtime"
  | "development"
  | "framework"
  | "build"
  | "testing"
  | "linting"
  | "formatting"
  | "deployment";

export interface DependencySignal {
  name: string;
  version: string;
  group: DependencyGroupName;
}

export interface FrameworkSignal {
  name: string;
  confidence: DetectionConfidence;
  evidence: string[];
}

export interface ScriptSignal {
  name: string;
  command: string;
  category:
    | "dev"
    | "build"
    | "start"
    | "test"
    | "lint"
    | "format"
    | "deploy"
    | "generate"
    | "other";
}

export interface ConfigSummary {
  path: string;
  kind:
    | "typescript"
    | "next"
    | "eslint"
    | "prettier"
    | "package"
    | "lockfile"
    | "deployment"
    | "build"
    | "other";
  signals: string[];
}

export interface SourceStructureEntry {
  path: string;
  fileCount: number;
  selectedFileCount: number;
  role: string;
}

export interface RouterProfile {
  nextAppRouter: boolean;
  nextPagesRouter: boolean;
  pagesApiRoutes: boolean;
  routeHandlerCount: number;
  evidence: string[];
}

export interface EcosystemProfile {
  primaryLanguage: string;
  runtime: "node" | "browser" | "unknown";
  packageManager: "npm" | "pnpm" | "yarn" | "bun" | "unknown";
  projectType: string;
  usesTypeScript: boolean;
}

export interface ToolingProfile {
  linting: string[];
  formatting: string[];
  testing: string[];
  deployment: string[];
  build: string[];
}

export interface ArchitecturalHint {
  title: string;
  confidence: DetectionConfidence;
  evidence: string[];
}

export interface RepositoryProfile {
  metadata: RepositoryMetadata;
  ecosystem: EcosystemProfile;
  frameworks: FrameworkSignal[];
  dependencies: DependencySignal[];
  scripts: ScriptSignal[];
  configs: ConfigSummary[];
  structure: SourceStructureEntry[];
  router: RouterProfile;
  tooling: ToolingProfile;
  architecturalHints: ArchitecturalHint[];
  profileWarnings: string[];
}
