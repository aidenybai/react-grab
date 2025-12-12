import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { detect } from "@antfu/ni";

export type PackageManager = "npm" | "yarn" | "pnpm" | "bun";
export type Framework = "next" | "vite" | "webpack" | "unknown";
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

export const detectPackageManager = async (
  projectRoot: string,
): Promise<PackageManager> => {
  const detected = await detect({ cwd: projectRoot });
  if (detected && ["npm", "yarn", "pnpm", "bun"].includes(detected)) {
    return detected as PackageManager;
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
    } catch {
      // Continue
    }
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
    } catch {
      // Continue
    }
  }

  return [...new Set(patterns)];
};

const expandWorkspacePattern = (
  projectRoot: string,
  pattern: string,
): string[] => {
  const results: string[] = [];
  const cleanPattern = pattern.replace(/\/\*$/, "");
  const basePath = join(projectRoot, cleanPattern);

  if (!existsSync(basePath)) return results;

  try {
    const entries = readdirSync(basePath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const packageJsonPath = join(basePath, entry.name, "package.json");
        if (existsSync(packageJsonPath)) {
          results.push(join(basePath, entry.name));
        }
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

export const findWorkspaceProjects = (
  projectRoot: string,
): WorkspaceProject[] => {
  const patterns = getWorkspacePatterns(projectRoot);
  const projects: WorkspaceProject[] = [];

  for (const pattern of patterns) {
    const projectPaths = expandWorkspacePattern(projectRoot, pattern);
    for (const projectPath of projectPaths) {
      const framework = detectFramework(projectPath);
      const hasReact = hasReactDependency(projectPath);

      if (hasReact || framework !== "unknown") {
        const packageJsonPath = join(projectPath, "package.json");
        let name = basename(projectPath);
        try {
          const packageJson = JSON.parse(
            readFileSync(packageJsonPath, "utf-8"),
          );
          name = packageJson.name || name;
        } catch {
          // Use directory name
        }

        projects.push({
          name,
          path: projectPath,
          framework,
          hasReact,
        });
      }
    }
  }

  return projects;
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
    } catch {
      // Continue to file checks
    }
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
  "@react-grab/visual-edit",
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
  | "amp";

const AGENT_CLI_COMMANDS: AgentCLI[] = [
  "claude",
  "cursor-agent",
  "opencode",
  "codex",
  "gemini",
  "amp",
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
