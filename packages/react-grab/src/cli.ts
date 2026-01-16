import { execSync, spawnSync } from "node:child_process";

const version = process.env.VERSION ?? "latest";
const packageSpec = `grab@${version}`;

const getInstalledGrabVersion = (): string | null => {
  try {
    const output = execSync("grab --version", { encoding: "utf-8" });
    const match = output.match(/(\d+\.\d+\.\d+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
};

const needsInstall = (): boolean => {
  const installedVersion = getInstalledGrabVersion();
  if (!installedVersion) {
    return true;
  }
  if (version !== "latest" && /^\d+\.\d+\.\d+$/.test(version)) {
    return installedVersion !== version;
  }
  return true;
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
  try {
    execSync(`${localCommand} ${packageSpec}`, { stdio: "pipe" });
  } catch (error) {
    const err = error as { stderr?: Buffer };
    const stderr = err.stderr?.toString().trim();
    if (stderr) {
      console.error(`Failed to install ${packageSpec} locally:\n${stderr}`);
    } else {
      console.error(`Failed to install ${packageSpec} locally`);
    }
  }
};

if (needsInstall()) {
  installGrab();
}

const result = spawnSync("grab", process.argv.slice(2), {
  stdio: "inherit",
  shell: process.platform === "win32",
});

process.exit(result.status ?? 0);
