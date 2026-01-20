import { execSync } from "child_process";
import prompts from "prompts";
import { highlighter } from "./highlighter.js";
import { logger } from "./logger.js";
import { spinner } from "./spinner.js";

const getGlobalVersion = (): string | null => {
  try {
    const result = execSync("grab --version", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    return result || null;
  } catch {
    return null;
  }
};

export const isRunningViaNpx = (): boolean => {
  const npmExecPath = process.env.npm_execpath ?? "";
  const npmCommand = process.env.npm_command ?? "";
  return npmExecPath.includes("npx") || npmCommand === "exec";
};

export const promptGlobalInstall = async (version: string): Promise<void> => {
  if (!isRunningViaNpx()) {
    return;
  }

  const globalVersion = getGlobalVersion();
  const isInstalled = globalVersion !== null;
  const isOutdated = isInstalled && globalVersion !== version;

  if (isInstalled && !isOutdated) {
    return;
  }

  logger.break();

  const message = isOutdated
    ? `Update global grab from ${globalVersion} to ${version}?`
    : "Install grab globally so you can run it without npx?";

  const { shouldInstall } = await prompts({
    type: "confirm",
    name: "shouldInstall",
    message,
    initial: true,
  });

  if (!shouldInstall) {
    logger.dim(
      `Skipped. Run ${highlighter.info("npm install -g grab")} to install later.`,
    );
    logger.break();
    return;
  }

  const packageSpec = `grab@${version}`;
  const actionText = isOutdated ? "Updating" : "Installing";
  const installSpinner = spinner(
    `${actionText} ${packageSpec} globally`,
  ).start();

  try {
    execSync(`npm install -g ${packageSpec}`, {
      stdio: ["pipe", "pipe", "pipe"],
    });
    const successText = isOutdated ? "Updated" : "Installed";
    installSpinner.succeed(
      `${successText} globally. Run ${highlighter.info("grab")} to get started.`,
    );
  } catch {
    const failText = isOutdated ? "Update" : "Install";
    installSpinner.fail(`Global ${failText.toLowerCase()} failed`);
    logger.break();
    logger.dim(`Try running: ${highlighter.info("sudo npm install -g grab")}`);
    logger.dim(
      `Or see: ${highlighter.info("https://docs.npmjs.com/resolving-eacces-permissions-errors")}`,
    );
  }

  logger.break();
};
