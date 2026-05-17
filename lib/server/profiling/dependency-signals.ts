import "server-only";

import type {
  DependencyGroupName,
  DependencySignal,
  FrameworkSignal,
  ScriptSignal,
  ToolingProfile,
} from "@/lib/shared/repository-profile-types";
import type { ParsedPackageJson } from "./package-json";

const FRAMEWORK_DEPENDENCIES = new Map<string, string>([
  ["next", "Next.js"],
  ["react", "React"],
  ["vue", "Vue"],
  ["@angular/core", "Angular"],
  ["svelte", "Svelte"],
  ["astro", "Astro"],
  ["@remix-run/react", "Remix"],
  ["express", "Express"],
  ["fastify", "Fastify"],
  ["@nestjs/core", "NestJS"],
]);

const TESTING_DEPENDENCIES = new Set([
  "jest",
  "vitest",
  "mocha",
  "playwright",
  "@playwright/test",
  "cypress",
  "@testing-library/react",
  "@testing-library/jest-dom",
]);

const LINTING_DEPENDENCIES = new Set([
  "eslint",
  "eslint-config-next",
  "typescript-eslint",
  "@typescript-eslint/eslint-plugin",
  "@typescript-eslint/parser",
  "biome",
  "oxlint",
]);

const FORMATTING_DEPENDENCIES = new Set(["prettier", "biome"]);

const BUILD_DEPENDENCIES = new Set([
  "typescript",
  "vite",
  "webpack",
  "turbo",
  "tsup",
  "rollup",
  "esbuild",
  "tailwindcss",
  "@tailwindcss/postcss",
]);

const DEPLOYMENT_DEPENDENCIES = new Set([
  "vercel",
  "netlify-cli",
  "@netlify/plugin-nextjs",
]);

export function profileDependencies(
  packageJson: ParsedPackageJson | null,
): DependencySignal[] {
  if (!packageJson) {
    return [];
  }

  const dependencies = [
    ...dependencyEntries(packageJson.dependencies, "runtime"),
    ...dependencyEntries(packageJson.optionalDependencies, "runtime"),
    ...dependencyEntries(packageJson.peerDependencies, "runtime"),
    ...dependencyEntries(packageJson.devDependencies, "development"),
  ];

  return dependencies
    .map((dependency) => ({
      ...dependency,
      group: classifyDependency(dependency.name, dependency.group),
    }))
    .sort((first, second) => first.name.localeCompare(second.name))
    .slice(0, 80);
}

export function detectFrameworks(
  dependencies: DependencySignal[],
  filePaths: string[],
): FrameworkSignal[] {
  const dependencyNames = new Set(dependencies.map((dependency) => dependency.name));
  const frameworks: FrameworkSignal[] = [];

  for (const [dependencyName, frameworkName] of FRAMEWORK_DEPENDENCIES) {
    if (!dependencyNames.has(dependencyName)) {
      continue;
    }

    const evidence = [`dependency:${dependencyName}`];

    if (frameworkName === "Next.js") {
      if (hasPath(filePaths, "next.config")) {
        evidence.push("next.config present");
      }
      if (filePaths.some(isAppRouterPath)) {
        evidence.push("app router paths present");
      }
      if (filePaths.some(isPagesRouterPath)) {
        evidence.push("pages router paths present");
      }
    }

    frameworks.push({
      name: frameworkName,
      confidence: evidence.length > 1 ? "high" : "medium",
      evidence,
    });
  }

  return frameworks;
}

export function profileScripts(packageJson: ParsedPackageJson | null): ScriptSignal[] {
  if (!packageJson) {
    return [];
  }

  return Object.entries(packageJson.scripts)
    .map(([name, command]) => ({
      name,
      command,
      category: categorizeScript(name, command),
    }))
    .sort((first, second) => first.name.localeCompare(second.name));
}

