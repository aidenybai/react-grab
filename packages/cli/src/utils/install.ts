import { execSync } from "node:child_process";
import type { PackageManager } from "./detect.js";
import type { AgentIntegration } from "./templates.js";

const INSTALL_COMMANDS: Record<PackageManager, string> = {
  npm: "npm install",
  yarn: "yarn add",
  pnpm: "pnpm add",
  bun: "bun add",
};

const UNINSTALL_COMMANDS: Record<PackageManager, string> = {
  npm: "npm uninstall",
  yarn: "yarn remove",
  pnpm: "pnpm remove",
  bun: "bun remove",
};

export const installPackages = (
  packages: string[],
  packageManager: PackageManager,
  projectRoot: string,
  isDev: boolean = true,
): void => {
  if (packages.length === 0) {
    return;
  }

  const command = INSTALL_COMMANDS[packageManager];
  const devFlag = isDev ? " -D" : "";
  const fullCommand = `${command}${devFlag} ${packages.join(" ")}`;

  console.log(`Running: ${fullCommand}\n`);

  execSync(fullCommand, {
    cwd: projectRoot,
    stdio: "inherit",
  });
};

export const getPackagesToInstall = (
  agent: AgentIntegration,
  includeReactGrab: boolean = true,
): string[] => {
  const packages: string[] = [];

  if (includeReactGrab) {
    packages.push("react-grab");
  }

  if (agent !== "none") {
    packages.push(`@react-grab/${agent}`);
  }

  return packages;
};

export const uninstallPackages = (
  packages: string[],
  packageManager: PackageManager,
  projectRoot: string,
): void => {
  if (packages.length === 0) {
    return;
  }

  const command = UNINSTALL_COMMANDS[packageManager];
  const fullCommand = `${command} ${packages.join(" ")}`;

  console.log(`Running: ${fullCommand}\n`);

  execSync(fullCommand, {
    cwd: projectRoot,
    stdio: "inherit",
  });
};

export const getPackagesToUninstall = (agent: string): string[] => {
  return [`@react-grab/${agent}`];
};
