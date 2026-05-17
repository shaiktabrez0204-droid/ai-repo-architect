import "server-only";

import OpenAI from "openai";

import type {
  AiProvider,
  AiProviderRawResponse,
  AiProviderRequest,
} from "./provider";

import { AiExecutionError } from "./errors";

export class OpenRouterProvider implements AiProvider {
  readonly name = "openrouter";

  private readonly client: OpenAI;

  private readonly model: string;

  constructor(apiKey: string, model: string) {
    this.model = model;

    this.client = new OpenAI({
      apiKey,

      baseURL: "https://openrouter.ai/api/v1",
    });
  }

  async execute(
    request: AiProviderRequest,
  ): Promise<AiProviderRawResponse> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,

        temperature: 0.2,

        max_tokens: request.maxOutputTokens,

        messages: [
          {
            role: "system",
            content: request.prompt.system,
          },

          {
            role: "user",
            content: request.prompt.user,
          },
        ],
      });

      const text = response.choices[0]?.message?.content?.trim();

      if (!text) {
        throw new AiExecutionError({
          code: "AI_RESPONSE_EMPTY",

          message: "OpenRouter returned empty content.",

          status: 502,

          stageId: request.stageId,
        });
      }

      return {
        provider: this.name,

        model: this.model,

        text,

        usage: {
          promptTokens: response.usage?.prompt_tokens ?? null,

          outputTokens: response.usage?.completion_tokens ?? null,

          totalTokens: response.usage?.total_tokens ?? null,
        },
      };
    } catch (error: any) {
      console.error("OPENROUTER ERROR:", error);

      throw new AiExecutionError({
        code: "AI_PROVIDER_ERROR",

        message: "OpenRouter request failed.",

        status: error?.status ?? 502,

        stageId: request.stageId,

        details: {
          providerMessage: error?.message ?? null,
        },
      });
    }
  }
}