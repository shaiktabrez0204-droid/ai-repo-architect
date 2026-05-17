import "server-only";

export interface ServerEnv {
  geminiApiKey: string;
  geminiModel: string;
  geminiTimeoutMs: number;
}

export class EnvValidationError extends Error {
  readonly missingKeys: string[];

  constructor(missingKeys: string[]) {
    super(`Missing required environment variables: ${missingKeys.join(", ")}`);
    this.name = "EnvValidationError";
    this.missingKeys = missingKeys;
    Object.setPrototypeOf(this, EnvValidationError.prototype);
  }
}

export function getServerEnv(): ServerEnv {
  const missingKeys: string[] = [];
  const geminiApiKey = process.env.GEMINI_API_KEY?.trim() ?? "";
  const geminiModel = process.env.GEMINI_MODEL?.trim() || "gemini-1.5-flash";
  const geminiTimeoutMs = readPositiveIntegerEnv("GEMINI_TIMEOUT_MS", 45_000);

  if (!geminiApiKey) {
    missingKeys.push("GEMINI_API_KEY");
  }

  if (missingKeys.length > 0) {
    throw new EnvValidationError(missingKeys);
  }

  return {
    geminiApiKey,
    geminiModel,
    geminiTimeoutMs,
  };
}

function readPositiveIntegerEnv(name: string, fallback: number): number {
  const rawValue = process.env[name]?.trim();

  if (!rawValue) {
    return fallback;
  }

  const parsedValue = Number.parseInt(rawValue, 10);

  return Number.isFinite(parsedValue) && parsedValue > 0
    ? parsedValue
    : fallback;
}
