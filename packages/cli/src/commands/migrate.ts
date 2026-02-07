import { Command } from "commander";
import pc from "picocolors";
import prompts from "prompts";
import {
  applyTransformWithFeedback,
  installPackagesWithFeedback,
  uninstallPackagesWithFeedback,
} from "../utils/cli-helpers.js";
import { detectProject, detectReactScan } from "../utils/detect.js";
import { printDiff } from "../utils/diff.js";
import { handleError } from "../utils/handle-error.js";
import { highlighter } from "../utils/highlighter.js";
import { getPackagesToInstall } from "../utils/install.js";
import { logger } from "../utils/logger.js";
import { spinner } from "../utils/spinner.js";
import {
  previewReactScanRemoval,
  previewTransform,
  type TransformResult,
} from "../utils/transform.js";

const VERSION = process.env.VERSION ?? "0.0.1";
const DOCS_URL = "https://github.com/aidenybai/react-grab";

const exitWithMessage = (message?: string, code = 0): never => {
  if (message) logger.log(message);
  logger.break();
  process.exit(code);
};

const confirmOrExit = async (
  message: string,
  isNonInteractive: boolean,
): Promise<void> => {
  if (isNonInteractive) return;
  const { proceed } = await prompts({
    type: "confirm",
    name: "proceed",
    message,
    initial: true,
  });
  if (!proceed) exitWithMessage("Migration cancelled.");
};

const hasTransformChanges = (
  result: TransformResult,
): result is TransformResult & {
  originalContent: string;
  newContent: string;
} =>
  result.success &&
  !result.noChanges &&
  Boolean(result.originalContent) &&
  Boolean(result.newContent);

const FRAMEWORK_DISPLAY_NAMES: Record<string, string> = {
  next: "Next.js",
  vite: "Vite",
  tanstack: "TanStack Start",
  webpack: "Webpack",
};

