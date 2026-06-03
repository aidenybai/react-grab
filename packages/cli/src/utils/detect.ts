import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { detect } from "package-manager-detector/detect";
import ignore from "ignore";
import { hasReactGrabSetupCode } from "./react-grab-code.js";
import { getReactGrabSetupFileCandidates } from "./react-grab-setup-files.js";

export type PackageManager = "npm" | "yarn" | "pnpm" | "bun";
export type Framework = "next" | "vite" | "tanstack" | "webpack" | "unknown";
export type NextRouterType = "app" | "pages" | "unknown";
export type UnsupportedFramework = "remix" | "astro" | "sveltekit" | "gatsby" | null;

interface ProjectInfo {
  packageManager: PackageManager;
  framework: Framework;
  nextRouterType: NextRouterType;
  isMonorepo: boolean;
  projectRoot: string;
  hasReactGrab: boolean;
  isReactGrabConfigured: boolean;
  reactGrabVersion: string | null;
  unsupportedFramework: UnsupportedFramework;
}

const VALID_PACKAGE_MANAGERS: ReadonlySet<string> = new Set(["npm", "yarn", "pnpm", "bun"]);

export const detectPackageManager = async (projectRoot: string): Promise<PackageManager> => {
  const result = await detect({ cwd: projectRoot });
  if (result?.agent) {
    const managerName = result.agent.split("@")[0];
    if (VALID_PACKAGE_MANAGERS.has(managerName)) {
      return managerName as PackageManager;
    }
  }
  return "npm";
};

const CONFIG_EXTENSIONS = ["ts", "mts", "cts", "js", "mjs", "cjs"] as const;

const hasConfigFile = (projectRoot: string, configBaseName: string): boolean =>
  CONFIG_EXTENSIONS.some((extension) =>
    existsSync(join(projectRoot, `${configBaseName}.${extension}`)),
  );

const readMergedDependencies = (projectRoot: string): Record<string, string> | null => {
  const packageJsonPath = join(projectRoot, "package.json");
  if (!existsSync(packageJsonPath)) return null;
  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
    return {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };
  } catch {
    return null;
  }
};

const detectFrameworkFromDependencies = (
  dependencies: Record<string, string> | null,
): Framework => {
  if (!dependencies) return "unknown";
  if (dependencies["next"]) return "next";
  if (dependencies["@tanstack/react-start"]) return "tanstack";
  if (dependencies["vite"]) return "vite";
  if (dependencies["webpack"]) return "webpack";
  return "unknown";
};

const detectFrameworkFromConfigFiles = (projectRoot: string): Framework => {
  if (hasConfigFile(projectRoot, "next.config")) return "next";
  if (hasConfigFile(projectRoot, "app.config")) return "tanstack";
  if (hasConfigFile(projectRoot, "vite.config")) return "vite";
  if (hasConfigFile(projectRoot, "webpack.config")) return "webpack";
  return "unknown";
};

const findEnclosingMonorepoRoot = (projectRoot: string): string | null => {
  let currentDirectory = dirname(projectRoot);
  while (currentDirectory !== dirname(currentDirectory)) {
    if (detectMonorepo(currentDirectory)) return currentDirectory;
    currentDirectory = dirname(currentDirectory);
  }
  return null;
};

export const detectFramework = (projectRoot: string): Framework => {
  const localFramework = detectFrameworkFromDependencies(readMergedDependencies(projectRoot));
  if (localFramework !== "unknown") return localFramework;
  return detectFrameworkFromConfigFiles(projectRoot);
};

const detectFrameworkFromMonorepoRoot = (projectRoot: string): Framework => {
  const monorepoRoot = findEnclosingMonorepoRoot(projectRoot);
  if (!monorepoRoot) return "unknown";
  return detectFrameworkFromDependencies(readMergedDependencies(monorepoRoot));
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

const expandWorkspacePattern = (projectRoot: string, pattern: string): string[] => {
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
  const dependencies = readMergedDependencies(projectPath);
  if (!dependencies) return false;
  return Boolean(dependencies["react"] || dependencies["react-dom"]);
};

const buildReactProject = (projectPath: string): WorkspaceProject | null => {
  const framework = detectFramework(projectPath);
  if (!hasReactDependency(projectPath) && framework === "unknown") return null;

  let name = basename(projectPath);
  const packageJsonPath = join(projectPath, "package.json");
  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
    name = packageJson.name || name;
  } catch {}

  return { name, path: projectPath, framework };
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

      projects.push(...scanDirectoryForProjects(entryPath, ignorer, maxDepth, currentDepth + 1));
    }
  } catch {
    return projects;
  }

  return projects;
};

