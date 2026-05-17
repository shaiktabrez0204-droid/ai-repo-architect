import "server-only";

import type {
  RepositoryMetadata,
  RepositoryTreeEntry,
} from "@/lib/shared/repository-ingestion-types";
import type { RepositoryReference } from "@/lib/shared/analysis-types";
import { GitHubIngestionError } from "./errors";

interface GitHubRepositoryApiResponse {
  name?: unknown;
  full_name?: unknown;
  html_url?: unknown;
  description?: unknown;
  homepage?: unknown;
  default_branch?: unknown;
  private?: unknown;
  fork?: unknown;
  archived?: unknown;
  disabled?: unknown;
  visibility?: unknown;
  stargazers_count?: unknown;
  forks_count?: unknown;
  open_issues_count?: unknown;
  pushed_at?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
  size?: unknown;
  language?: unknown;
  topics?: unknown;
}

interface GitHubTreeApiResponse {
  tree?: unknown;
  truncated?: unknown;
}

interface GitHubTreeApiEntry {
  path?: unknown;
  type?: unknown;
  size?: unknown;
  sha?: unknown;
}

interface GitHubContentApiResponse {
  type?: unknown;
  encoding?: unknown;
  content?: unknown;
  size?: unknown;
}

const GITHUB_API_BASE_URL = "https://api.github.com";
const GITHUB_API_VERSION = "2022-11-28";

export interface GitHubTreeFetchResult {
  entries: RepositoryTreeEntry[];
  truncated: boolean;
}

export async function fetchRepositoryMetadata(
  repository: RepositoryReference,
): Promise<RepositoryMetadata> {
  const payload = await fetchGitHubJson<GitHubRepositoryApiResponse>(
    `/repos/${repository.owner}/${repository.name}`,
    {
      notFoundCode: "GITHUB_REPOSITORY_NOT_FOUND",
      notFoundMessage:
        "GitHub repository was not found or is not publicly accessible.",
    },
  );

  return parseRepositoryMetadata(repository, payload);
}

export async function fetchRepositoryTree(
  repository: RepositoryReference,
  branch: string,
): Promise<GitHubTreeFetchResult> {
  const encodedBranch = encodeURIComponent(branch);
  const payload = await fetchGitHubJson<GitHubTreeApiResponse>(
    `/repos/${repository.owner}/${repository.name}/git/trees/${encodedBranch}?recursive=1`,
    {
      notFoundCode: "GITHUB_BRANCH_NOT_FOUND",
      notFoundMessage:
        "GitHub repository branch was not found or is not publicly accessible.",
    },
  );

  if (!Array.isArray(payload.tree)) {
    throw new GitHubIngestionError(
      "GITHUB_RESPONSE_INVALID",
      "GitHub tree response did not include a tree array.",
      502,
    );
  }

  return {
    entries: payload.tree.flatMap(parseTreeEntry),
    truncated: payload.truncated === true,
  };
}

export async function fetchRepositoryFileContent(
  repository: RepositoryReference,
  path: string,
  branch: string,
): Promise<string | null> {
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const encodedRef = encodeURIComponent(branch);
  const payload = await fetchGitHubJson<GitHubContentApiResponse>(
    `/repos/${repository.owner}/${repository.name}/contents/${encodedPath}?ref=${encodedRef}`,
    {
      notFoundCode: "GITHUB_API_ERROR",
      notFoundMessage: "Selected repository file was not found.",
      allowNotFound: true,
    },
  );

  if (payload === null) {
    return null;
  }

  if (payload.type !== "file") {
    return null;
  }

  if (payload.encoding !== "base64" || typeof payload.content !== "string") {
    throw new GitHubIngestionError(
      "GITHUB_RESPONSE_INVALID",
      "GitHub file response did not include base64 file content.",
      502,
      { path },
    );
  }

  return Buffer.from(payload.content.replace(/\s/g, ""), "base64").toString(
    "utf8",
  );
}

