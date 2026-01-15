import { Command } from "commander";
import pc from "picocolors";
import prompts from "prompts";
import { detectProject } from "../utils/detect.js";
import { printDiff } from "../utils/diff.js";
import { handleError } from "../utils/handle-error.js";
import { highlighter } from "../utils/highlighter.js";
import {
  getPackagesToInstall,
  getPackagesToUninstall,
  installPackages,
  uninstallPackages,
} from "../utils/install.js";
import { logger } from "../utils/logger.js";
import { spinner } from "../utils/spinner.js";
import {
  AGENTS,
  AGENT_NAMES,
  MCP_CLIENTS,
  MCP_CLIENT_NAMES,
  type Agent,
  type McpClient,
} from "../utils/templates.js";
import { execSync } from "child_process";
import {
  applyPackageJsonTransform,
  applyTransform,
  previewAgentRemoval,
  previewPackageJsonAgentRemoval,
  previewPackageJsonTransform,
  previewTransform,
} from "../utils/transform.js";

const VERSION = process.env.VERSION ?? "0.0.1";

const configureMcp = (
  mcpClient: McpClient,
  cwd: string,
  customPkg?: string,
): void => {
  const mcpCommand = customPkg
    ? `npx -y ${customPkg} browser mcp`
    : `npx -y @react-grab/cli browser mcp`;
  const mcpSpinner = spinner(`Installing MCP server for ${MCP_CLIENT_NAMES[mcpClient]}`).start();

  try {
    execSync(
      `npx -y install-mcp '${mcpCommand}' --client ${mcpClient} --yes`,
      { stdio: "ignore", cwd },
    );
    mcpSpinner.succeed(`MCP server installed for ${MCP_CLIENT_NAMES[mcpClient]}`);
    logger.break();
    process.exit(0);
  } catch {
    mcpSpinner.fail(`Failed to configure MCP for ${MCP_CLIENT_NAMES[mcpClient]}`);
    logger.dim(`Try manually: npx -y install-mcp '${mcpCommand}' --client ${mcpClient}`);
    logger.break();
    process.exit(1);
  }
};

