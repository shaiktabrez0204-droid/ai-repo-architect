import "server-only";

export interface AiResponseParser<TOutput> {
  parse(rawText: string): TOutput;
}

export interface ParsedAiResponse<TOutput> {
  output: TOutput;
  warnings: string[];
}

export class AiResponseParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiResponseParseError";
    Object.setPrototypeOf(this, AiResponseParseError.prototype);
  }
}