async function fetchGitHubJson<T>(
  path: string,
  options: {
    notFoundCode:
      | "GITHUB_REPOSITORY_NOT_FOUND"
      | "GITHUB_BRANCH_NOT_FOUND"
      | "GITHUB_API_ERROR";
    notFoundMessage: string;
    allowNotFound?: false;
  },
): Promise<T>;
async function fetchGitHubJson<T>(
  path: string,
  options: {
    notFoundCode:
      | "GITHUB_REPOSITORY_NOT_FOUND"
      | "GITHUB_BRANCH_NOT_FOUND"
      | "GITHUB_API_ERROR";
    notFoundMessage: string;
    allowNotFound: true;
  },
): Promise<T | null>;
async function fetchGitHubJson<T>(
  path: string,
  options: {
    notFoundCode:
      | "GITHUB_REPOSITORY_NOT_FOUND"
      | "GITHUB_BRANCH_NOT_FOUND"
      | "GITHUB_API_ERROR";
    notFoundMessage: string;
    allowNotFound?: boolean;
  },
): Promise<T | null> {
  const response = await fetch(`${GITHUB_API_BASE_URL}${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "ai-repo-architect",
      "X-GitHub-Api-Version": GITHUB_API_VERSION,
    },
    cache: "no-store",
  });

  if (isRateLimited(response)) {
    throw new GitHubIngestionError(
      "GITHUB_RATE_LIMITED",
      "GitHub API rate limit was reached. Retry after the reset time.",
      429,
      rateLimitDetails(response),
    );
  }

  if (response.status === 404) {
    if (options.allowNotFound) {
      return null;
    }

    throw new GitHubIngestionError(
      options.notFoundCode,
      options.notFoundMessage,
      404,
    );
  }

  if (!response.ok) {
    throw new GitHubIngestionError(
      "GITHUB_API_ERROR",
      "GitHub API returned an unexpected error.",
      response.status,
      {
        githubStatus: response.status,
        githubRequest: path,
      },
    );
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new GitHubIngestionError(
      "GITHUB_RESPONSE_INVALID",
      "GitHub API returned invalid JSON.",
      502,
      { githubRequest: path },
    );
  }
}

function parseRepositoryMetadata(
  repository: RepositoryReference,
  payload: GitHubRepositoryApiResponse,
): RepositoryMetadata {
  if (payload.private === true) {
    throw new GitHubIngestionError(
      "GITHUB_REPOSITORY_PRIVATE",
      "Private GitHub repositories are not supported in V1.",
      403,
    );
  }

  if (typeof payload.default_branch !== "string") {
    throw new GitHubIngestionError(
      "GITHUB_RESPONSE_INVALID",
      "GitHub repository response did not include a default branch.",
      502,
    );
  }

  return {
    repository: {
      ...repository,
      url:
        typeof payload.html_url === "string" ? payload.html_url : repository.url,
    },
    defaultBranch: payload.default_branch,
    description:
      typeof payload.description === "string" ? payload.description : null,
    homepageUrl: typeof payload.homepage === "string" ? payload.homepage : null,
    isFork: payload.fork === true,
    isArchived: payload.archived === true,
    isDisabled: payload.disabled === true,
    visibility: "public",
    stars:
      typeof payload.stargazers_count === "number"
        ? payload.stargazers_count
        : 0,
    forks: typeof payload.forks_count === "number" ? payload.forks_count : 0,
    openIssues:
      typeof payload.open_issues_count === "number"
        ? payload.open_issues_count
        : 0,
    pushedAt: typeof payload.pushed_at === "string" ? payload.pushed_at : null,
    createdAt:
      typeof payload.created_at === "string" ? payload.created_at : null,
    updatedAt:
      typeof payload.updated_at === "string" ? payload.updated_at : null,
    sizeKb: typeof payload.size === "number" ? payload.size : 0,
    language: typeof payload.language === "string" ? payload.language : null,
    topics: Array.isArray(payload.topics)
      ? payload.topics.filter((topic): topic is string => typeof topic === "string")
      : [],
  };
}

function parseTreeEntry(entry: unknown): RepositoryTreeEntry[] {
  if (!isTreeEntry(entry)) {
    return [];
  }

  if (entry.type !== "blob" && entry.type !== "tree") {
    return [];
  }

  return [
    {
      path: entry.path,
      type: entry.type === "blob" ? "file" : "directory",
      size: typeof entry.size === "number" ? entry.size : null,
      sha: entry.sha,
    },
  ];
}

function isTreeEntry(entry: unknown): entry is GitHubTreeApiEntry & {
  path: string;
  type: "blob" | "tree";
  sha: string;
} {
  if (typeof entry !== "object" || entry === null) {
    return false;
  }

  const candidate = entry as GitHubTreeApiEntry;

  return (
    typeof candidate.path === "string" &&
    typeof candidate.type === "string" &&
    typeof candidate.sha === "string"
  );
}

function isRateLimited(response: Response): boolean {
  if (response.status !== 403 && response.status !== 429) {
    return false;
  }

  return (
    response.headers.get("x-ratelimit-remaining") === "0" ||
    response.headers.has("retry-after")
  );
}

function rateLimitDetails(response: Response) {
  return {
    retryAfter: response.headers.get("retry-after"),
    resetAt: response.headers.get("x-ratelimit-reset"),
    remaining: response.headers.get("x-ratelimit-remaining"),
  };
}
