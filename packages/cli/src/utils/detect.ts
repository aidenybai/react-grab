import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { detect } from "@antfu/ni";
import ignore from "ignore";

export type PackageManager = "npm" | "yarn" | "pnpm" | "bun";
export type Framework = "next" | "vite" | "tanstack" | "webpack" | "unknown";
export type NextRouterType = "app" | "pages" | "unknown";
export type UnsupportedFramework =
  | "remix"
  | "astro"
  | "sveltekit"
  | "gatsby"
  | null;

export interface ProjectInfo {
  packageManager: PackageManager;
  framework: Framework;
  nextRouterType: NextRouterType;
  isMonorepo: boolean;
  projectRoot: string;
  hasReactGrab: boolean;
  installedAgents: string[];
  unsupportedFramework: UnsupportedFramework;
}

const VALID_PACKAGE_MANAGERS: ReadonlySet<string> = new Set([
  "npm",
  "yarn",
  "pnpm",
  "bun",
]);

export const detectPackageManager = async (
  projectRoot: string,
): Promise<PackageManager> => {
  const detected = await detect({ cwd: projectRoot });
  if (detected) {
    // @antfu/ni returns versioned agents like "pnpm@6" or "yarn@berry"
    const managerName = detected.split("@")[0];
    if (VALID_PACKAGE_MANAGERS.has(managerName)) {
      return managerName as PackageManager;
    }
  }
  return "npm";
};

export const detectFramework = (projectRoot: string): Framework => {
  const packageJsonPath = join(projectRoot, "package.json");

  if (!existsSync(packageJsonPath)) {
    return "unknown";
  }

  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
    const allDependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    if (allDependencies["next"]) {
      return "next";
    }

    if (allDependencies["@tanstack/react-start"]) {
      return "tanstack";
    }

    if (allDependencies["vite"]) {
      return "vite";
    }

    if (allDependencies["webpack"]) {
      return "webpack";
    }

    return "unknown";
  } catch {
    return "unknown";
  }
};

export const detectNextRouterType = (projectRoot: string): NextRouterType => {
  const hasAppDir = existsSync(join(projectRoot, "app"));
  const hasSrcAppDir = existsSync(join(projectRoot, "src", "app"));
  const hasPagesDir = existsSync(join(projectRoot, "pages"));
  const hasSrcPagesDir = existsSync(join(projectRoot, "src", "pages"));

  if (hasAppDir || hasSrcAppDir) {
    return "app";
  }

  if (hasPagesDir || hasSrcPagesDir) {
    return "pages";
  }

  return "unknown";
};

export const detectMonorepo = (projectRoot: string): boolean => {
  if (existsSync(join(projectRoot, "pnpm-workspace.yaml"))) {
    return true;
  }

  if (existsSync(join(projectRoot, "lerna.json"))) {
    return true;
  }

  const packageJsonPath = join(projectRoot, "package.json");
  if (existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
      if (packageJson.workspaces) {
        return true;
      }
    } catch {
      return false;
    }
  }

  return false;
};

export interface WorkspaceProject {
  name: string;
  path: string;
  framework: Framework;
  hasReact: boolean;
}

const getWorkspacePatterns = (projectRoot: string): string[] => {
  const patterns: string[] = [];

  const pnpmWorkspacePath = join(projectRoot, "pnpm-workspace.yaml");
  if (existsSync(pnpmWorkspacePath)) {
    const content = readFileSync(pnpmWorkspacePath, "utf-8");
    const lines = content.split("\n");
    let inPackages = false;

    for (const line of lines) {
      if (line.match(/^packages:\s*$/)) {
        inPackages = true;
        continue;
      }
      if (inPackages) {
        if (line.match(/^[a-zA-Z]/) || line.trim() === "") {
          if (line.match(/^[a-zA-Z]/)) inPackages = false;
          continue;
        }
        const match = line.match(/^\s*-\s*['"]?([^'"#\n]+?)['"]?\s*$/);
        if (match) {
          patterns.push(match[1].trim());
        }
      }
    }
  }

  const lernaJsonPath = join(projectRoot, "lerna.json");
  if (existsSync(lernaJsonPath)) {
    try {
      const lernaJson = JSON.parse(readFileSync(lernaJsonPath, "utf-8"));
      if (Array.isArray(lernaJson.packages)) {
        patterns.push(...lernaJson.packages);
      }
    } catch {}
  }

  const packageJsonPath = join(projectRoot, "package.json");
  if (existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
      if (Array.isArray(packageJson.workspaces)) {
        patterns.push(...packageJson.workspaces);
      } else if (packageJson.workspaces?.packages) {
        patterns.push(...packageJson.workspaces.packages);
      }
    } catch {}
  }

  return [...new Set(patterns)];
};