const MAX_SCAN_DEPTH = 2;

export const findReactProjects = (projectRoot: string): WorkspaceProject[] => {
  const monorepoRoot = detectMonorepo(projectRoot)
    ? projectRoot
    : findEnclosingMonorepoRoot(projectRoot);
  if (monorepoRoot) {
    const workspaceProjects = findWorkspaceProjects(monorepoRoot);
    const localProject = projectRoot === monorepoRoot ? null : buildReactProject(projectRoot);
    const projects = localProject
      ? [localProject, ...workspaceProjects.filter((project) => project.path !== localProject.path)]
      : workspaceProjects;
    if (projects.length > 0) {
      return projects;
    }
  }

  const ignorer = loadGitignore(projectRoot);
  const scannedProjects = scanDirectoryForProjects(projectRoot, ignorer, MAX_SCAN_DEPTH);
  if (scannedProjects.length > 0) {
    return scannedProjects;
  }

  let currentDirectory = dirname(projectRoot);
  while (currentDirectory !== dirname(currentDirectory)) {
    const parentProject = buildReactProject(currentDirectory);
    if (parentProject) {
      return [parentProject];
    }
    currentDirectory = dirname(currentDirectory);
  }

  return [];
};

const hasReactGrabSetupInFile = (filePath: string): boolean => {
  if (!existsSync(filePath)) return false;
  try {
    const content = readFileSync(filePath, "utf-8");
    return hasReactGrabSetupCode(content);
  } catch {
    return false;
  }
};

const detectReactGrabDependency = (projectRoot: string): boolean => {
  const dependencies = readMergedDependencies(projectRoot);
  return Boolean(dependencies?.["react-grab"]);
};

export const detectReactGrabConfigured = (projectRoot: string): boolean => {
  return getReactGrabSetupFileCandidates(projectRoot).some(hasReactGrabSetupInFile);
};

export const detectReactGrab = (projectRoot: string): boolean =>
  detectReactGrabDependency(projectRoot) || detectReactGrabConfigured(projectRoot);

export const detectUnsupportedFramework = (projectRoot: string): UnsupportedFramework => {
  const dependencies = readMergedDependencies(projectRoot);
  if (!dependencies) return null;
  if (dependencies["@remix-run/react"] || dependencies["remix"]) return "remix";
  if (dependencies["astro"]) return "astro";
  if (dependencies["@sveltejs/kit"]) return "sveltekit";
  if (dependencies["gatsby"]) return "gatsby";
  return null;
};

const detectReactGrabVersion = (projectRoot: string): string | null => {
  const installedPackageJsonPath = join(projectRoot, "node_modules", "react-grab", "package.json");
  if (existsSync(installedPackageJsonPath)) {
    try {
      const packageJson = JSON.parse(readFileSync(installedPackageJsonPath, "utf-8"));
      return packageJson.version ?? null;
    } catch {}
  }
  return null;
};

export const detectProject = async (projectRoot: string = process.cwd()): Promise<ProjectInfo> => {
  const localFramework = detectFramework(projectRoot);
  const framework =
    localFramework === "unknown" ? detectFrameworkFromMonorepoRoot(projectRoot) : localFramework;
  const packageManager = await detectPackageManager(projectRoot);
  const isMonorepo = detectMonorepo(projectRoot) || findEnclosingMonorepoRoot(projectRoot) !== null;
  const isReactGrabConfigured = detectReactGrabConfigured(projectRoot);

  return {
    packageManager,
    framework,
    nextRouterType: framework === "next" ? detectNextRouterType(projectRoot) : "unknown",
    isMonorepo,
    projectRoot,
    hasReactGrab: detectReactGrabDependency(projectRoot) || isReactGrabConfigured,
    isReactGrabConfigured,
    reactGrabVersion: detectReactGrabVersion(projectRoot),
    unsupportedFramework: detectUnsupportedFramework(projectRoot),
  };
};
