import basePrompts, { type PromptObject, type Answers } from "prompts";
import { logger } from "./logger.js";

const onCancel = () => {
  logger.break();
  logger.log("Cancelled.");
  logger.break();
  process.exit(0);
};

export const prompts = <T extends string = string>(
  questions: PromptObject<T> | PromptObject<T>[],
): Promise<Answers<T>> => {
  return basePrompts(questions, { onCancel });
};
