export const SUPPORTED_ANALYSIS_DEPTHS = ["standard"] as const;

export const IGNORED_REPOSITORY_DIRECTORIES = [
  "node_modules",
  ".git",
  "dist",
  "build",
  "coverage",
  ".next",
] as const;

export const ANALYSIS_LIMITS = {
  maxRepositoryUrlLength: 2_048,
  maxBranchNameLength: 255,
  maxFilesScanned: 5_000,
  maxTreeEntries: 5_000,
  maxSelectedFiles: 40,
  maxFileBytes: 80_000,
  maxTotalSelectedBytes: 500_000,
} as const;

export const AI_CONTEXT_LIMITS = {
  maxContextFiles: 30,
  maxFileExcerptBytes: 12_000,
  maxTotalContextBytes: 120_000,
} as const;
