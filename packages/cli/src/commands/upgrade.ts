import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Command } from "commander";
import pc from "picocolors";
import { detectProject } from "../utils/detect.js";
import { handleError } from "../utils/handle-error.js";
import { highlighter } from "../utils/highlighter.js";
import { installPackages } from "../utils/install.js";
import { logger } from "../utils/logger.js";
import { spinner } from "../utils/spinner.js";

const VERSION = process.env.VERSION ?? "0.0.1";
const NPM_REGISTRY_URL = "https://registry.npmjs.org/react-grab/latest";

interface NpmPackageInfo {
  version: string;
}

const fetchLatestVersion = async (): Promise<string | null> => {
  try {
    const response = await fetch(NPM_REGISTRY_URL);
    const data: NpmPackageInfo = await response.json();
    return data.version ?? null;
  } catch {
    return null;
  }
};

const isDevDependency = (projectRoot: string): boolean => {
  const packageJsonPath = join(projectRoot, "package.json");
  if (!existsSync(packageJsonPath)) return true;
  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
    if (packageJson.devDependencies?.["react-grab"]) return true;
    if (packageJson.dependencies?.["react-grab"]) return false;
  } catch {}
  return true;
};

export const upgrade = new Command()
  .name("upgrade")
  .alias("update")
  .description("upgrade react-grab to the latest version")
  .option("-c, --cwd <cwd>", "working directory (defaults to current directory)", process.cwd())
  .action(async (opts) => {
    console.log(`${pc.magenta("✿")} ${pc.bold("React Grab")} ${pc.gray(VERSION)}`);
    console.log();

    try {
      const cwd = resolve(opts.cwd);

      const detectSpinner = spinner("Detecting project.").start();
      const projectInfo = await detectProject(cwd);

      if (!projectInfo.hasReactGrab) {
        detectSpinner.fail("React Grab is not installed.");
        logger.break();
        logger.error(
          `Run ${highlighter.info("npx grab@latest init")} first to install React Grab.`,
        );
        logger.break();
        process.exit(1);
      }

      detectSpinner.succeed();

      const versionSpinner = spinner("Checking for updates.").start();
      const latestVersion = await fetchLatestVersion();

      if (!latestVersion) {
        versionSpinner.fail("Could not check for updates.");
        logger.break();
        logger.error("Failed to reach the npm registry. Check your network connection.");
        logger.break();
        process.exit(1);
      }

      const installedVersion = projectInfo.reactGrabVersion;

      if (installedVersion && installedVersion === latestVersion) {
        versionSpinner.succeed(
          `Already on the latest version ${highlighter.info(`v${latestVersion}`)}.`,
        );
        logger.break();
        process.exit(0);
      }

      const fromLabel = installedVersion ? `v${installedVersion}` : "unknown";
      versionSpinner.succeed(
        `Update available: ${highlighter.dim(fromLabel)} → ${highlighter.info(`v${latestVersion}`)}.`,
      );

      const upgradeSpinner = spinner("Upgrading react-grab.").start();

      try {
        installPackages(
          ["react-grab@latest"],
          projectInfo.packageManager,
          projectInfo.projectRoot,
          isDevDependency(projectInfo.projectRoot),
        );
        upgradeSpinner.succeed();
      } catch {
        upgradeSpinner.fail();
        logger.break();
        logger.error("Failed to upgrade. Check your network connection and try again.");
        logger.break();
        process.exit(1);
      }

      logger.break();
      logger.log(
        `${highlighter.success("Success!")} React Grab has been upgraded to ${highlighter.info(`v${latestVersion}`)}.`,
      );
      logger.break();
    } catch (error) {
      handleError(error);
    }
  });