export function profileTooling(
  dependencies: DependencySignal[],
  scripts: ScriptSignal[],
  filePaths: string[],
): ToolingProfile {
  const names = new Set(dependencies.map((dependency) => dependency.name));
  const scriptCommands = scripts.map((script) => script.command).join(" ");

  return {
    linting: compactSignals([
      ...dependenciesInSet(names, LINTING_DEPENDENCIES),
      ...pathSignals(filePaths, ["eslint.config", ".eslintrc", "biome.json"]),
      ...scriptSignals(scripts, "lint"),
    ]),
    formatting: compactSignals([
      ...dependenciesInSet(names, FORMATTING_DEPENDENCIES),
      ...pathSignals(filePaths, ["prettier.config", ".prettierrc", "biome.json"]),
      ...scriptSignals(scripts, "format"),
    ]),
    testing: compactSignals([
      ...dependenciesInSet(names, TESTING_DEPENDENCIES),
      ...scriptSignals(scripts, "test"),
    ]),
    deployment: compactSignals([
      ...dependenciesInSet(names, DEPLOYMENT_DEPENDENCIES),
      ...pathSignals(filePaths, ["vercel.json", "netlify.toml"]),
      ...scriptSignals(scripts, "deploy"),
    ]),
    build: compactSignals([
      ...dependenciesInSet(names, BUILD_DEPENDENCIES),
      ...scriptSignals(scripts, "build"),
      scriptCommands.includes("next build") ? "next build" : null,
    ]),
  };
}

function dependencyEntries(
  dependencies: Record<string, string>,
  defaultGroup: DependencyGroupName,
): DependencySignal[] {
  return Object.entries(dependencies).map(([name, version]) => ({
    name,
    version,
    group: defaultGroup,
  }));
}

function classifyDependency(
  name: string,
  fallback: DependencyGroupName,
): DependencyGroupName {
  if (FRAMEWORK_DEPENDENCIES.has(name)) {
    return "framework";
  }
  if (TESTING_DEPENDENCIES.has(name)) {
    return "testing";
  }
  if (LINTING_DEPENDENCIES.has(name)) {
    return "linting";
  }
  if (FORMATTING_DEPENDENCIES.has(name)) {
    return "formatting";
  }
  if (DEPLOYMENT_DEPENDENCIES.has(name)) {
    return "deployment";
  }
  if (BUILD_DEPENDENCIES.has(name)) {
    return "build";
  }
  return fallback;
}

function categorizeScript(
  name: string,
  command: string,
): ScriptSignal["category"] {
  const lowerName = name.toLowerCase();
  const lowerCommand = command.toLowerCase();

  if (lowerName.includes("dev")) return "dev";
  if (lowerName.includes("build")) return "build";
  if (lowerName.includes("start")) return "start";
  if (lowerName.includes("test")) return "test";
  if (lowerName.includes("lint")) return "lint";
  if (lowerName.includes("format")) return "format";
  if (lowerName.includes("deploy")) return "deploy";
  if (lowerName.includes("generate") || lowerName.includes("codegen")) {
    return "generate";
  }
  if (lowerCommand.includes("eslint")) return "lint";
  if (lowerCommand.includes("prettier")) return "format";
  return "other";
}

function dependenciesInSet(names: Set<string>, known: Set<string>): string[] {
  return [...known].filter((name) => names.has(name)).map((name) => `dependency:${name}`);
}

function pathSignals(filePaths: string[], pathFragments: string[]): string[] {
  return filePaths
    .filter((path) =>
      pathFragments.some((fragment) => path.toLowerCase().includes(fragment)),
    )
    .slice(0, 8)
    .map((path) => `file:${path}`);
}

function scriptSignals(scripts: ScriptSignal[], category: ScriptSignal["category"]) {
  return scripts
    .filter((script) => script.category === category)
    .map((script) => `script:${script.name}`);
}

function compactSignals(signals: Array<string | null>): string[] {
  return [...new Set(signals.filter((signal): signal is string => Boolean(signal)))]
    .sort()
    .slice(0, 12);
}

function hasPath(filePaths: string[], fragment: string): boolean {
  return filePaths.some((path) => path.toLowerCase().includes(fragment));
}

function isAppRouterPath(path: string): boolean {
  return /(?:^|\/)(?:src\/)?app\//i.test(path);
}

function isPagesRouterPath(path: string): boolean {
  return /(?:^|\/)(?:src\/)?pages\//i.test(path);
}
