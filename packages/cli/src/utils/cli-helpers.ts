import type { PackageManager } from "./detect.js";
import type { TransformResult } from "./transform.js";
import { applyTransform } from "./transform.js";
import { handleError } from "./handle-error.js";
import { installPackages } from "./install.js";
import { logger } from "./logger.js";
import { spinner } from "./spinner.js";

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
