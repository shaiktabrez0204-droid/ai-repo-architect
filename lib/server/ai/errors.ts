import "server-only";

import type { ApiErrorCode, JsonRecord } from "@/lib/shared/api-types";
import type { AnalysisStageId } from "@/lib/shared/analysis-types";

export type AiExecutionErrorCode = Extract<
  ApiErrorCode,
  | "AI_PROVIDER_TIMEOUT"
  | "AI_PROVIDER_RATE_LIMITED"
  | "AI_PROVIDER_ERROR"
  | "AI_RESPONSE_BLOCKED"
  | "AI_RESPONSE_EMPTY"
  | "AI_RESPONSE_INVALID"
>;

export class AiExecutionError extends Error {
  readonly code: AiExecutionErrorCode;
  readonly status: number;
  readonly stageId?: AnalysisStageId;
  readonly details?: JsonRecord;

  constructor(input: {
    code: AiExecutionErrorCode;
    message: string;
    status: number;
    stageId?: AnalysisStageId;
    details?: JsonRecord;
  }) {
    super(input.message);
    this.name = "AiExecutionError";
    this.code = input.code;
    this.status = input.status;
    this.stageId = input.stageId;
    this.details = input.details;
    Object.setPrototypeOf(this, AiExecutionError.prototype);
  }
}
