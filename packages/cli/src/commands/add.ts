import { Command } from "commander";
import pc from "picocolors";
import { detectNonInteractive } from "../utils/is-non-interactive.js";
import { detectProject } from "../utils/detect.js";
import { handleError } from "../utils/handle-error.js";
import { highlighter } from "../utils/highlighter.js";
import { installMcpServers, promptMcpInstall } from "../utils/install-mcp.js";
import { logger } from "../utils/logger.js";
import { spinner } from "../utils/spinner.js";

const VERSION = process.env.VERSION ?? "0.0.1";

export const add = new Command()
  .name("add")
  .alias("install")
  .description("connect React Grab to your agent via MCP")
  .argument("[agent]", "agent to connect (mcp)")
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
      const isNonInteractive = detectNonInteractive(opts.yes);

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
          `Legacy agent packages are deprecated. Use ${highlighter.info("mcp")} instead.`,
        );
        logger.log(
          `Run ${highlighter.info("grab add mcp")} to install the MCP server.`,
        );
        logger.break();
        process.exit(1);
      }

      if (agentArg === "mcp" || isNonInteractive) {
        if (isNonInteractive) {
          const results = installMcpServers();
          const hasSuccess = results.some((result) => result.success);
          if (!hasSuccess) {
            logger.break();
            logger.error("Failed to install MCP server.");
            logger.break();
            process.exit(1);
          }
        } else {
          const didInstall = await promptMcpInstall();
          if (!didInstall) {
            logger.break();
            process.exit(0);
          }
        }
        logger.break();
        logger.log(
          `${highlighter.success("Success!")} MCP server has been configured.`,
        );
        logger.log("Restart your agents to activate.");
        logger.break();
      } else {
        const didInstall = await promptMcpInstall();
        if (!didInstall) {
          logger.break();
          process.exit(0);
        }
        logger.break();
        logger.log(
          `${highlighter.success("Success!")} MCP server has been configured.`,
        );
        logger.log("Restart your agents to activate.");
        logger.break();
      }
    } catch (error) {
      handleError(error);
    }
  });
