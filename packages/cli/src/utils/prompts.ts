import basePrompts, { type PromptObject, type Answers } from "prompts";
import { logger } from "./logger.js";
import { unrefStdin } from "./unref-stdin.js";

const onCancel = () => {
  logger.break();
  logger.log("Cancelled.");
  logger.break();
  process.exit(0);
};

export const prompts = <T extends string = string>(
  questions: PromptObject<T> | PromptObject<T>[],
): Promise<Answers<T>> => {
  // HACK: each prompt re-refs stdin and never unrefs it on close, so re-unref
  // once it settles or the one-shot CLI hangs. See `unref-stdin.ts` for why.
  return basePrompts(questions, { onCancel }).finally(unrefStdin);
};
