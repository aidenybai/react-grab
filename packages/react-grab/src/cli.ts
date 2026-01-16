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
  const managers = ["pnpm", "yarn", "bun"] as const;

  for (const manager of managers) {
    try {
      execSync(`${manager} --version`, { stdio: "ignore" });
      return manager;
    } catch {
      continue;
    }
  }
  return "npm";
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