const expandWorkspacePattern = (
  projectRoot: string,
  pattern: string,
): string[] => {
  const isGlob = pattern.endsWith("/*");
  const cleanPattern = pattern.replace(/\/\*$/, "");
  const basePath = join(projectRoot, cleanPattern);

  if (!existsSync(basePath)) return [];

  if (!isGlob) {
    const hasPackageJson = existsSync(join(basePath, "package.json"));
    return hasPackageJson ? [basePath] : [];
  }

  const results: string[] = [];
  try {
    const entries = readdirSync(basePath, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const packageJsonPath = join(basePath, entry.name, "package.json");
      if (existsSync(packageJsonPath)) {
        results.push(join(basePath, entry.name));
      }
    }
  } catch {
    return results;
  }
  return results;
};

const hasReactDependency = (projectPath: string): boolean => {
  const packageJsonPath = join(projectPath, "package.json");
  if (!existsSync(packageJsonPath)) return false;

  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };
    return Boolean(allDeps["react"] || allDeps["react-dom"]);
  } catch {
    return false;
  }
};

const buildReactProject = (projectPath: string): WorkspaceProject | null => {
  const framework = detectFramework(projectPath);
  const hasReact = hasReactDependency(projectPath);
  if (!hasReact && framework === "unknown") return null;

  let name = basename(projectPath);
  const packageJsonPath = join(projectPath, "package.json");
  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
    name = packageJson.name || name;
  } catch {}

  return { name, path: projectPath, framework, hasReact };
};

const findWorkspaceProjects = (projectRoot: string): WorkspaceProject[] => {
  const patterns = getWorkspacePatterns(projectRoot);
  const projects: WorkspaceProject[] = [];

  for (const pattern of patterns) {
    for (const projectPath of expandWorkspacePattern(projectRoot, pattern)) {
      const project = buildReactProject(projectPath);
      if (project) projects.push(project);
    }
  }

  return projects;
};

const ALWAYS_IGNORED_DIRECTORIES = [
  "node_modules",
  ".git",
  ".next",
  ".cache",
  ".turbo",
  "dist",
  "build",
  "coverage",
  "test-results",
];

const loadGitignore = (projectRoot: string): ReturnType<typeof ignore> => {
  const ignorer = ignore().add(ALWAYS_IGNORED_DIRECTORIES);
  const gitignorePath = join(projectRoot, ".gitignore");
  if (existsSync(gitignorePath)) {
    try {
      ignorer.add(readFileSync(gitignorePath, "utf-8"));
    } catch {}
  }
  return ignorer;
};

const scanDirectoryForProjects = (
  rootDirectory: string,
  ignorer: ReturnType<typeof ignore>,
  maxDepth: number,
  currentDepth: number = 0,
): WorkspaceProject[] => {
  if (currentDepth >= maxDepth) return [];
  if (!existsSync(rootDirectory)) return [];

  const projects: WorkspaceProject[] = [];

  try {
    const entries = readdirSync(rootDirectory, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (ignorer.ignores(entry.name)) continue;

      const entryPath = join(rootDirectory, entry.name);
      const hasPackageJson = existsSync(join(entryPath, "package.json"));

      if (hasPackageJson) {
        const project = buildReactProject(entryPath);
        if (project) {
          projects.push(project);
          continue;
        }
      }

      projects.push(
        ...scanDirectoryForProjects(
          entryPath,
          ignorer,
          maxDepth,
          currentDepth + 1,
        ),
      );
    }
  } catch {
    return projects;
  }

  return projects;
};

const MAX_SCAN_DEPTH = 2;

export const findReactProjects = (projectRoot: string): WorkspaceProject[] => {
  if (detectMonorepo(projectRoot)) {
    return findWorkspaceProjects(projectRoot);
  }
  const ignorer = loadGitignore(projectRoot);
  return scanDirectoryForProjects(projectRoot, ignorer, MAX_SCAN_DEPTH);
};

