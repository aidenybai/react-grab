import { execSync, spawn } from "child_process";

const isGloballyInstalled = (): boolean => {
  try {
    const result = execSync("which grab", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    return result.length > 0;
  } catch {
    return false;
  }
};

const isRunningViaNpx = (): boolean => {
  const npmExecPath = process.env.npm_execpath ?? "";
  const npmCommand = process.env.npm_command ?? "";
  return npmExecPath.includes("npx") || npmCommand === "exec";
};

export const installGloballyInBackground = (version: string): void => {
  if (!isRunningViaNpx() || isGloballyInstalled()) {
    return;
  }

  const packageSpec = `grab@${version}`;

  const child = spawn("npm", ["install", "-g", packageSpec], {
    detached: true,
    stdio: "ignore",
    shell: true,
  });

  child.unref();
};
