import type { SUPPORTED_ANALYSIS_DEPTHS } from "./analysis-constants";

export type AnalysisDepth = (typeof SUPPORTED_ANALYSIS_DEPTHS)[number];

export type AiProviderName = "gemini";

export type AnalysisBasis = "observed" | "inferred";

export type AnalysisStageId =
  | "architecture-overview"
  | "dependency-analysis"
  | "folder-explanation"
  | "code-smell-review"
  | "recommendations"
  | "readme-generation";

export interface AiContextLimitSummary {
  maxContextFiles: number;
  maxFileExcerptBytes: number;
  maxTotalContextBytes: number;
}

export type ObservationSeverity = "low" | "medium" | "high";

export type RecommendationPriority = "low" | "medium" | "high";

export interface RepositoryReference {
  host: "github.com";
  owner: string;
  name: string;
  url: string;
  branch?: string;
}

export interface DependencyObservation {
  name: string;
  category: "runtime" | "development";
  observation: string;
  basis: AnalysisBasis;
  evidence: string[];
}

export interface DependencyAnalysis {
  runtimeDependencies: DependencyObservation[];
  developmentDependencies: DependencyObservation[];
  notableFindings: string[];
}

export interface FolderExplanation {
  path: string;
  purpose: string;
  notableFiles: string[];
  basis: AnalysisBasis;
  evidence: string[];
}

export interface CodeSmellObservation {
  title: string;
  severity: ObservationSeverity;
  basis: AnalysisBasis;
  evidence: string;
  recommendation: string;
}

export interface ImprovementRecommendation {
  title: string;
  priority: RecommendationPriority;
  basis: AnalysisBasis;
  evidence: string[];
  rationale: string;
  suggestedAction: string;
}

export interface ArchitectureReport {
  architectureOverview: string;
  dependencyAnalysis: DependencyAnalysis;
  folderExplanations: FolderExplanation[];
  codeSmells: CodeSmellObservation[];
  recommendations: ImprovementRecommendation[];
  professionalReadme: string;
}

export interface AnalysisLimitSummary {
  ignoredDirectories: readonly string[];
  maxFilesScanned: number;
  maxTreeEntries: number;
  maxSelectedFiles: number;
  maxFileBytes: number;
  maxTotalSelectedBytes: number;
}