const hasReactGrabInFile = (filePath: string): boolean => {
  if (!existsSync(filePath)) return false;
  try {
    const content = readFileSync(filePath, "utf-8");
    const fuzzyPatterns = [
      /["'`][^"'`]*react-grab/,
      /react-grab[^"'`]*["'`]/,
      /<[^>]*react-grab/i,
      /import[^;]*react-grab/i,
      /require[^)]*react-grab/i,
      /from\s+[^;]*react-grab/i,
      /src[^>]*react-grab/i,
    ];
    return fuzzyPatterns.some((pattern) => pattern.test(content));
  } catch {
    return false;
  }
};

export const detectReactGrab = (projectRoot: string): boolean => {
  const packageJsonPath = join(projectRoot, "package.json");

  if (existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
      const allDependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };
      if (allDependencies["react-grab"]) {
        return true;
      }
    } catch {}
  }

  const filesToCheck = [
    join(projectRoot, "app", "layout.tsx"),
    join(projectRoot, "app", "layout.jsx"),
    join(projectRoot, "src", "app", "layout.tsx"),
    join(projectRoot, "src", "app", "layout.jsx"),
    join(projectRoot, "pages", "_document.tsx"),
    join(projectRoot, "pages", "_document.jsx"),
    join(projectRoot, "instrumentation-client.ts"),
    join(projectRoot, "instrumentation-client.js"),
    join(projectRoot, "src", "instrumentation-client.ts"),
    join(projectRoot, "src", "instrumentation-client.js"),
    join(projectRoot, "index.html"),
    join(projectRoot, "public", "index.html"),
    join(projectRoot, "src", "index.tsx"),
    join(projectRoot, "src", "index.ts"),
    join(projectRoot, "src", "main.tsx"),
    join(projectRoot, "src", "main.ts"),
    join(projectRoot, "src", "routes", "__root.tsx"),
    join(projectRoot, "src", "routes", "__root.jsx"),
    join(projectRoot, "app", "routes", "__root.tsx"),
    join(projectRoot, "app", "routes", "__root.jsx"),
  ];

  return filesToCheck.some(hasReactGrabInFile);
};

const AGENT_PACKAGES = [
  "@react-grab/claude-code",
  "@react-grab/cursor",
  "@react-grab/opencode",
  "@react-grab/codex",
  "@react-grab/gemini",
  "@react-grab/amp",
  "@react-grab/ami",
  "@react-grab/droid",
  "@react-grab/copilot",
  "@react-grab/mcp",
];

export const detectUnsupportedFramework = (
  projectRoot: string,
): UnsupportedFramework => {
  const packageJsonPath = join(projectRoot, "package.json");

  if (!existsSync(packageJsonPath)) {
    return null;
  }

  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
    const allDependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    if (allDependencies["@remix-run/react"] || allDependencies["remix"]) {
      return "remix";
    }

    if (allDependencies["astro"]) {
      return "astro";
    }

    if (allDependencies["@sveltejs/kit"]) {
      return "sveltekit";
    }

    if (allDependencies["gatsby"]) {
      return "gatsby";
    }

    return null;
  } catch {
    return null;
  }
};

export const detectInstalledAgents = (projectRoot: string): string[] => {
  const packageJsonPath = join(projectRoot, "package.json");

  if (!existsSync(packageJsonPath)) {
    return [];
  }

  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
    const allDependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    return AGENT_PACKAGES.filter((agent) =>
      Boolean(allDependencies[agent]),
    ).map((agent) => agent.replace("@react-grab/", ""));
  } catch {
    return [];
  }
};

export type AgentCLI =
  | "claude"
  | "cursor-agent"
  | "opencode"
  | "codex"
  | "gemini"
  | "amp"
  | "copilot"
  | "droid";

const AGENT_CLI_COMMANDS: AgentCLI[] = [
  "claude",
  "cursor-agent",
  "opencode",
  "codex",
  "gemini",
  "amp",
  "copilot",
  "droid",
];

const isCommandAvailable = (command: string): boolean => {
  try {
    execSync(`which ${command}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};

export const detectAvailableAgentCLIs = (): AgentCLI[] => {
  return AGENT_CLI_COMMANDS.filter(isCommandAvailable);
};

export const detectProject = async (
  projectRoot: string = process.cwd(),
): Promise<ProjectInfo> => {
  const framework = detectFramework(projectRoot);
  const packageManager = await detectPackageManager(projectRoot);

  return {
    packageManager,
    framework,
    nextRouterType:
      framework === "next" ? detectNextRouterType(projectRoot) : "unknown",
    isMonorepo: detectMonorepo(projectRoot),
    projectRoot,
    hasReactGrab: detectReactGrab(projectRoot),
    installedAgents: detectInstalledAgents(projectRoot),
    unsupportedFramework: detectUnsupportedFramework(projectRoot),
  };
};
