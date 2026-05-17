import "server-only";

import {
  GoogleGenerativeAI,
  GoogleGenerativeAIAbortError,
  GoogleGenerativeAIFetchError,
  GoogleGenerativeAIResponseError,
} from "@google/generative-ai";

import type { GenerateContentResult } from "@google/generative-ai";

import type {
  AiProvider,
  AiProviderRawResponse,
  AiProviderRequest,
} from "./provider";

import { AiExecutionError } from "./errors";

export interface GeminiProviderConfig {
  apiKey: string;
  model: string;
  timeoutMs: number;
}

export class GeminiProvider implements AiProvider {
  readonly name = "gemini";

  private readonly config: GeminiProviderConfig;

  private readonly client: GoogleGenerativeAI;

  constructor(config: GeminiProviderConfig) {
    this.config = config;

    this.client = new GoogleGenerativeAI(config.apiKey);
  }

  async execute(
    request: AiProviderRequest,
  ): Promise<AiProviderRawResponse> {
    const model = this.client.getGenerativeModel(
      {
        model: this.config.model,

        systemInstruction: request.prompt.system,

        generationConfig: {
          candidateCount: 1,
          maxOutputTokens: request.maxOutputTokens,
          temperature: 0.2,
          topP: 0.8,
        },
      },

      {
        timeout: this.config.timeoutMs,
        apiClient: "ai-repo-architect",
      },
    );

    let result: GenerateContentResult;

    try {
      console.log("ABOUT TO CALL GEMINI");

      result = await model.generateContent({
        contents: [
          {
            role: "user",

            parts: [
              {
                text: request.prompt.user,
              },
            ],
          },
        ],
      });

      console.log("GEMINI RESPONSE RECEIVED");
    } catch (error) {
      console.error("GEMINI ERROR:", error);

      throw mapGeminiError(error, request);
    }

    if (result.response.promptFeedback?.blockReason) {
      throw new AiExecutionError({
        code: "AI_RESPONSE_BLOCKED",

        message: "Gemini blocked the prompt for this analysis stage.",

        status: 502,

        stageId: request.stageId,

        details: {
          blockReason: result.response.promptFeedback.blockReason,

          blockReasonMessage:
            result.response.promptFeedback.blockReasonMessage ?? null,
        },
      });
    }

    let text: string;

    try {
      text = result.response.text().trim();
    } catch (error) {
      console.error("GEMINI TEXT ERROR:", error);

      throw mapGeminiError(error, request);
    }

    if (!text) {
      throw new AiExecutionError({
        code: "AI_RESPONSE_EMPTY",

        message:
          "Gemini returned an empty response for this analysis stage.",

        status: 502,

        stageId: request.stageId,
      });
    }

    const usage = result.response.usageMetadata;

    return {
      provider: this.name,

      model: this.config.model,

      text,

      usage: {
        promptTokens: usage?.promptTokenCount ?? null,

        outputTokens: usage?.candidatesTokenCount ?? null,

        totalTokens: usage?.totalTokenCount ?? null,
      },
    };
  }
}

function mapGeminiError(
  error: unknown,
  request: AiProviderRequest,
): AiExecutionError {
  if (error instanceof AiExecutionError) {
    return error;
  }

  if (error instanceof GoogleGenerativeAIAbortError) {
    return new AiExecutionError({
      code: "AI_PROVIDER_TIMEOUT",

      message: "Gemini request timed out for this analysis stage.",

      status: 504,

      stageId: request.stageId,

      details: {
        promptEstimatedBytes: request.prompt.estimatedBytes,
      },
    });
  }

  if (error instanceof GoogleGenerativeAIFetchError) {
    const status = error.status ?? 502;

    return new AiExecutionError({
      code:
        status === 429
          ? "AI_PROVIDER_RATE_LIMITED"
          : "AI_PROVIDER_ERROR",

      message:
        status === 429
          ? "Gemini rate limit was reached."
          : "Gemini returned an upstream provider error.",

      status: status === 429 ? 429 : 502,

      stageId: request.stageId,

      details: {
        providerStatus: status,

        providerStatusText: error.statusText ?? null,
      },
    });
  }

  if (error instanceof GoogleGenerativeAIResponseError) {
    return new AiExecutionError({
      code: "AI_RESPONSE_BLOCKED",

      message: "Gemini response was blocked or unavailable.",

      status: 502,

      stageId: request.stageId,
    });
  }

  return new AiExecutionError({
    code: "AI_PROVIDER_ERROR",

    message: "Gemini request failed unexpectedly.",

    status: 502,

    stageId: request.stageId,
  });
}