import "server-only";

import type {
  AnalysisBasis,
  ArchitectureReport,
  CodeSmellObservation,
  DependencyAnalysis,
  DependencyObservation,
  FolderExplanation,
  ImprovementRecommendation,
  ObservationSeverity,
  RecommendationPriority,
} from "@/lib/shared/analysis-types";
import type {
  ArchitectureOverviewStageOutput,
  CodeSmellReviewStageOutput,
  FolderExplanationStageOutput,
  ReadmeGenerationStageOutput,
  RecommendationsStageOutput,
} from "./stages";
import type { AiResponseParser } from "./response-parser";
import { AiResponseParseError } from "./response-parser";

export const architectureOverviewParser: AiResponseParser<ArchitectureOverviewStageOutput> =
  {
    parse(rawText) {
      const value = parseJsonObject(rawText);
      return {
        overview: requireString(value, "overview"),
        primaryPatterns: requireStringArray(value, "primaryPatterns", 12),
        confidenceNotes: requireStringArray(value, "confidenceNotes", 12),
      };
    },
  };

export const dependencyAnalysisParser: AiResponseParser<DependencyAnalysis> = {
  parse(rawText) {
    const value = parseJsonObject(rawText);
    return {
      runtimeDependencies: requireDependencyObservations(
        value,
        "runtimeDependencies",
        "runtime",
      ),
      developmentDependencies: requireDependencyObservations(
        value,
        "developmentDependencies",
        "development",
      ),
      notableFindings: requireStringArray(value, "notableFindings", 12),
    };
  },
};

export const folderExplanationParser: AiResponseParser<FolderExplanationStageOutput> =
  {
    parse(rawText) {
      const value = parseJsonObject(rawText);
      return {
        folders: requireArray(value, "folders", 16).map((item, index) =>
          requireFolderExplanation(item, `folders[${index}]`),
        ),
      };
    },
  };

export const codeSmellReviewParser: AiResponseParser<CodeSmellReviewStageOutput> =
  {
    parse(rawText) {
      const value = parseJsonObject(rawText);
      return {
        observations: requireArray(value, "observations", 12).map(
          (item, index) => requireCodeSmell(item, `observations[${index}]`),
        ),
      };
    },
  };

export const recommendationsParser: AiResponseParser<RecommendationsStageOutput> =
  {
    parse(rawText) {
      const value = parseJsonObject(rawText);
      return {
        recommendations: requireArray(value, "recommendations", 12).map(
          (item, index) =>
            requireRecommendation(item, `recommendations[${index}]`),
        ),
      };
    },
  };

export const readmeGenerationParser: AiResponseParser<ReadmeGenerationStageOutput> =
  {
    parse(rawText) {
      const value = parseJsonObject(rawText);
      return {
        markdown: requireString(value, "markdown"),
      };
    },
  };

export function composeArchitectureReport(input: {
  overview: ArchitectureOverviewStageOutput;
  dependencyAnalysis: DependencyAnalysis;
  folderExplanation: FolderExplanationStageOutput;
  codeSmellReview: CodeSmellReviewStageOutput;
  recommendations: RecommendationsStageOutput;
  readme: ReadmeGenerationStageOutput;
}): ArchitectureReport {
  return {
    architectureOverview: input.overview.overview,
    dependencyAnalysis: input.dependencyAnalysis,
    folderExplanations: input.folderExplanation.folders,
    codeSmells: input.codeSmellReview.observations,
    recommendations: input.recommendations.recommendations,
    professionalReadme: input.readme.markdown,
  };
}

function requireDependencyObservations(
  value: Record<string, unknown>,
  key: string,
  category: DependencyObservation["category"],
): DependencyObservation[] {
  return requireArray(value, key, 24).map((item, index) => {
    const object = requireObject(item, `${key}[${index}]`);
    return {
      name: requireString(object, "name"),
      category,
      observation: requireString(object, "observation"),
      basis: requireBasis(object, "basis"),
      evidence: requireStringArray(object, "evidence", 8),
    };
  });
}

