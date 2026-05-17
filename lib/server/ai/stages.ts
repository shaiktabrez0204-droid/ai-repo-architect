import "server-only";

import type {
  AnalysisStageId,
  CodeSmellObservation,
  DependencyAnalysis,
  FolderExplanation,
  ImprovementRecommendation,
} from "@/lib/shared/analysis-types";

export type { AnalysisStageId } from "@/lib/shared/analysis-types";

export interface ArchitectureOverviewStageOutput {
  overview: string;

  primaryPatterns: string[];

  confidenceNotes: string[];
}

export interface FolderExplanationStageOutput {
  folders: FolderExplanation[];
}

export interface CodeSmellReviewStageOutput {
  observations: CodeSmellObservation[];
}

export interface RecommendationsStageOutput {
  recommendations: ImprovementRecommendation[];
}

export interface ReadmeGenerationStageOutput {
  markdown: string;
}

export interface AnalysisStageOutputMap {
  "architecture-overview":
    ArchitectureOverviewStageOutput;

  "dependency-analysis":
    DependencyAnalysis;

  "folder-explanation":
    FolderExplanationStageOutput;

  "code-smell-review":
    CodeSmellReviewStageOutput;

  recommendations:
    RecommendationsStageOutput;

  "readme-generation":
    ReadmeGenerationStageOutput;
}

export interface AnalysisStageDefinition<
  TStageId extends AnalysisStageId,
> {
  id: TStageId;

  title: string;

  objective: string;

  outputContract: string;

  maxOutputTokens: number;
}

export const ANALYSIS_STAGE_DEFINITIONS: {
  [StageId in AnalysisStageId]:
    AnalysisStageDefinition<StageId>;
} = {
  "architecture-overview": {
    id: "architecture-overview",

    title: "Architecture Overview",

    objective:
      "Explain the repository architecture using deterministic profile evidence.",

    outputContract:
      "Return JSON: { overview: string, primaryPatterns: string[], confidenceNotes: string[] }. Use confidenceNotes for uncertainty and missing evidence.",

    maxOutputTokens: 600,
  },

  "dependency-analysis": {
    id: "dependency-analysis",

    title: "Dependency Analysis",

    objective:
      "Analyze dependency roles, framework implications, and notable package risks.",

    outputContract:
      "Return JSON: { runtimeDependencies: DependencyObservation[], developmentDependencies: DependencyObservation[], notableFindings: string[] }. Each dependency observation must include name, observation, basis, and evidence.",

    maxOutputTokens: 700,
  },

  "folder-explanation": {
    id: "folder-explanation",

    title: "Folder Explanation",

    objective:
      "Explain major folders and selected files without inventing missing paths.",

    outputContract:
      "Return JSON: { folders: Array<{ path, purpose, notableFiles, basis, evidence }> }. Use only folder paths present in the repository profile.",

    maxOutputTokens: 700,
  },

  "code-smell-review": {
    id: "code-smell-review",

    title: "Code Smell Review",

    objective:
      "Identify maintainability risks grounded only in profile and selected source evidence.",

    outputContract:
      "Return JSON: { observations: Array<{ title, severity, basis, evidence, recommendation }> }. If evidence is weak, mark basis as inferred.",

    maxOutputTokens: 700,
  },

  recommendations: {
    id: "recommendations",

    title: "Recommendations",

    objective:
      "Produce prioritized, practical improvements based on the repository profile.",

    outputContract:
      "Return JSON: { recommendations: Array<{ title, priority, basis, evidence, rationale, suggestedAction }> }.",

    maxOutputTokens: 700,
  },

  "readme-generation": {
    id: "readme-generation",

    title: "README Generation",

    objective:
      "Generate a professional README using repository facts and explicit uncertainty.",

    outputContract:
      "Return JSON: { markdown: string }. The README must avoid invented installation steps, env vars, screenshots, badges, and deployment claims.",

    maxOutputTokens: 900,
  },
};