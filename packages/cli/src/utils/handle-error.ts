import { logger } from "./logger.js";

export const handleError = (error: unknown) => {
  logger.break();
  logger.error("Something went wrong. Please check the error below for more details.");
  logger.error("If the problem persists, please open an issue on GitHub.");
  logger.error("");
  if (error instanceof Error) {
    logger.error(error.message);
  }
  logger.break();
  process.exit(1);
};
