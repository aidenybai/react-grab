import { highlighter } from "./highlighter.js";
import { logger } from "./logger.js";
import { prompts } from "./prompts.js";

/**
 * Shared per-option prompt helpers used by both `init` and `configure`.
 *
 * Each helper returns the answer or calls `process.exit(1)` if the user
 * cancels the prompt (which matches the existing command behavior — the
 * caller would otherwise have to repeat the same `if (x === undefined)
 * { logger.break(); process.exit(1); }` block at every callsite).
 */

const exitOnCancel = (value: unknown): void => {
  if (value === undefined) {
    logger.break();
    process.exit(1);
  }
};

export const promptActivationMode = async (): Promise<"toggle" | "hold"> => {
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
  exitOnCancel(activationMode);
  return activationMode;
};

export const promptKeyHoldDuration = async (): Promise<number> => {
  const { keyHoldDuration } = await prompts({
    type: "number",
    name: "keyHoldDuration",
    message: `Enter ${highlighter.info("key hold duration")} in milliseconds:`,
    initial: 150,
    min: 0,
    max: 2000,
  });
  exitOnCancel(keyHoldDuration);
  return keyHoldDuration;
};

export const promptAllowActivationInsideInput = async (): Promise<boolean> => {
  const { allowActivationInsideInput } = await prompts({
    type: "confirm",
    name: "allowActivationInsideInput",
    message: `Allow activation ${highlighter.info("inside input fields")}?`,
    initial: true,
  });
  exitOnCancel(allowActivationInsideInput);
  return allowActivationInsideInput;
};

export const promptMaxContextLines = async (): Promise<number> => {
  const { maxContextLines } = await prompts({
    type: "number",
    name: "maxContextLines",
    message: `Enter ${highlighter.info("max context lines")} to include:`,
    initial: 3,
    min: 0,
    max: 50,
  });
  exitOnCancel(maxContextLines);
  return maxContextLines;
};
