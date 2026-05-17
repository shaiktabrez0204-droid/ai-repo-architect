import "server-only";

export interface ServerEnv {
  openRouterApiKey: string;

  openRouterModel: string;

  aiTimeoutMs: number;
}

export class EnvValidationError extends Error {
  readonly missingKeys: string[];

  constructor(missingKeys: string[]) {
    super(
      `Missing required environment variables: ${missingKeys.join(", ")}`,
    );

    this.name = "EnvValidationError";

    this.missingKeys = missingKeys;

    Object.setPrototypeOf(this, EnvValidationError.prototype);
  }
}

export function getServerEnv(): ServerEnv {
  const missingKeys: string[] = [];

  const openRouterApiKey =
    process.env.OPENROUTER_API_KEY?.trim() ?? "";

  const openRouterModel =
    process.env.OPENROUTER_MODEL?.trim() ||
    "deepseek/deepseek-chat-v3-0324:free";

  const aiTimeoutMs = readPositiveIntegerEnv(
    "AI_TIMEOUT_MS",
    45_000,
  );

  if (!openRouterApiKey) {
    missingKeys.push("OPENROUTER_API_KEY");
  }

  if (missingKeys.length > 0) {
    throw new EnvValidationError(missingKeys);
  }

  return {
    openRouterApiKey,

    openRouterModel,

    aiTimeoutMs,
  };
}

function readPositiveIntegerEnv(
  name: string,
  fallback: number,
): number {
  const rawValue = process.env[name]?.trim();

  if (!rawValue) {
    return fallback;
  }

  const parsedValue = Number.parseInt(rawValue, 10);

  return Number.isFinite(parsedValue) && parsedValue > 0
    ? parsedValue
    : fallback;
}