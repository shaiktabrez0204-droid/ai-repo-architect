import "server-only";

import { ANALYSIS_LIMITS } from "@/lib/shared/analysis-constants";
import type { JsonRecord } from "@/lib/shared/api-types";
import type { RepositoryReference } from "@/lib/shared/analysis-types";

type ValidationFailure = {
  ok: false;
  message: string;
  details?: JsonRecord;
};

export type GitHubRepositoryUrlValidationResult =
  | {
      ok: true;
      repository: RepositoryReference;
    }
  | ValidationFailure;

export type GitHubBranchValidationResult =
  | {
      ok: true;
      branch: string;
    }
  | ValidationFailure;

const OWNER_PATTERN =
  /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;

const REPOSITORY_NAME_PATTERN = /^[A-Za-z0-9_.-]{1,100}$/;

const DISALLOWED_BRANCH_PATTERN = /[\u0000-\u001f\u007f ~^:?*[\]\\]/;

export function parseGitHubRepositoryUrl(
  repositoryUrl: string,
): GitHubRepositoryUrlValidationResult {
  const trimmedUrl = repositoryUrl.trim();

  if (!trimmedUrl) {
    return invalidGitHubUrl("Repository URL is required.");
  }

  if (trimmedUrl.length > ANALYSIS_LIMITS.maxRepositoryUrlLength) {
    return invalidGitHubUrl("Repository URL is too long.", {
      maxLength: ANALYSIS_LIMITS.maxRepositoryUrlLength,
    });
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(trimmedUrl);
  } catch {
    return invalidGitHubUrl(
      "Repository URL must be a valid HTTPS GitHub URL.",
    );
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  if (parsedUrl.protocol !== "https:" || !isAllowedGitHubHost(hostname)) {
    return invalidGitHubUrl(
      "Only HTTPS URLs from github.com are supported.",
      { host: parsedUrl.hostname || null },
    );
  }

  if (parsedUrl.search || parsedUrl.hash) {
    return invalidGitHubUrl(
      "Use the repository root URL without query strings or fragments.",
    );
  }

  const pathSegments = parsePathSegments(parsedUrl.pathname);

  if (pathSegments.length !== 2) {
    return invalidGitHubUrl(
      "Use a GitHub repository root URL in the form https://github.com/owner/repo.",
    );
  }

  const [owner, rawName] = pathSegments;
  const repositoryName = rawName.endsWith(".git")
    ? rawName.slice(0, -".git".length)
    : rawName;

  if (!OWNER_PATTERN.test(owner)) {
    return invalidGitHubUrl("GitHub owner name is not valid.", { owner });
  }

  if (
    !REPOSITORY_NAME_PATTERN.test(repositoryName) ||
    repositoryName === "." ||
    repositoryName === ".."
  ) {
    return invalidGitHubUrl("GitHub repository name is not valid.", {
      repository: repositoryName,
    });
  }

  return {
    ok: true,
    repository: {
      host: "github.com",
      owner,
      name: repositoryName,
      url: `https://github.com/${owner}/${repositoryName}`,
    },
  };
}

export function validateGitHubBranchName(
  branch: string,
): GitHubBranchValidationResult {
  const trimmedBranch = branch.trim();

  if (!trimmedBranch) {
    return {
      ok: false,
      message: "Branch name cannot be empty.",
    };
  }

  if (trimmedBranch.length > ANALYSIS_LIMITS.maxBranchNameLength) {
    return {
      ok: false,
      message: "Branch name is too long.",
      details: { maxLength: ANALYSIS_LIMITS.maxBranchNameLength },
    };
  }

  if (
    trimmedBranch.startsWith("/") ||
    trimmedBranch.endsWith("/") ||
    trimmedBranch.endsWith(".") ||
    trimmedBranch.includes("..") ||
    trimmedBranch.includes("@{") ||
    DISALLOWED_BRANCH_PATTERN.test(trimmedBranch)
  ) {
    return {
      ok: false,
      message: "Branch name is not a valid Git reference name.",
      details: { branch: trimmedBranch },
    };
  }

  return {
    ok: true,
    branch: trimmedBranch,
  };
}

function isAllowedGitHubHost(hostname: string): boolean {
  return hostname === "github.com" || hostname === "www.github.com";
}

function parsePathSegments(pathname: string): string[] {
  try {
    return pathname
      .split("/")
      .filter(Boolean)
      .map((segment) => decodeURIComponent(segment));
  } catch {
    return [];
  }
}

function invalidGitHubUrl(
  message: string,
  details?: JsonRecord,
): GitHubRepositoryUrlValidationResult {
  return {
    ok: false,
    message,
    details,
  };
}
