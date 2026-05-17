import "server-only";

import type { ArchitectureReport } from "@/lib/shared/analysis-types";
import type {
  AnalysisContextSummary,
  AnalysisStageSummary,
} from "@/lib/shared/api-types";
import type { SelectedRepositoryFile } from "@/lib/shared/repository-ingestion-types";
import type { RepositoryProfile } from "@/lib/shared/repository-profile-types";
import type { AiProvider, AiProviderRawResponse } from "./provider";
import type { AiResponseParser } from "./response-parser";
import { AiResponseParseError } from "./response-parser";
import type { AnalysisStageDefinition, AnalysisStageId } from "./stages";
import { ANALYSIS_STAGE_DEFINITIONS } from "./stages";
import { prepareAnalysisContext } from "./context";
import type { PreparedAnalysisContext } from "./context";
import { buildStagePrompt } from "./prompt-builder";
import { AiExecutionError } from "./errors";
import {
  architectureOverviewParser,
  codeSmellReviewParser,
  composeArchitectureReport,
  dependencyAnalysisParser,
  folderExplanationParser,
  readmeGenerationParser,
  recommendationsParser,
} from "./stage-parsers";

export interface RunAnalysisStageInput<TStageId extends AnalysisStageId, TOutput> {
  provider: AiProvider;
  stage: AnalysisStageDefinition<TStageId>;
  profile: RepositoryProfile;
  selectedFiles: SelectedRepositoryFile[];
  parser: AiResponseParser<TOutput>;
}

export async function runAnalysisStage<TStageId extends AnalysisStageId, TOutput>(
  input: RunAnalysisStageInput<TStageId, TOutput>,
): Promise<TOutput> {
  const context = prepareAnalysisContext({
    profile: input.profile,
    selectedFiles: input.selectedFiles,
  });

  return executeStage({
    provider: input.provider,
    stage: input.stage,
    context,
    parser: input.parser,
    summaries: [],
  });
}

export interface ArchitectureAnalysisResult {
  report: ArchitectureReport;
  context: AnalysisContextSummary;
  stages: AnalysisStageSummary[];
}

export async function runArchitectureAnalysis(input: {
  provider: AiProvider;
  profile: RepositoryProfile;
  selectedFiles: SelectedRepositoryFile[];
}): Promise<ArchitectureAnalysisResult> {
  const context = prepareAnalysisContext({
    profile: input.profile,
    selectedFiles: input.selectedFiles,
  });
  const stages: AnalysisStageSummary[] = [];

  const overview = await executeStage({
    provider: input.provider,
    stage: ANALYSIS_STAGE_DEFINITIONS["architecture-overview"],
    context,
    parser: architectureOverviewParser,
    summaries: stages,
  });
  const dependencyAnalysis = await executeStage({
    provider: input.provider,
    stage: ANALYSIS_STAGE_DEFINITIONS["dependency-analysis"],
    context,
    parser: dependencyAnalysisParser,
    summaries: stages,
  });
  const folderExplanation = await executeStage({
    provider: input.provider,
    stage: ANALYSIS_STAGE_DEFINITIONS["folder-explanation"],
    context,
    parser: folderExplanationParser,
    summaries: stages,
  });
  const codeSmellReview = await executeStage({
    provider: input.provider,
    stage: ANALYSIS_STAGE_DEFINITIONS["code-smell-review"],
    context,
    parser: codeSmellReviewParser,
    summaries: stages,
  });
  const recommendations = await executeStage({
    provider: input.provider,
    stage: ANALYSIS_STAGE_DEFINITIONS.recommendations,
    context,
    parser: recommendationsParser,
    summaries: stages,
  });
  const readme = await executeStage({
    provider: input.provider,
    stage: ANALYSIS_STAGE_DEFINITIONS["readme-generation"],
    context,
    parser: readmeGenerationParser,
    summaries: stages,
  });

  return {
    report: composeArchitectureReport({
      overview,
      dependencyAnalysis,
      folderExplanation,
      codeSmellReview,
      recommendations,
      readme,
    }),
    context: summarizeContext(context),
    stages,
  };
}

async function executeStage<TStageId extends AnalysisStageId, TOutput>(input: {
  provider: AiProvider;
  stage: AnalysisStageDefinition<TStageId>;
  context: PreparedAnalysisContext;
  parser: AiResponseParser<TOutput>;
  summaries: AnalysisStageSummary[];
}): Promise<TOutput> {
  const prompt = buildStagePrompt({
    stage: input.stage,
    context: input.context,
  });
  const response = await input.provider.execute({
    stageId: input.stage.id,
    prompt,
    maxOutputTokens: input.stage.maxOutputTokens,
  });

  input.summaries.push(stageSummary(input.stage.id, prompt.estimatedBytes, response));

  try {
    return input.parser.parse(response.text);
  } catch (error) {
    if (error instanceof AiResponseParseError) {
      throw new AiExecutionError({
        code: "AI_RESPONSE_INVALID",
        message: error.message,
        status: 502,
        stageId: input.stage.id,
      });
    }

    throw error;
  }
}

function stageSummary(
  stageId: AnalysisStageId,
  promptEstimatedBytes: number,
  response: AiProviderRawResponse,
): AnalysisStageSummary {
  return {
    stageId,
    model: response.model,
    promptEstimatedBytes,
    promptTokens: response.usage.promptTokens,
    outputTokens: response.usage.outputTokens,
    totalTokens: response.usage.totalTokens,
  };
}

function summarizeContext(context: PreparedAnalysisContext): AnalysisContextSummary {
  return {
    estimatedBytes: context.estimatedBytes,
    includedFileCount: context.files.length,
    omittedFileCount: context.omittedFiles.length,
    truncatedFiles: context.files
      .filter((file) => file.truncated)
      .map((file) => file.path),
    omittedFiles: context.omittedFiles,
    limits: context.limits,
  };
}
