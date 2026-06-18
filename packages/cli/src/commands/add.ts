import { resolve } from "node:path";
import { Command } from "commander";
import pc from "picocolors";
import { detectNonInteractive } from "../utils/is-non-interactive.js";
import { detectProject } from "../utils/detect.js";
import { handleError } from "../utils/handle-error.js";
import { highlighter } from "../utils/highlighter.js";
import { promptSkillInstall } from "../utils/prompt-skill-install.js";
import { logger } from "../utils/logger.js";
import { spinner } from "../utils/spinner.js";

const VERSION = process.env.VERSION ?? "0.0.1";

export const add = new Command()
  .name("add")
  .alias("install")
  .description("install the React Grab skill for your agent")
  .option("-y, --yes", "skip confirmation prompts", false)
  .option("-c, --cwd <cwd>", "working directory (defaults to current directory)", process.cwd())
  .option("-g, --global", "install the skill globally instead of in the project", false)
  .action(async (opts) => {
    console.log(`${pc.magenta("✿")} ${pc.bold("React Grab")} ${pc.gray(VERSION)}`);
    console.log();

    try {
      const isNonInteractive = detectNonInteractive(opts.yes);

      const preflightSpinner = spinner("Preflight checks.").start();
      const projectInfo = await detectProject(opts.cwd);

      if (!projectInfo.hasReactGrab) {
        preflightSpinner.fail("React Grab is not installed.");
        logger.break();
        logger.error(`Run ${highlighter.info("react-grab init")} first to install React Grab.`);
        logger.break();
        process.exit(1);
      }

      preflightSpinner.succeed();
      logger.break();

      const didInstall = await promptSkillInstall({
        yes: isNonInteractive,
        global: opts.global,
        cwd: resolve(opts.cwd),
      });
      // In non-interactive mode a falsy result is a real failure (no agents or
      // install error), not a user declining the prompt — surface it to CI.
      if (!didInstall && isNonInteractive) {
        logger.break();
        process.exit(1);
      }
      logger.break();
    } catch (error) {
      handleError(error);
    }
  });