export const migrate = new Command()
  .name("migrate")
  .description("migrate to React Grab from another tool")
  .option("-y, --yes", "skip confirmation prompts", false)
  .option("-f, --from <source>", "migration source (react-scan)")
  .option(
    "-c, --cwd <cwd>",
    "working directory (defaults to current directory)",
    process.cwd(),
  )
  .action(async (opts) => {
    console.log(
      `${pc.magenta("✿")} ${pc.bold("React Grab")} ${pc.gray(VERSION)}`,
    );
    console.log();

    try {
      const { cwd, yes: isNonInteractive, from: migrationSource } = opts;

      if (migrationSource && migrationSource !== "react-scan") {
        logger.error(`Unknown migration source: ${migrationSource}`);
        logger.log(`Available sources: ${highlighter.info("react-scan")}`);
        logger.break();
        process.exit(1);
      }

      logger.break();
      logger.log(
        `Migrating from ${highlighter.info("React Scan")} to ${highlighter.info("React Grab")}...`,
      );
      logger.break();

      const preflightSpinner = spinner("Preflight checks.").start();
      const projectInfo = await detectProject(cwd);
      preflightSpinner.succeed();

      if (projectInfo.framework === "unknown") {
        logger.break();
        logger.error("Could not detect a supported framework.");
        logger.log(
          "React Grab supports Next.js, Vite, TanStack Start, and Webpack projects.",
        );
        logger.log(`Visit ${highlighter.info(DOCS_URL)} for manual setup.`);
        logger.break();
        process.exit(1);
      }

      const frameworkName = FRAMEWORK_DISPLAY_NAMES[projectInfo.framework];
      const frameworkSpinner = spinner("Verifying framework.").start();
      frameworkSpinner.succeed(
        `Verifying framework. Found ${highlighter.info(frameworkName)}.`,
      );

      if (projectInfo.framework === "next") {
        const routerSpinner = spinner("Detecting router type.").start();
        const routerName =
          projectInfo.nextRouterType === "app" ? "App Router" : "Pages Router";
        routerSpinner.succeed(
          `Detecting router type. Found ${highlighter.info(routerName)}.`,
        );
      }

      const sourceSpinner = spinner("Checking for React Scan.").start();
      const reactScanInfo = detectReactScan(cwd);

      if (!reactScanInfo.hasReactScan) {
        sourceSpinner.fail("React Scan is not installed in this project.");
        exitWithMessage(
          `Use ${highlighter.info("npx grab init")} to install React Grab directly.`,
        );
      }

      const detectionType = reactScanInfo.isPackageInstalled
        ? "npm package"
        : "script reference";
      sourceSpinner.succeed(
        `Checking for React Scan. Found ${highlighter.info(detectionType)}.`,
      );

      if (reactScanInfo.hasReactScanMonitoring) {
        logger.break();
        logger.warn("React Scan Monitoring (@react-scan/monitoring) detected.");
        logger.warn(
          "Monitoring features are not available in React Grab. You may need to remove it manually.",
        );
      }

      const removalResult = previewReactScanRemoval(
        projectInfo.projectRoot,
        projectInfo.framework,
        projectInfo.nextRouterType,
      );

      const getOtherDetectedFiles = () =>
        reactScanInfo.detectedFiles.filter(
          (file) => file !== removalResult.filePath,
        );

      const shouldUninstallPackage =
        reactScanInfo.isPackageInstalled &&
        getOtherDetectedFiles().length === 0;

      if (projectInfo.hasReactGrab) {
        logger.break();
        logger.success("React Grab is already installed.");
        logger.log(
          "This migration will only remove React Scan from your project.",
        );
        logger.break();

        if (removalResult.noChanges) {
          logger.log("No React Scan code found in configuration files.");
          logger.break();

          if (reactScanInfo.detectedFiles.length > 0) {
            logger.warn(
              "React Scan was detected in files that cannot be automatically cleaned:",
            );
            for (const file of reactScanInfo.detectedFiles) {
              logger.log(`  - ${file}`);
            }
            logger.warn(
              "Please remove React Scan references manually before uninstalling the package.",
            );
            logger.break();
            process.exit(1);
          }

          if (reactScanInfo.isPackageInstalled) {
            await confirmOrExit(
              "Uninstall react-scan package?",
              isNonInteractive,
            );
            uninstallPackagesWithFeedback(
              ["react-scan"],
              projectInfo.packageManager,
              projectInfo.projectRoot,
            );
            logger.break();
            logger.success("React Scan has been removed.");
          }

          exitWithMessage();
        }

        if (hasTransformChanges(removalResult)) {
          logger.break();
          printDiff(
            removalResult.filePath,
            removalResult.originalContent,
            removalResult.newContent,
          );
          logger.break();
          await confirmOrExit("Apply these changes?", isNonInteractive);

          applyTransformWithFeedback(
            removalResult,
            `Removing React Scan from ${removalResult.filePath}.`,
          );

          if (shouldUninstallPackage) {
            uninstallPackagesWithFeedback(
              ["react-scan"],
              projectInfo.packageManager,
              projectInfo.projectRoot,
            );
          }

          logger.break();
          logger.success("Migration complete! React Scan has been removed.");
          exitWithMessage();
        }

        if (!removalResult.success) {
          logger.break();
          logger.error("Failed to remove React Scan.");
          logger.log(removalResult.message);
          logger.break();
          process.exit(1);
        }

        exitWithMessage();
      }

      const addResult = previewTransform(
        projectInfo.projectRoot,
        projectInfo.framework,
        projectInfo.nextRouterType,
        "none",
        false,
      );

      const hasRemovalChanges = hasTransformChanges(removalResult);
      const hasAddChanges = hasTransformChanges(addResult);
      const shouldShowUninstallStep =
        shouldUninstallPackage &&
        (hasRemovalChanges ||
          getOtherDetectedFiles().length ===
            reactScanInfo.detectedFiles.length);

      if (!hasRemovalChanges && !hasAddChanges) {
        exitWithMessage("No changes needed.");
      }

      logger.break();
      logger.log("Migration will perform the following changes:");
      logger.break();

      if (hasRemovalChanges) {
        logger.log(
          `  ${pc.red("−")} Remove React Scan from ${removalResult.filePath}`,
        );
      }
      if (shouldShowUninstallStep) {
        logger.log(`  ${pc.red("−")} Uninstall react-scan package`);
      }
      logger.log(`  ${pc.green("+")} Install react-grab package`);
      if (hasAddChanges) {
        logger.log(
          `  ${pc.green("+")} Add React Grab to ${addResult.filePath}`,
        );
      }

      const isSameFile =
        hasRemovalChanges &&
        hasAddChanges &&
        removalResult.filePath === addResult.filePath;

      if (isSameFile) {
        logger.break();
        printDiff(
          removalResult.filePath,
          removalResult.originalContent,
          addResult.newContent,
        );
      } else {
        if (hasRemovalChanges) {
          logger.break();
          printDiff(
            removalResult.filePath,
            removalResult.originalContent,
            removalResult.newContent,
          );
        }
        if (
          hasAddChanges &&
          addResult.originalContent !== undefined &&
          addResult.newContent !== undefined
        ) {
          logger.break();
          printDiff(
            addResult.filePath,
            addResult.originalContent,
            addResult.newContent,
          );
        }
      }

      logger.break();
      logger.warn("Auto-detection may not be 100% accurate.");
      logger.warn("Please verify the changes before committing.");
      logger.break();
      await confirmOrExit("Apply these changes?", isNonInteractive);

      if (hasRemovalChanges) {
        applyTransformWithFeedback(
          removalResult,
          `Removing React Scan from ${removalResult.filePath}.`,
        );
      }
      if (hasAddChanges) {
        applyTransformWithFeedback(
          addResult,
          `Adding React Grab to ${addResult.filePath}.`,
        );
      }
      if (shouldShowUninstallStep) {
        uninstallPackagesWithFeedback(
          ["react-scan"],
          projectInfo.packageManager,
          projectInfo.projectRoot,
        );
      }

      installPackagesWithFeedback(
        getPackagesToInstall("none", true),
        projectInfo.packageManager,
        projectInfo.projectRoot,
      );

      logger.break();
      logger.log(`${highlighter.success("Success!")} Migration complete.`);
      logger.log("You may now start your development server.");
      logger.break();
    } catch (error) {
      handleError(error);
    }
  });
