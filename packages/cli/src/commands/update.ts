import { Command } from "commander";
import { execSync } from "child_process";
import pc from "picocolors";
import prompts from "prompts";
import { logger } from "../utils/logger.js";
import { spinner } from "../utils/spinner.js";
import { highlighter } from "../utils/highlighter.js";

const VERSION = process.env.VERSION ?? "0.0.1";
const UPDATE_COMMAND = "npm install -g grab@latest";

const getLatestVersion = (): string | null => {
  try {
    return execSync("npm view @react-grab/cli version", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    return null;
  }
};

export const update = new Command()
  .name("update")
  .alias("upgrade")
  .description("update React Grab CLI to the latest version")
  .option("-y, --yes", "skip confirmation prompts", false)
  .option("--check", "only check for updates, don't install", false)
  .action(async (opts) => {
    console.log(
      `${pc.magenta("✿")} ${pc.bold("React Grab")} ${pc.gray(VERSION)}`,
    );
    console.log();

    const checkSpinner = spinner("Checking for updates").start();
    const latestVersion = getLatestVersion();

    if (!latestVersion) {
      checkSpinner.fail("Failed to fetch latest version");
      logger.break();
      logger.error("Could not reach npm registry. Check your network connection.");
      logger.break();
      process.exit(1);
    }

    checkSpinner.succeed(`Current version: ${highlighter.info(VERSION)}`);

    if (VERSION === latestVersion) {
      logger.break();
      logger.success(`You're already on the latest version (${latestVersion})`);
      logger.break();
      process.exit(0);
    }

    logger.log(`Latest version:  ${highlighter.success(latestVersion)}`);
    logger.break();

    if (opts.check) {
      logger.log(`Update available: ${VERSION} → ${latestVersion}`);
      logger.log(`Run ${highlighter.info("grab update")} to install the update.`);
      logger.break();
      process.exit(0);
    }

    if (!opts.yes) {
      const { shouldProceed } = await prompts({
        type: "confirm",
        name: "shouldProceed",
        message: `Update from ${VERSION} to ${latestVersion}?`,
        initial: true,
      });

      if (!shouldProceed) {
        logger.break();
        logger.log("Update cancelled.");
        logger.break();
        process.exit(0);
      }
    }

    logger.break();
    const updateSpinner = spinner(`Updating to ${latestVersion}`).start();

    try {
      execSync(UPDATE_COMMAND, { stdio: ["pipe", "pipe", "pipe"] });
      updateSpinner.succeed(`Updated to ${latestVersion}`);
      logger.break();
      logger.success("Update complete!");
      logger.break();
    } catch (error) {
      updateSpinner.fail("Failed to update");
      logger.break();
      logger.error(`Update failed. Try manually: ${highlighter.info(UPDATE_COMMAND)}`);
      if (error instanceof Error && error.message) {
        logger.dim(error.message);
      }
      logger.break();
      process.exit(1);
    }
  });
