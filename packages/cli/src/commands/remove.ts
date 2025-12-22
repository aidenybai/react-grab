import { Command } from "commander";
import pc from "picocolors";
import prompts from "prompts";
import { detectProject } from "../utils/detect.js";
import { printDiff } from "../utils/diff.js";
import { handleError } from "../utils/handle-error.js";
import { highlighter } from "../utils/highlighter.js";
import { getPackagesToUninstall, uninstallPackages } from "../utils/install.js";
import { logger } from "../utils/logger.js";
import { spinner } from "../utils/spinner.js";
import {
  applyPackageJsonTransform,
  applyTransform,
  previewAgentRemoval,
  previewPackageJsonAgentRemoval,
} from "../utils/transform.js";

const VERSION = process.env.VERSION ?? "0.0.1";

const AGENT_NAMES: Record<string, string> = {
  "claude-code": "Claude Code",
  cursor: "Cursor",
  opencode: "OpenCode",
  codex: "Codex",
  gemini: "Gemini",
  amp: "Amp",
  ami: "Ami",
  "visual-edit": "Visual Edit",
};

export const remove = new Command()
  .name("remove")
  .description("remove an agent integration")
  .argument(
    "[agent]",
    "agent to remove (claude-code, cursor, opencode, codex, gemini, amp, ami, visual-edit)",
  )
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
      const isNonInteractive = opts.yes;

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

      if (projectInfo.installedAgents.length === 0) {
        preflightSpinner.succeed();
        logger.break();
        logger.warn("No agent integrations are installed.");
        logger.break();
        process.exit(0);
      }

      preflightSpinner.succeed();

      let agentToRemove: string;

      if (agentArg) {
        if (!projectInfo.installedAgents.includes(agentArg)) {
          logger.break();
          logger.error(`Agent ${highlighter.info(agentArg)} is not installed.`);
          logger.log(
            `Installed agents: ${projectInfo.installedAgents.map((innerAgent) => AGENT_NAMES[innerAgent] || innerAgent).join(", ")}`,
          );
          logger.break();
          process.exit(1);
        }
        agentToRemove = agentArg;
      } else if (!isNonInteractive) {
        logger.break();
        const { agent } = await prompts({
          type: "select",
          name: "agent",
          message: `Which ${highlighter.info("agent integration")} would you like to remove?`,
          choices: projectInfo.installedAgents.map((innerAgent) => ({
            title: AGENT_NAMES[innerAgent] || innerAgent,
            value: innerAgent,
          })),
        });

        if (!agent) {
          logger.break();
          process.exit(1);
        }

        agentToRemove = agent;
      } else {
        logger.break();
        logger.error("Please specify an agent to remove.");
        logger.error(
          "Installed agents: " + projectInfo.installedAgents.join(", "),
        );
        logger.break();
        process.exit(1);
      }

      const removingSpinner = spinner(
        `Preparing to remove ${AGENT_NAMES[agentToRemove] || agentToRemove}.`,
      ).start();
      removingSpinner.succeed();

      const result = previewAgentRemoval(
        projectInfo.projectRoot,
        projectInfo.framework,
        projectInfo.nextRouterType,
        agentToRemove,
      );

      const packageJsonResult = previewPackageJsonAgentRemoval(
        projectInfo.projectRoot,
        agentToRemove,
      );

      const hasLayoutChanges =
        result.success &&
        !result.noChanges &&
        result.originalContent &&
        result.newContent;
      const hasPackageJsonChanges =
        packageJsonResult.success &&
        !packageJsonResult.noChanges &&
        packageJsonResult.originalContent &&
        packageJsonResult.newContent;

      if (hasLayoutChanges || hasPackageJsonChanges) {
        logger.break();

        if (hasLayoutChanges) {
          printDiff(
            result.filePath,
            result.originalContent!,
            result.newContent!,
          );
        }

        if (hasPackageJsonChanges) {
          if (hasLayoutChanges) {
            logger.break();
          }
          printDiff(
            packageJsonResult.filePath,
            packageJsonResult.originalContent!,
            packageJsonResult.newContent!,
          );
        }

        if (!isNonInteractive) {
          logger.break();
          const { proceed } = await prompts({
            type: "confirm",
            name: "proceed",
            message: "Apply these changes?",
            initial: true,
          });

          if (!proceed) {
            logger.break();
            logger.log("Changes cancelled.");
            logger.break();
            process.exit(0);
          }
        }
      }

      const packages = getPackagesToUninstall(agentToRemove);

      if (packages.length > 0) {
        const uninstallSpinner = spinner(
          `Removing ${packages.join(", ")}.`,
        ).start();

        try {
          uninstallPackages(
            packages,
            projectInfo.packageManager,
            projectInfo.projectRoot,
          );
          uninstallSpinner.succeed();
        } catch (error) {
          uninstallSpinner.fail();
          handleError(error);
        }
      }

      if (hasLayoutChanges) {
        const writeSpinner = spinner(
          `Applying changes to ${result.filePath}.`,
        ).start();
        const writeResult = applyTransform(result);
        if (!writeResult.success) {
          writeSpinner.fail();
          logger.break();
          logger.error(writeResult.error || "Failed to write file.");
          logger.break();
          process.exit(1);
        }
        writeSpinner.succeed();
      }

      if (hasPackageJsonChanges) {
        const packageJsonSpinner = spinner(
          `Applying changes to ${packageJsonResult.filePath}.`,
        ).start();
        const packageJsonWriteResult =
          applyPackageJsonTransform(packageJsonResult);
        if (!packageJsonWriteResult.success) {
          packageJsonSpinner.fail();
          logger.break();
          logger.error(packageJsonWriteResult.error || "Failed to write file.");
          logger.break();
          process.exit(1);
        }
        packageJsonSpinner.succeed();
      }

      logger.break();
      logger.log(
        `${highlighter.success("Success!")} ${AGENT_NAMES[agentToRemove] || agentToRemove} has been removed.`,
      );
      logger.break();
    } catch (error) {
      handleError(error);
    }
  });
