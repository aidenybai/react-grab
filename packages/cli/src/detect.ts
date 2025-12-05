import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { detect } from "@antfu/ni";

export type PackageManager = "npm" | "yarn" | "pnpm" | "bun";
export type Framework = "next" | "vite" | "webpack" | "unknown";
export type NextRouterType = "app" | "pages" | "unknown";
export type UnsupportedFramework = "remix" | "astro" | "sveltekit" | "gatsby" | null;

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

export const detectPackageManager = async (projectRoot: string): Promise<PackageManager> => {
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

export const detectReactGrab = (projectRoot: string): boolean => {
  const packageJsonPath = join(projectRoot, "package.json");

  if (!existsSync(packageJsonPath)) {
    return false;
  }

  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
    const allDependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    return Boolean(allDependencies["react-grab"]);
  } catch {
    return false;
  }
};

const AGENT_PACKAGES = ["@react-grab/claude-code", "@react-grab/cursor", "@react-grab/opencode"];

export const detectUnsupportedFramework = (projectRoot: string): UnsupportedFramework => {
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

    return AGENT_PACKAGES.filter((agent) => Boolean(allDependencies[agent])).map((agent) =>
      agent.replace("@react-grab/", "")
    );
  } catch {
    return [];
  }
};

export const detectProject = async (projectRoot: string = process.cwd()): Promise<ProjectInfo> => {
  const framework = detectFramework(projectRoot);
  const packageManager = await detectPackageManager(projectRoot);

  return {
    packageManager,
    framework,
    nextRouterType: framework === "next" ? detectNextRouterType(projectRoot) : "unknown",
    isMonorepo: detectMonorepo(projectRoot),
    projectRoot,
    hasReactGrab: detectReactGrab(projectRoot),
    installedAgents: detectInstalledAgents(projectRoot),
    unsupportedFramework: detectUnsupportedFramework(projectRoot),
  };
};
