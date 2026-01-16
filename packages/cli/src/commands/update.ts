import { Command } from "commander";
import { execSync } from "child_process";
import pc from "picocolors";
import prompts from "prompts";
import { logger } from "../utils/logger.js";
import { spinner } from "../utils/spinner.js";
import { highlighter } from "../utils/highlighter.js";

const VERSION = process.env.VERSION ?? "0.0.1";

type PackageManager = "npm" | "yarn" | "pnpm" | "bun";

const getInstalledVersion = (): string | null => {
  try {
    const output = execSync("grab --version", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    const match = output.match(/(\d+\.\d+\.\d+(?:-[a-zA-Z0-9.]+)?)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
};

const getLatestVersion = (): string | null => {
  try {
    const output = execSync("npm view grab version", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return output.trim();
  } catch {
    return null;
  }
};

const detectGlobalPackageManager = (): PackageManager => {
  // Check pnpm first since it's commonly used
  try {
    const pnpmGlobalDir = execSync("pnpm root -g", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    execSync(`ls "${pnpmGlobalDir}/grab" 2>/dev/null || ls "${pnpmGlobalDir}/../grab" 2>/dev/null`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return "pnpm";
  } catch {}

  // Check yarn
  try {
    const yarnGlobalDir = execSync("yarn global dir", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    execSync(`ls "${yarnGlobalDir}/node_modules/grab" 2>/dev/null`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return "yarn";
  } catch {}

  // Check bun
  try {
    execSync("bun pm ls -g 2>/dev/null | grep grab", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return "bun";
  } catch {}

  // Default to npm
  return "npm";
};

const UPDATE_COMMANDS: Record<PackageManager, string> = {
  npm: "npm install -g grab@latest",
  yarn: "yarn global add grab@latest",
  pnpm: "pnpm add -g grab@latest",
  bun: "bun add -g grab@latest",
};

const MANAGER_NAMES: Record<PackageManager, string> = {
  npm: "npm",
  yarn: "Yarn",
  pnpm: "pnpm",
  bun: "Bun",
};

export const update = new Command()
  .name("update")
  .alias("upgrade")
  .description("update grab to the latest version")
  .option("-y, --yes", "skip confirmation prompts", false)
  .option("--check", "only check for updates, don't install", false)
  .action(async (opts) => {
    console.log(
      `${pc.magenta("✿")} ${pc.bold("React Grab")} ${pc.gray(VERSION)}`,
    );
    console.log();

    const checkSpinner = spinner("Checking for updates").start();

    const installedVersion = getInstalledVersion();
    const latestVersion = getLatestVersion();

    if (!latestVersion) {
      checkSpinner.fail("Failed to fetch latest version from npm");
      logger.break();
      logger.error("Could not reach npm registry. Check your network connection.");
      logger.break();
      process.exit(1);
    }

    if (!installedVersion) {
      checkSpinner.fail("grab is not installed globally");
      logger.break();
      logger.log(`Install it with: ${highlighter.info("npm install -g grab")}`);
      logger.break();
      process.exit(1);
    }

    checkSpinner.succeed(`Current version: ${highlighter.info(installedVersion)}`);

    if (installedVersion === latestVersion) {
      logger.break();
      logger.success(`You're already on the latest version (${latestVersion})`);
      logger.break();
      process.exit(0);
    }

    logger.log(`Latest version:  ${highlighter.success(latestVersion)}`);
    logger.break();

    if (opts.check) {
      logger.log(`Update available: ${installedVersion} → ${latestVersion}`);
      logger.log(`Run ${highlighter.info("grab update")} to install the update.`);
      logger.break();
      process.exit(0);
    }

    const packageManager = detectGlobalPackageManager();

    if (!opts.yes) {
      const { proceed } = await prompts({
        type: "confirm",
        name: "proceed",
        message: `Update grab from ${installedVersion} to ${latestVersion} using ${MANAGER_NAMES[packageManager]}?`,
        initial: true,
      });

      if (!proceed) {
        logger.break();
        logger.log("Update cancelled.");
        logger.break();
        process.exit(0);
      }
    }

    logger.break();
    const updateSpinner = spinner(`Updating grab to ${latestVersion}`).start();

    try {
      const command = UPDATE_COMMANDS[packageManager];
      execSync(command, {
        stdio: ["pipe", "pipe", "pipe"],
      });
      updateSpinner.succeed(`Updated grab to ${latestVersion}`);
      logger.break();
      logger.success("Update complete!");
      logger.break();
    } catch (error) {
      updateSpinner.fail("Failed to update grab");
      logger.break();
      logger.error(`Update failed. Try manually: ${highlighter.info(UPDATE_COMMANDS[packageManager])}`);
      if (error instanceof Error && error.message) {
        logger.dim(error.message);
      }
      logger.break();
      process.exit(1);
    }
  });
