import { Command } from "commander";
import pc from "picocolors";
import { detectProject } from "../utils/detect.js";
import { handleError } from "../utils/handle-error.js";
import { highlighter } from "../utils/highlighter.js";
import { getAgentsWithSkill, removeReactGrabSkill } from "../utils/install-skill.js";
import { logger } from "../utils/logger.js";
import { spinner } from "../utils/spinner.js";

const VERSION = process.env.VERSION ?? "0.0.1";

export const remove = new Command()
  .name("remove")
  .description("uninstall the React Grab skill from your agent")
  .option("-y, --yes", "skip confirmation prompts", false)
  .option("-c, --cwd <cwd>", "working directory (defaults to current directory)", process.cwd())
  .action(async (opts) => {
    console.log(`${pc.magenta("✿")} ${pc.bold("React Grab")} ${pc.gray(VERSION)}`);
    console.log();

    try {
      const cwd = opts.cwd;

      const preflightSpinner = spinner("Preflight checks.").start();

      await detectProject(cwd);

      const agentsWithSkill = await getAgentsWithSkill();

      if (agentsWithSkill.length === 0) {
        preflightSpinner.succeed();
        logger.break();
        logger.log("React Grab skill is not installed in any detected agent.");
        logger.break();
        process.exit(0);
      }

      preflightSpinner.succeed();

      logger.break();
      const removedAgents = removeReactGrabSkill(agentsWithSkill);

      logger.break();
      logger.log(
        `${highlighter.success("Success!")} Removed the React Grab skill from ${removedAgents.length} agent${removedAgents.length === 1 ? "" : "s"}.`,
      );
      logger.break();
    } catch (error) {
      handleError(error);
    }
  });
