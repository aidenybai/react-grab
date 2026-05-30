import { Command } from "commander";
import pc from "picocolors";
import { handleError } from "../utils/handle-error.js";
import { highlighter } from "../utils/highlighter.js";
import { removeSkill } from "../utils/install-skill.js";
import { logger } from "../utils/logger.js";

const VERSION = process.env.VERSION ?? "0.0.1";

export const remove = new Command()
  .name("remove")
  .description("uninstall the React Grab skill from your agent")
  .action(async () => {
    console.log(`${pc.magenta("✿")} ${pc.bold("React Grab")} ${pc.gray(VERSION)}`);
    console.log();

    try {
      logger.break();
      const removedCount = await removeSkill();

      logger.break();
      if (removedCount === 0) {
        logger.log("React Grab skill is not installed in any detected agent.");
      } else {
        logger.log(
          `${highlighter.success("Removed")} the React Grab skill from ${removedCount} agent${removedCount === 1 ? "" : "s"}.`,
        );
      }
      logger.break();
    } catch (error) {
      handleError(error);
    }
  });
