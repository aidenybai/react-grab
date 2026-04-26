import { Command } from "commander";
import pc from "picocolors";
import { detectNonInteractive } from "../utils/is-non-interactive.js";
import { detectProject } from "../utils/detect.js";
import { handleError } from "../utils/handle-error.js";
import { highlighter } from "../utils/highlighter.js";
import {
  installDetectedOrAllSkills,
  promptSkillInstall,
  type SkillScope,
} from "../utils/install-skill.js";
import { logger } from "../utils/logger.js";
import { prompts } from "../utils/prompts.js";
import { spinner } from "../utils/spinner.js";

const VERSION = process.env.VERSION ?? "0.0.1";

export const add = new Command()
  .name("add")
  .alias("install")
  .description("connect React Grab to your agent by installing the skill")
  .argument("[agent]", "legacy alias kept for backward compatibility (e.g. mcp, skill)")
  .option("-y, --yes", "skip confirmation prompts", false)
  .option("-c, --cwd <cwd>", "working directory (defaults to current directory)", process.cwd())
  .action(async (agentArg, opts) => {
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

      const VALID_AGENT_ARGS: readonly string[] = ["mcp", "skill"];
      if (agentArg === "mcp") {
        logger.break();
        logger.warn(
          `${highlighter.info("@react-grab/mcp")} is deprecated. Installing the React Grab skill instead.`,
        );
        logger.log(`Run ${highlighter.info("grab install-skill")} directly going forward.`);
        logger.break();
      } else if (agentArg && !VALID_AGENT_ARGS.includes(agentArg)) {
        logger.break();
        logger.error(
          `Unknown agent "${agentArg}". Valid values: ${VALID_AGENT_ARGS.join(", ")} (or omit the argument).`,
        );
        logger.break();
        process.exit(1);
      }

      if (isNonInteractive) {
        const results = installDetectedOrAllSkills("project", cwd);
        const hasSuccess = results.some((result) => result.success);
        if (!hasSuccess) {
          logger.break();
          logger.error("Failed to install React Grab skill.");
          logger.break();
          process.exit(1);
        }
      } else {
        logger.break();
        const { skillScope } = await prompts({
          type: "select",
          name: "skillScope",
          message: "Where should the React Grab skill be installed?",
          choices: [
            { title: "In this project (committed to repo)", value: "project" },
            { title: "Globally (per-user)", value: "global" },
          ],
          initial: 0,
        });

        if (skillScope === undefined) {
          logger.break();
          process.exit(1);
        }

        const didInstall = await promptSkillInstall(skillScope as SkillScope, cwd);
        if (!didInstall) {
          logger.break();
          process.exit(0);
        }
      }

      logger.break();
      logger.log(`${highlighter.success("Success!")} React Grab skill installed.`);
      logger.log("Restart your agent(s) to pick it up.");
      logger.break();
    } catch (error) {
      handleError(error);
    }
  });
