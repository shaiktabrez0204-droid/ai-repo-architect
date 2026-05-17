import "server-only";

import type { RepositoryIngestionResult } from "@/lib/shared/repository-ingestion-types";
import type { RepositoryProfile } from "@/lib/shared/repository-profile-types";
import {
  detectFrameworks,
  profileDependencies,
  profileScripts,
  profileTooling,
} from "./dependency-signals";
import { parseRootPackageJson } from "./package-json";
import {
  profileArchitecturalHints,
  profileConfigs,
  profileEcosystem,
  profileRouter,
  profileSourceStructure,
} from "./structure-signals";

export function createRepositoryProfile(
  ingestion: RepositoryIngestionResult,
): RepositoryProfile {
  const packageResult = parseRootPackageJson(ingestion.selectedFiles);
  const scannedFilePaths = ingestion.fileTree.scannedFilePaths;
  const selectedFilePaths = ingestion.fileTree.selectedFilePaths;
  const dependencies = profileDependencies(packageResult.packageJson);
  const scripts = profileScripts(packageResult.packageJson);
  const frameworks = detectFrameworks(dependencies, scannedFilePaths);
  const structure = profileSourceStructure(scannedFilePaths, selectedFilePaths);
  const router = profileRouter(scannedFilePaths);
  const tooling = profileTooling(dependencies, scripts, scannedFilePaths);
  const ecosystem = profileEcosystem({
    packageJson: packageResult.packageJson,
    frameworks,
    filePaths: scannedFilePaths,
  });
  const configs = profileConfigs(ingestion.selectedFiles);
  const architecturalHints = profileArchitecturalHints({
    router,
    structure,
    tooling,
    scripts,
    frameworks,
  });

  return {
    metadata: ingestion.metadata,
    ecosystem,
    frameworks,
    dependencies,
    scripts,
    configs,
    structure,
    router,
    tooling,
    architecturalHints,
    profileWarnings: [
      packageResult.warning,
      dependencies.length >= 80
        ? "Dependency profile was capped at 80 entries."
        : null,
    ].filter((warning): warning is string => Boolean(warning)),
  };
}
