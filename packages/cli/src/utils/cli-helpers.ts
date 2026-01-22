import type { PackageManager } from "./detect.js";
import type {
  PackageJsonTransformResult,
  TransformResult,
} from "./transform.js";
import { applyPackageJsonTransform, applyTransform } from "./transform.js";
import { handleError } from "./handle-error.js";
import { installPackages, uninstallPackages } from "./install.js";
import { logger } from "./logger.js";
import { spinner } from "./spinner.js";
import { AGENT_NAMES } from "./templates.js";

export const formatInstalledAgentNames = (agents: string[]): string =>
  agents
    .map((agent) => AGENT_NAMES[agent as keyof typeof AGENT_NAMES] ?? agent)
    .join(", ");

export const applyTransformWithFeedback = (
  result: TransformResult,
  message?: string,
): void => {
  const writeSpinner = spinner(
    message ?? `Applying changes to ${result.filePath}.`,
  ).start();
  const writeResult = applyTransform(result);
  if (!writeResult.success) {
    writeSpinner.fail();
    logger.break();
    logger.error(writeResult.error || "Failed to write file.");
    logger.break();
    process.exit(1);
  }
  writeSpinner.succeed();
};

export const applyPackageJsonWithFeedback = (
  result: PackageJsonTransformResult,
  message?: string,
): void => {
  const writeSpinner = spinner(
    message ?? `Applying changes to ${result.filePath}.`,
  ).start();
  const writeResult = applyPackageJsonTransform(result);
  if (!writeResult.success) {
    writeSpinner.fail();
    logger.break();
    logger.error(writeResult.error || "Failed to write file.");
    logger.break();
    process.exit(1);
  }
  writeSpinner.succeed();
};

export const installPackagesWithFeedback = (
  packages: string[],
  packageManager: PackageManager,
  projectRoot: string,
): void => {
  if (packages.length === 0) return;
  const installSpinner = spinner(`Installing ${packages.join(", ")}.`).start();
  try {
    installPackages(packages, packageManager, projectRoot);
    installSpinner.succeed();
  } catch (error) {
    installSpinner.fail();
    handleError(error);
  }
};

export const uninstallPackagesWithFeedback = (
  packages: string[],
  packageManager: PackageManager,
  projectRoot: string,
): void => {
  if (packages.length === 0) return;
  const uninstallSpinner = spinner(`Removing ${packages.join(", ")}.`).start();
  try {
    uninstallPackages(packages, packageManager, projectRoot);
    uninstallSpinner.succeed();
  } catch (error) {
    uninstallSpinner.fail();
    handleError(error);
  }
};
