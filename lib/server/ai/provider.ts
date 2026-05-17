import "server-only";

import type {
  AiProviderName,
} from "@/lib/shared/analysis-types";

import type {
  AnalysisStageId,
} from "./stages";

export interface AiPrompt {
  system: string;

  user: string;

  estimatedBytes: number;
}

export interface AiProviderRequest {
  stageId: AnalysisStageId;

  prompt: AiPrompt;

  maxOutputTokens: number;
}

export interface AiProviderRawResponse {
  provider: AiProviderName;

  model: string;

  text: string;

  usage: {
    promptTokens: number | null;

    outputTokens: number | null;

    totalTokens: number | null;
  };
}

export interface AiProvider {
  readonly name: AiProviderName;

  execute(
    request: AiProviderRequest,
  ): Promise<AiProviderRawResponse>;
}

export type OpenRouterAnalysisProvider =
  AiProvider & {
    readonly name: "openrouter";
  };