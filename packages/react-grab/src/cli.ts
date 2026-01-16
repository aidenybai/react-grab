import { execSync, spawnSync } from "node:child_process";

const version = process.env.VERSION ?? "latest";
const packageSpec = `grab@${version}`;

const isGrabInstalled = (): boolean => {
  try {
    execSync("grab --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};

const detectPackageManager = (): string => {
  try {
    execSync("pnpm --version", { stdio: "ignore" });
    return "pnpm";
  } catch {
    try {
      execSync("yarn --version", { stdio: "ignore" });
      return "yarn";
    } catch {
      try {
        execSync("bun --version", { stdio: "ignore" });
        return "bun";
      } catch {
        return "npm";
      }
    }
  }
};

const installGrab = (): void => {
  const packageManager = detectPackageManager();

  const globalCommands: Record<string, string> = {
    npm: "npm install -g",
    yarn: "yarn global add",
    pnpm: "pnpm add -g",
    bun: "bun add -g",
  };

  const localCommands: Record<string, string> = {
    npm: "npm install -D",
    yarn: "yarn add -D",
    pnpm: "pnpm add -D",
    bun: "bun add -D",
  };

  const globalCommand = globalCommands[packageManager];
  const localCommand = localCommands[packageManager];

  console.log(`Installing ${packageSpec}...`);
  execSync(`${globalCommand} ${packageSpec}`, { stdio: "inherit" });
  execSync(`${localCommand} ${packageSpec}`, { stdio: "ignore" });
};

if (!isGrabInstalled()) {
  installGrab();
}

const result = spawnSync("grab", process.argv.slice(2), {
  stdio: "inherit",
  shell: process.platform === "win32",
});

process.exit(result.status ?? 0);
