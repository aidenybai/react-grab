import { Command } from "commander";
import pc from "picocolors";
import prompts from "prompts";
import { detectProject } from "../utils/detect.js";
import { printDiff } from "../utils/diff.js";
import { handleError } from "../utils/handle-error.js";
import { highlighter } from "../utils/highlighter.js";
import { getPackagesToInstall, installPackages } from "../utils/install.js";
import { logger } from "../utils/logger.js";
import { spinner } from "../utils/spinner.js";
import type { AgentIntegration } from "../utils/templates.js";
import {
  applyPackageJsonTransform,
  applyTransform,
  previewPackageJsonTransform,
  previewTransform,
} from "../utils/transform.js";

const VERSION = process.env.VERSION ?? "0.0.1";

const AGENT_NAMES: Record<string, string> = {
  "claude-code": "Claude Code",
  cursor: "Cursor",
  opencode: "OpenCode",
  codex: "Codex",
  gemini: "Gemini",
  amp: "Amp",
  "visual-edit": "Visual Edit",
};

export const add = new Command()
  .name("add")
  .description("add an agent integration")
  .argument(
    "[agent]",
    "agent to add (claude-code, cursor, opencode, codex, gemini, amp, visual-edit)",
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

      preflightSpinner.succeed();

      const availableAgents = (
        [
          "claude-code",
          "cursor",
          "opencode",
          "codex",
          "gemini",
          "amp",
          "visual-edit",
        ] as const
      ).filter((agent) => !projectInfo.installedAgents.includes(agent));

      if (availableAgents.length === 0) {
        logger.break();
        logger.success("All agent integrations are already installed.");
        logger.break();
        process.exit(0);
      }

      let agentIntegration: AgentIntegration;

      if (agentArg) {
        if (
          ![
            "claude-code",
            "cursor",
            "opencode",
            "codex",
            "gemini",
            "amp",
            "visual-edit",
          ].includes(agentArg)
        ) {
          logger.break();
          logger.error(`Invalid agent: ${agentArg}`);
          logger.error(
            "Available agents: claude-code, cursor, opencode, codex, gemini, amp, visual-edit",
          );
          logger.break();
          process.exit(1);
        }

        if (projectInfo.installedAgents.includes(agentArg)) {
          logger.break();
          logger.warn(`${AGENT_NAMES[agentArg]} is already installed.`);
          logger.break();
          process.exit(0);
        }

        agentIntegration = agentArg as AgentIntegration;
      } else if (!isNonInteractive) {
        logger.break();
        const { agent } = await prompts({
          type: "select",
          name: "agent",
          message: `Which ${highlighter.info("agent integration")} would you like to add?`,
          choices: availableAgents.map((innerAgent) => ({
            title: AGENT_NAMES[innerAgent],
            value: innerAgent,
          })),
        });

        if (!agent) {
          logger.break();
          process.exit(1);
        }

        agentIntegration = agent;
      } else {
        logger.break();
        logger.error("Please specify an agent to add.");
        logger.error("Available agents: " + availableAgents.join(", "));
        logger.break();
        process.exit(1);
      }

      const addingSpinner = spinner(
        `Adding ${AGENT_NAMES[agentIntegration]}.`,
      ).start();
      addingSpinner.succeed();

      const result = previewTransform(
        projectInfo.projectRoot,
        projectInfo.framework,
        projectInfo.nextRouterType,
        agentIntegration,
        true,
      );

      const packageJsonResult = previewPackageJsonTransform(
        projectInfo.projectRoot,
        agentIntegration,
        projectInfo.installedAgents,
      );

      if (!result.success) {
        logger.break();
        logger.error(result.message);
        logger.break();
        process.exit(1);
      }

      const hasLayoutChanges =
        !result.noChanges && result.originalContent && result.newContent;
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

      const packages = getPackagesToInstall(agentIntegration, false);

      if (packages.length > 0) {
        const installSpinner = spinner(
          `Installing ${packages.join(", ")}.`,
        ).start();

        try {
          installPackages(
            packages,
            projectInfo.packageManager,
            projectInfo.projectRoot,
          );
          installSpinner.succeed();
        } catch (error) {
          installSpinner.fail();
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
        `${highlighter.success("Success!")} ${AGENT_NAMES[agentIntegration]} has been added.`,
      );
      if (packageJsonResult.warning) {
        logger.warn(packageJsonResult.warning);
      } else {
        logger.log("Make sure to start the agent server before using it.");
      }
      logger.break();
    } catch (error) {
      handleError(error);
    }
  });
