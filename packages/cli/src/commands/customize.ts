import { Command } from "commander";
import pc from "picocolors";
import prompts from "prompts";
import { detectProject } from "../utils/detect.js";
import { printDiff } from "../utils/diff.js";
import { handleError } from "../utils/handle-error.js";
import { highlighter } from "../utils/highlighter.js";
import { logger } from "../utils/logger.js";
import { spinner } from "../utils/spinner.js";
import {
  applyOptionsTransform,
  previewOptionsTransform,
  type ReactGrabOptions,
} from "../utils/transform.js";

const VERSION = process.env.VERSION ?? "0.0.1";

const MODIFIER_KEY_NAMES: Record<string, string> = {
  metaKey: process.platform === "darwin" ? "⌘ Command" : "⊞ Windows",
  ctrlKey: "Ctrl",
  shiftKey: "Shift",
  altKey: process.platform === "darwin" ? "⌥ Option" : "Alt",
};

const formatActivationKey = (activationKey: ReactGrabOptions["activationKey"]): string => {
  if (!activationKey) return "Default (Option/Alt)";
  const parts: string[] = [];
  if (activationKey.metaKey) parts.push(process.platform === "darwin" ? "⌘" : "Win");
  if (activationKey.ctrlKey) parts.push("Ctrl");
  if (activationKey.shiftKey) parts.push("Shift");
  if (activationKey.altKey) parts.push(process.platform === "darwin" ? "⌥" : "Alt");
  if (activationKey.key) parts.push(activationKey.key.toUpperCase());
  return parts.length > 0 ? parts.join(" + ") : "Default (Option/Alt)";
};

export const customize = new Command()
  .name("customize")
  .description("customize React Grab options")
  .option("-y, --yes", "skip confirmation prompts", false)
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
      const cwd = opts.cwd;
      const isNonInteractive = opts.yes;

      const preflightSpinner = spinner("Preflight checks.").start();

      const projectInfo = await detectProject(cwd);

      if (!projectInfo.hasReactGrab) {
        preflightSpinner.fail("React Grab is not installed.");
        logger.break();
        logger.error(
          `Run ${highlighter.info("react-grab init")} first to install React Grab.`,
        );
        logger.break();
        process.exit(1);
      }

      preflightSpinner.succeed();

      if (isNonInteractive) {
        logger.break();
        logger.error("Customize command requires interactive mode.");
        logger.error("Remove the --yes flag to use interactive prompts.");
        logger.break();
        process.exit(1);
      }

      logger.break();
      logger.log(`Configure ${highlighter.info("React Grab")} options:`);
      logger.break();

      const collectedOptions: ReactGrabOptions = {};

      const { wantActivationKey } = await prompts({
        type: "confirm",
        name: "wantActivationKey",
        message: `Customize ${highlighter.info("activation key")}?`,
        initial: false,
      });

      if (wantActivationKey === undefined) {
        logger.break();
        process.exit(1);
      }

      if (wantActivationKey) {
        const { key } = await prompts({
          type: "text",
          name: "key",
          message: "Enter the activation key (e.g., g, k, space):",
          initial: "",
        });

        if (key === undefined) {
          logger.break();
          process.exit(1);
        }

        const { modifiers } = await prompts({
          type: "multiselect",
          name: "modifiers",
          message: "Select modifier keys (space to select, enter to confirm):",
          choices: [
            { title: MODIFIER_KEY_NAMES.metaKey, value: "metaKey" },
            { title: MODIFIER_KEY_NAMES.ctrlKey, value: "ctrlKey" },
            { title: MODIFIER_KEY_NAMES.shiftKey, value: "shiftKey" },
            { title: MODIFIER_KEY_NAMES.altKey, value: "altKey", selected: true },
          ],
          hint: "- Space to select, Enter to confirm",
        });

        if (modifiers === undefined) {
          logger.break();
          process.exit(1);
        }

        collectedOptions.activationKey = {
          ...(key && { key: key.toLowerCase() }),
          ...(modifiers.includes("metaKey") && { metaKey: true }),
          ...(modifiers.includes("ctrlKey") && { ctrlKey: true }),
          ...(modifiers.includes("shiftKey") && { shiftKey: true }),
          ...(modifiers.includes("altKey") && { altKey: true }),
        };

        logger.log(
          `  Activation key: ${highlighter.info(formatActivationKey(collectedOptions.activationKey))}`,
        );
      }

      const { activationMode } = await prompts({
        type: "select",
        name: "activationMode",
        message: `Select ${highlighter.info("activation mode")}:`,
        choices: [
          { title: "Toggle (press to activate/deactivate)", value: "toggle" },
          { title: "Hold (hold key to keep active)", value: "hold" },
        ],
        initial: 0,
      });

      if (activationMode === undefined) {
        logger.break();
        process.exit(1);
      }

      collectedOptions.activationMode = activationMode;

      if (activationMode === "hold") {
        const { keyHoldDuration } = await prompts({
          type: "number",
          name: "keyHoldDuration",
          message: `Enter ${highlighter.info("key hold duration")} in milliseconds:`,
          initial: 150,
          min: 0,
          max: 2000,
        });

        if (keyHoldDuration === undefined) {
          logger.break();
          process.exit(1);
        }

        collectedOptions.keyHoldDuration = keyHoldDuration;
      }

      const { allowActivationInsideInput } = await prompts({
        type: "confirm",
        name: "allowActivationInsideInput",
        message: `Allow activation ${highlighter.info("inside input fields")}?`,
        initial: true,
      });

      if (allowActivationInsideInput === undefined) {
        logger.break();
        process.exit(1);
      }

      collectedOptions.allowActivationInsideInput = allowActivationInsideInput;

      const { maxContextLines } = await prompts({
        type: "number",
        name: "maxContextLines",
        message: `Enter ${highlighter.info("max context lines")} to include:`,
        initial: 3,
        min: 0,
        max: 50,
      });

      if (maxContextLines === undefined) {
        logger.break();
        process.exit(1);
      }

      collectedOptions.maxContextLines = maxContextLines;

      const result = previewOptionsTransform(
        projectInfo.projectRoot,
        projectInfo.framework,
        projectInfo.nextRouterType,
        collectedOptions,
      );

      if (!result.success) {
        logger.break();
        logger.error(result.message);
        logger.break();
        process.exit(1);
      }

      const hasChanges =
        !result.noChanges && result.originalContent && result.newContent;

      if (hasChanges) {
        logger.break();
        printDiff(result.filePath, result.originalContent!, result.newContent!);

        logger.break();
        const { proceed } = await prompts({
          type: "confirm",
          name: "proceed",
          message: "Apply these changes?",
          initial: true,
        });

        if (!proceed) {
          logger.break();
          logger.log("Changes cancelled.");
          logger.break();
          process.exit(0);
        }

        const writeSpinner = spinner(
          `Applying changes to ${result.filePath}.`,
        ).start();
        const writeResult = applyOptionsTransform(result);
        if (!writeResult.success) {
          writeSpinner.fail();
          logger.break();
          logger.error(writeResult.error || "Failed to write file.");
          logger.break();
          process.exit(1);
        }
        writeSpinner.succeed();
      } else {
        logger.break();
        logger.log("No changes needed.");
      }

      logger.break();
      logger.log(
        `${highlighter.success("Success!")} React Grab options have been customized.`,
      );
      logger.break();
    } catch (error) {
      handleError(error);
    }
  });