export const add = new Command()
  .name("add")
  .alias("install")
  .description("add browser automation for your AI agent")
  .argument(
    "[agent]",
    `agent to add (${AGENTS.join(", ")}, mcp, skill)`,
  )
  .option("-y, --yes", "skip confirmation prompts", false)
  .option(
    "--client <client>",
    "MCP client to configure (cursor, claude-code, vscode, etc.)",
  )
  .option(
    "--pkg <pkg>",
    "custom package URL for CLI (e.g., @react-grab/cli)",
  )
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

      if (agentArg === "mcp") {
        let mcpClient: McpClient | undefined = opts.client as McpClient;

        // HACK: rename claude to claude-code because we only care about coding tools
        if (mcpClient === ("claude" as McpClient)) {
          mcpClient = "claude-code";
        }

        if (mcpClient && !MCP_CLIENTS.includes(mcpClient)) {
          logger.break();
          logger.error(`Invalid MCP client: ${mcpClient}`);
          logger.error(`Available clients: ${MCP_CLIENTS.join(", ")}`);
          logger.break();
          process.exit(1);
        }

        if (!mcpClient && !isNonInteractive) {
          logger.break();
          const { client } = await prompts({
            type: "select",
            name: "client",
            message: `Which ${highlighter.info("client")} would you like to configure?`,
            choices: MCP_CLIENTS.map((innerClient) => ({
              title: MCP_CLIENT_NAMES[innerClient],
              value: innerClient,
            })),
          });

          if (!client) {
            logger.break();
            process.exit(1);
          }

          mcpClient = client;
        }

        if (!mcpClient) {
          logger.break();
          logger.error("Please specify an MCP client with --client");
          logger.error(`Available clients: ${MCP_CLIENTS.join(", ")}`);
          logger.break();
          process.exit(1);
        }

        configureMcp(mcpClient, cwd, opts.pkg as string | undefined);
      }

      if (agentArg === "skill") {
        logger.break();
        const skillSpinner = spinner("Installing skill").start();
        try {
          execSync("npx -y add-skill aidenybai/react-grab -y", {
            stdio: "ignore",
            cwd,
          });
          skillSpinner.succeed("Skill installed");
          logger.break();
          process.exit(0);
        } catch {
          skillSpinner.fail("Failed to install skill");
          logger.warn("Try manually: npx -y add-skill aidenybai/react-grab");
          logger.break();
          process.exit(1);
        }
      }

      if (!agentArg && !isNonInteractive) {
        logger.break();

        const { addType } = await prompts({
          type: "select",
          name: "addType",
          message: "What would you like to add?",
          choices: [
            {
              title: "MCP Server",
              description: "For Cursor, Claude Code, VS Code, Windsurf, etc.",
              value: "mcp",
            },
            {
              title: "Skill",
              description: "For Codex and other skill-based agents",
              value: "skill",
            },
            {
              title: "Agent Integration",
              description: "Add Claude Code, Cursor, etc. to the React Grab UI",
              value: "agent",
            },
          ],
        });

        if (!addType) {
          logger.break();
          process.exit(1);
        }

        if (addType === "mcp") {
          const { client } = await prompts({
            type: "select",
            name: "client",
            message: `Which ${highlighter.info("client")} would you like to configure?`,
            choices: MCP_CLIENTS.map((innerClient) => ({
              title: MCP_CLIENT_NAMES[innerClient],
              value: innerClient,
            })),
          });

          if (!client) {
            logger.break();
            process.exit(1);
          }

          configureMcp(client as McpClient, cwd, opts.pkg as string | undefined);
        }

        if (addType === "skill") {
          const skillSpinner = spinner("Installing skill").start();
          try {
            execSync("npx -y add-skill aidenybai/react-grab -y", {
              stdio: "ignore",
              cwd,
            });
            skillSpinner.succeed("Skill installed");
            logger.break();
            process.exit(0);
          } catch {
            skillSpinner.fail("Failed to install skill");
            logger.warn("Try manually: npx -y add-skill aidenybai/react-grab");
            logger.break();
            process.exit(1);
          }
        }
      }

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

      const availableAgents = AGENTS.filter(
        (agent) => !projectInfo.installedAgents.includes(agent),
      );

      if (availableAgents.length === 0) {
        logger.break();
        logger.success("All agent integrations are already installed.");
        logger.break();
        process.exit(0);
      }

      let agentIntegration: Agent;
      let agentsToRemove: Agent[] = [];

      if (agentArg) {
        if (!AGENTS.includes(agentArg as (typeof AGENTS)[number])) {
          logger.break();
          logger.error(`Invalid agent: ${agentArg}`);
          logger.error(`Available agents: ${AGENTS.join(", ")}`);
          logger.break();
          process.exit(1);
        }

        const validAgent = agentArg as Agent;

        if (projectInfo.installedAgents.includes(validAgent)) {
          logger.break();
          logger.warn(`${AGENT_NAMES[validAgent]} is already installed.`);
          logger.break();
          process.exit(0);
        }

        agentIntegration = validAgent;

        if (projectInfo.installedAgents.length > 0 && !isNonInteractive) {
          const installedNames = projectInfo.installedAgents
            .map((innerAgent) => AGENT_NAMES[innerAgent as Agent] || innerAgent)
            .join(", ");

          logger.break();
          logger.warn(`${installedNames} is already installed.`);

          const { action } = await prompts({
            type: "select",
            name: "action",
            message: "How would you like to proceed?",
            choices: [
              {
                title: `Replace with ${AGENT_NAMES[agentIntegration]}`,
                value: "replace",
              },
              {
                title: `Add ${AGENT_NAMES[agentIntegration]} alongside existing`,
                value: "add",
              },
              { title: "Cancel", value: "cancel" },
            ],
          });

          if (!action || action === "cancel") {
            logger.break();
            logger.log("Changes cancelled.");
            logger.break();
            process.exit(0);
          }

          if (action === "replace") {
            agentsToRemove = [...projectInfo.installedAgents] as Agent[];
          }
        }
      } else if (!isNonInteractive) {
        if (projectInfo.installedAgents.length > 0) {
          const installedNames = projectInfo.installedAgents
            .map((innerAgent) => AGENT_NAMES[innerAgent as Agent] || innerAgent)
            .join(", ");
          logger.warn(`Currently installed: ${installedNames}`);
          logger.break();
        }

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

        if (projectInfo.installedAgents.length > 0) {
          const installedNames = projectInfo.installedAgents
            .map((innerAgent) => AGENT_NAMES[innerAgent as Agent] || innerAgent)
            .join(", ");

          const { action } = await prompts({
            type: "select",
            name: "action",
            message: "How would you like to proceed?",
            choices: [
              {
                title: `Replace ${installedNames} with ${AGENT_NAMES[agentIntegration]}`,
                value: "replace",
              },
              {
                title: `Add ${AGENT_NAMES[agentIntegration]} alongside existing`,
                value: "add",
              },
              { title: "Cancel", value: "cancel" },
            ],
          });

          if (!action || action === "cancel") {
            logger.break();
            logger.log("Changes cancelled.");
            logger.break();
            process.exit(0);
          }

          if (action === "replace") {
            agentsToRemove = [...projectInfo.installedAgents] as Agent[];
          }
        }
      } else {
        logger.break();
        logger.error("Please specify an agent to add.");
        logger.error("Available agents: " + availableAgents.join(", "));
        logger.break();
        process.exit(1);
      }

      if (agentsToRemove.length > 0) {
        for (const agentToRemove of agentsToRemove) {
          const removalResult = previewAgentRemoval(
            projectInfo.projectRoot,
            projectInfo.framework,
            projectInfo.nextRouterType,
            agentToRemove,
          );

          const removalPackageJsonResult = previewPackageJsonAgentRemoval(
            projectInfo.projectRoot,
            agentToRemove,
          );

          const packagesToRemove = getPackagesToUninstall(agentToRemove);

          if (packagesToRemove.length > 0) {
            const uninstallSpinner = spinner(
              `Removing ${packagesToRemove.join(", ")}.`,
            ).start();

            try {
              uninstallPackages(
                packagesToRemove,
                projectInfo.packageManager,
                projectInfo.projectRoot,
              );
              uninstallSpinner.succeed();
            } catch (error) {
              uninstallSpinner.fail();
              handleError(error);
            }
          }

          if (
            removalResult.success &&
            !removalResult.noChanges &&
            removalResult.newContent
          ) {
            const removeWriteSpinner = spinner(
              `Removing ${AGENT_NAMES[agentToRemove]} from ${removalResult.filePath}.`,
            ).start();
            const writeResult = applyTransform(removalResult);
            if (!writeResult.success) {
              removeWriteSpinner.fail();
              logger.break();
              logger.error(writeResult.error || "Failed to write file.");
              logger.break();
              process.exit(1);
            }
            removeWriteSpinner.succeed();
          }

          if (
            removalPackageJsonResult.success &&
            !removalPackageJsonResult.noChanges &&
            removalPackageJsonResult.newContent
          ) {
            const removePackageJsonSpinner = spinner(
              `Removing ${AGENT_NAMES[agentToRemove]} from ${removalPackageJsonResult.filePath}.`,
            ).start();
            const packageJsonWriteResult = applyPackageJsonTransform(
              removalPackageJsonResult,
            );
            if (!packageJsonWriteResult.success) {
              removePackageJsonSpinner.fail();
              logger.break();
              logger.error(
                packageJsonWriteResult.error || "Failed to write file.",
              );
              logger.break();
              process.exit(1);
            }
            removePackageJsonSpinner.succeed();
          }
        }

        projectInfo.installedAgents = projectInfo.installedAgents.filter(
          (innerAgent) => !agentsToRemove.includes(innerAgent as Agent),
        );
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
        projectInfo.packageManager,
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

        if (!isNonInteractive && agentsToRemove.length === 0) {
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
