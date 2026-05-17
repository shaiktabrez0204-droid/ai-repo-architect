import "server-only";

import type { AiPrompt } from "./provider";
import type { AnalysisStageDefinition, AnalysisStageId } from "./stages";
import { ANALYSIS_STAGE_DEFINITIONS } from "./stages";
import type { PreparedAnalysisContext } from "./context";

export interface PromptBuildInput<TStageId extends AnalysisStageId> {
  stage: AnalysisStageDefinition<TStageId>;
  context: PreparedAnalysisContext;
}

export function buildStagePrompt<TStageId extends AnalysisStageId>(
  input: PromptBuildInput<TStageId>,
): AiPrompt {
  const systemSections = [
    "You are an architecture analysis assistant.",
    "Use only the provided repository profile and selected file excerpts.",
    "Treat repository profile data as observed facts.",
    "Treat any interpretation beyond explicit facts as inferred and label it that way.",
    "Do not claim to have inspected files that are not present in the context.",
    "Do not invent frameworks, files, commands, dependencies, environment variables, routes, or deployment targets.",
    "Do not suggest running repository code or installing dependencies as part of analysis.",
    "Keep output concise and directly grounded in evidence.",
    "Return structured JSON matching the requested output contract.",
  ];
  const userSections = [
    stageSection(input.stage),
    profileSection(input.context),
    fileSection(input.context),
    omittedFileSection(input.context),
  ];
  const system = systemSections.join("\n");
  const user = userSections.filter(Boolean).join("\n\n");

  return {
    system,
    user,
    estimatedBytes: Buffer.byteLength(`${system}\n${user}`, "utf8"),
  };
}

export function getStageDefinition<TStageId extends AnalysisStageId>(
  stageId: TStageId,
): AnalysisStageDefinition<TStageId> {
  return ANALYSIS_STAGE_DEFINITIONS[stageId];
}

function stageSection(stage: AnalysisStageDefinition<AnalysisStageId>): string {
  return [
    `Stage: ${stage.title}`,
    `Objective: ${stage.objective}`,
    `Output contract: ${stage.outputContract}`,
  ].join("\n");
}

function profileSection(context: PreparedAnalysisContext): string {
  return [
    "Repository profile:",
    JSON.stringify(compactProfile(context), null, 2),
  ].join("\n");
}

function fileSection(context: PreparedAnalysisContext): string {
  if (context.files.length === 0) {
    return "Selected file excerpts: none";
  }

  return [
    "Selected file excerpts:",
    ...context.files.map((file) =>
      [
        `Path: ${file.path}`,
        `Category: ${file.category}`,
        `Bytes: ${file.includedBytes}/${file.originalBytes}`,
        "Content:",
        file.excerpt,
      ].join("\n"),
    ),
  ].join("\n\n");
}

function omittedFileSection(context: PreparedAnalysisContext): string {
  if (context.omittedFiles.length === 0) {
    return "";
  }

  return [
    "Omitted context files:",
    JSON.stringify(context.omittedFiles, null, 2),
  ].join("\n");
}

function compactProfile(context: PreparedAnalysisContext) {
  const profile = context.profile;

  return {
    repository: profile.metadata.repository,
    ecosystem: profile.ecosystem,
    frameworks: profile.frameworks,
    scripts: profile.scripts,
    configs: profile.configs,
    structure: profile.structure,
    router: profile.router,
    tooling: profile.tooling,
    architecturalHints: profile.architecturalHints,
    profileWarnings: profile.profileWarnings,
    context: {
      estimatedBytes: context.estimatedBytes,
      fileCount: context.files.length,
      omittedFileCount: context.omittedFiles.length,
    },
  };
}
