import { Command } from "commander";
import pc from "picocolors";
import { detectNonInteractive } from "../utils/is-non-interactive.js";
import { detectProject } from "../utils/detect.js";
import { handleError } from "../utils/handle-error.js";
import { highlighter } from "../utils/highlighter.js";
import {
  detectSkillAgents,
  installReactGrabSkill,
  promptSkillInstall,
} from "../utils/install-skill.js";
import { logger } from "../utils/logger.js";
import { spinner } from "../utils/spinner.js";

const VERSION = process.env.VERSION ?? "0.0.1";

export const add = new Command()
  .name("add")
  .alias("install")
  .description("install the React Grab skill for your agent")
  .option("-y, --yes", "skip confirmation prompts", false)
  .option("-c, --cwd <cwd>", "working directory (defaults to current directory)", process.cwd())
  .action(async (opts) => {
    console.log(`${pc.magenta("✿")} ${pc.bold("React Grab")} ${pc.gray(VERSION)}`);
    console.log();

    try {
      const cwd = opts.cwd;
      const isNonInteractive = detectNonInteractive(opts.yes);

      const preflightSpinner = spinner("Preflight checks.").start();

      const projectInfo = await detectProject(cwd);

      if (!projectInfo.hasReactGrab) {
        preflightSpinner.fail("React Grab is not installed.");
        logger.break();
        logger.error(`Run ${highlighter.info("react-grab init")} first to install React Grab.`);
        logger.break();
        process.exit(1);
      }

      preflightSpinner.succeed();

      let didInstall = false;

      if (isNonInteractive) {
        const agents = await detectSkillAgents();
        if (agents.length === 0) {
          logger.break();
          logger.error("No supported agents detected on this machine.");
          logger.break();
          process.exit(1);
        }
        logger.break();
        const result = await installReactGrabSkill(agents);
        didInstall = result.installed.length > 0;
      } else {
        didInstall = await promptSkillInstall();
      }

      if (!didInstall) {
        logger.break();
        process.exit(0);
      }

      logger.break();
      logger.log(`${highlighter.success("Success!")} React Grab skill has been installed.`);
      logger.break();
    } catch (error) {
      handleError(error);
    }
  });
