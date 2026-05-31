import { resolve } from "node:path";
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
  .option("-c, --cwd <cwd>", "working directory (defaults to current directory)", process.cwd())
  .option("-g, --global", "remove the globally-installed skill instead of the project's", false)
  .action(async (opts) => {
    console.log(`${pc.magenta("✿")} ${pc.bold("React Grab")} ${pc.gray(VERSION)}`);
    console.log();

    try {
      logger.break();
      const removedCount = await removeSkill({ cwd: resolve(opts.cwd), global: opts.global });

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