function requireFolderExplanation(
  item: unknown,
  path: string,
): FolderExplanation {
  const object = requireObject(item, path);

  return {
    path: requireString(object, "path"),
    purpose: requireString(object, "purpose"),
    notableFiles: requireStringArray(object, "notableFiles", 8),
    basis: requireBasis(object, "basis"),
    evidence: requireStringArray(object, "evidence", 8),
  };
}

function requireCodeSmell(
  item: unknown,
  path: string,
): CodeSmellObservation {
  const object = requireObject(item, path);

  return {
    title: requireString(object, "title"),
    severity: requireSeverity(object, "severity"),
    basis: requireBasis(object, "basis"),
    evidence: requireString(object, "evidence"),
    recommendation: requireString(object, "recommendation"),
  };
}

function requireRecommendation(
  item: unknown,
  path: string,
): ImprovementRecommendation {
  const object = requireObject(item, path);

  return {
    title: requireString(object, "title"),
    priority: requirePriority(object, "priority"),
    basis: requireBasis(object, "basis"),
    evidence: requireStringArray(object, "evidence", 8),
    rationale: requireString(object, "rationale"),
    suggestedAction: requireString(object, "suggestedAction"),
  };
}

function parseJsonObject(rawText: string): Record<string, unknown> {
  const trimmedText = stripJsonFence(rawText).trim();

  if (!trimmedText) {
    throw new AiResponseParseError("AI response was empty.");
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(trimmedText);
  } catch {
    throw new AiResponseParseError("AI response was not valid JSON.");
  }

  return requireObject(parsed, "response");
}

function stripJsonFence(rawText: string): string {
  const trimmedText = rawText.trim();
  const fencedMatch = trimmedText.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fencedMatch?.[1] ?? trimmedText;
}

function requireObject(
  value: unknown,
  path: string,
): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new AiResponseParseError(`${path} must be an object.`);
  }

  return value as Record<string, unknown>;
}

function requireString(value: Record<string, unknown>, key: string): string {
  const fieldValue = value[key];

  if (typeof fieldValue !== "string" || !fieldValue.trim()) {
    throw new AiResponseParseError(`${key} must be a non-empty string.`);
  }

  return fieldValue.trim();
}

function requireArray(
  value: Record<string, unknown>,
  key: string,
  maxItems: number,
): unknown[] {
  const fieldValue = value[key];

  if (!Array.isArray(fieldValue)) {
    throw new AiResponseParseError(`${key} must be an array.`);
  }

  return fieldValue.slice(0, maxItems);
}

function requireStringArray(
  value: Record<string, unknown>,
  key: string,
  maxItems: number,
): string[] {
  return requireArray(value, key, maxItems).map((item, index) => {
    if (typeof item !== "string" || !item.trim()) {
      throw new AiResponseParseError(`${key}[${index}] must be a string.`);
    }

    return item.trim();
  });
}

function requireBasis(value: Record<string, unknown>, key: string): AnalysisBasis {
  const fieldValue = value[key];

  if (fieldValue === "observed" || fieldValue === "inferred") {
    return fieldValue;
  }

  throw new AiResponseParseError(`${key} must be observed or inferred.`);
}

function requireSeverity(
  value: Record<string, unknown>,
  key: string,
): ObservationSeverity {
  const fieldValue = value[key];

  if (fieldValue === "low" || fieldValue === "medium" || fieldValue === "high") {
    return fieldValue;
  }

  throw new AiResponseParseError(`${key} must be low, medium, or high.`);
}

function requirePriority(
  value: Record<string, unknown>,
  key: string,
): RecommendationPriority {
  const fieldValue = value[key];

  if (fieldValue === "low" || fieldValue === "medium" || fieldValue === "high") {
    return fieldValue;
  }

  throw new AiResponseParseError(`${key} must be low, medium, or high.`);
}
