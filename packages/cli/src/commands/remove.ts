import { Command } from "commander";
import pc from "picocolors";
import { prompts } from "../utils/prompts.js";
import { detectProject } from "../utils/detect.js";
import { handleError } from "../utils/handle-error.js";
import { highlighter } from "../utils/highlighter.js";
import { logger } from "../utils/logger.js";
import { spinner } from "../utils/spinner.js";

const VERSION = process.env.VERSION ?? "0.0.1";

export const remove = new Command()
  .name("remove")
  .description("disconnect React Grab from your agent")
  .argument("[agent]", "agent to disconnect (mcp)")
  .option("-y, --yes", "skip confirmation prompts", false)
  .option(
    "-c, --cwd <cwd>",
    "working directory (defaults to current directory)",
    process.cwd(),
  )
  .action(async (agentArg, opts) => {
    console.log(
      `${pc.magenta("✿")} ${pc.bold("React Grab")} ${pc.gray(VERSION)}`,
    );
    console.log();

    try {
      const cwd = opts.cwd;

      const preflightSpinner = spinner("Preflight checks.").start();

      const projectInfo = await detectProject(cwd);

      if (!projectInfo.hasReactGrab) {
        preflightSpinner.fail("React Grab is not installed.");
        logger.break();
        logger.error(
          `Run ${highlighter.info("react-grab init")} first to install React Grab.`,
        );
        logger.break();
        process.exit(1);
      }

      preflightSpinner.succeed();

      if (agentArg && agentArg !== "mcp") {
        logger.break();
        logger.warn(
          `Legacy agent packages are deprecated. Uninstall ${highlighter.info(`@react-grab/${agentArg}`)} manually with your package manager.`,
        );
        logger.break();
        process.exit(0);
      }

      logger.break();
      logger.warn(
        "To remove the MCP server, delete the react-grab-mcp entry from your agent's MCP config file.",
      );
      logger.break();
    } catch (error) {
      handleError(error);
    }
  });
