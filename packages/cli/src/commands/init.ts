import { Command } from "commander";
import pc from "picocolors";
import prompts from "prompts";
import {
  applyPackageJsonWithFeedback,
  applyTransformWithFeedback,
  formatInstalledAgentNames,
  installPackagesWithFeedback,
  uninstallPackagesWithFeedback,
} from "../utils/cli-helpers.js";
import {
  detectProject,
  findWorkspaceProjects,
  type Framework,
  type PackageManager,
  type UnsupportedFramework,
} from "../utils/detect.js";
import { printDiff } from "../utils/diff.js";
import { handleError } from "../utils/handle-error.js";
import { highlighter } from "../utils/highlighter.js";
import {
  getPackagesToInstall,
  getPackagesToUninstall,
} from "../utils/install.js";
import { logger } from "../utils/logger.js";
import { spinner } from "../utils/spinner.js";
import {
  AGENTS,
  AGENT_NAMES,
  type AgentIntegration,
} from "../utils/templates.js";
import { execSync } from "child_process";
import { detectSkillAgents } from "../utils/cli-helpers.js";
import {
  previewAgentRemoval,
  previewOptionsTransform,
  previewPackageJsonAgentRemoval,
  previewPackageJsonTransform,
  previewTransform,
  type ReactGrabOptions,
} from "../utils/transform.js";

const VERSION = process.env.VERSION ?? "0.0.1";
const REPORT_URL = "https://react-grab.com/api/report-cli";
const DOCS_URL = "https://github.com/aidenybai/react-grab";

const promptSkillInstall = async (cwd: string): Promise<void> => {
  const detectedAgents = detectSkillAgents(cwd);

  if (detectedAgents.length === 0) {
    return;
  }

  logger.log(`The ${highlighter.info("React Grab skill")} gives your agent access to the browser.`);
  logger.log(`Learn more at ${highlighter.info("https://skill.md")}`);
  logger.break();

  const { wantSkill } = await prompts({
    type: "confirm",
    name: "wantSkill",
    message: `Would you like to install the skill?`,
    initial: true,
  });

  if (!wantSkill) return;

  const { selectedAgent } = await prompts({
    type: "select",
    name: "selectedAgent",
    message: `Which ${highlighter.info("agent")} would you like to install the skill for?`,
    choices: [
      ...detectedAgents.map((agent) => ({
        title: agent.name,
        value: agent,
      })),
      { title: "Skip", value: null },
    ],
  });

  if (selectedAgent) {
    logger.break();
    const skillSpinner = spinner(`Installing skill for ${selectedAgent.name}`).start();
    try {
      execSync(`npx -y add-skill aidenybai/react-grab -y --agent ${selectedAgent.id}`, {
        stdio: "ignore",
        cwd,
      });
      skillSpinner.succeed(`Skill installed for ${selectedAgent.name}.`);
    } catch {
      skillSpinner.fail(`Failed to install skill for ${selectedAgent.name}.`);
      logger.warn(`Try manually: npx -y add-skill aidenybai/react-grab --agent ${selectedAgent.id}`);
    }
  }

  logger.break();
};

interface ReportConfig {
  framework: string;
  packageManager: string;
  router?: string;
  agent?: string;
  isMonorepo: boolean;
}

const reportToCli = (
  type: "error" | "completed",
  config?: ReportConfig,
  error?: Error,
): void => {
  fetch(REPORT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type,
      version: VERSION,
      config,
      error: error
        ? { message: error.message, stack: error.stack }
        : undefined,
      timestamp: new Date().toISOString(),
    }),
  }).catch(() => {});
};

const FRAMEWORK_NAMES: Record<Framework, string> = {
  next: "Next.js",
  vite: "Vite",
  webpack: "Webpack",
  unknown: "Unknown",
};

const PACKAGE_MANAGER_NAMES: Record<PackageManager, string> = {
  npm: "npm",
  yarn: "Yarn",
  pnpm: "pnpm",
  bun: "Bun",
};

const UNSUPPORTED_FRAMEWORK_NAMES: Record<
  NonNullable<UnsupportedFramework>,
  string
> = {
  remix: "Remix",
  astro: "Astro",
  sveltekit: "SvelteKit",
  gatsby: "Gatsby",
};

const getAgentName = (agent: string): string => {
  if (agent in AGENT_NAMES) {
    return AGENT_NAMES[agent as keyof typeof AGENT_NAMES];
  }
  return agent;
};

const formatActivationKeyDisplay = (
  activationKey: ReactGrabOptions["activationKey"],
): string => {
  if (!activationKey) return "Default (Option/Alt)";
  return activationKey
    .split("+")
    .map((part) => {
      const lower = part.toLowerCase();
      if (lower === "meta") return process.platform === "darwin" ? "⌘" : "Win";
      if (lower === "alt") return process.platform === "darwin" ? "⌥" : "Alt";
      if (lower === "ctrl") return "Ctrl";
      if (lower === "shift") return "Shift";
      if (lower === "space" || lower === " ") return "Space";
      return part.toUpperCase();
    })
    .join(" + ");
};

export const init = new Command()
  .name("init")
  .description("initialize React Grab in your project")
  .option("-y, --yes", "skip confirmation prompts", false)
  .option("-f, --force", "force overwrite existing config", false)
  .option(
    "-a, --agent <agent>",
    "agent integration (claude-code, cursor, opencode, codex, gemini, amp, visual-edit)",
  )
  .option(
    "-k, --key <key>",
    "activation key (e.g., Meta+K, Ctrl+Shift+G, Space)",
  )
  .option("--skip-install", "skip package installation", false)
  .option(
    "--pkg <pkg>",
    "custom package URL for CLI (e.g., grab)",
  )
  .option(
    "-c, --cwd <cwd>",
    "working directory (defaults to current directory)",
    process.cwd(),
  )
  .action(async (opts) => {
    console.log(
      `${pc.magenta("✿")} ${pc.bold("React Grab")} ${pc.gray(VERSION)}`,
    );
    console.log();

    try {
      const cwd = opts.cwd;
      const isNonInteractive = opts.yes;

      const preflightSpinner = spinner("Preflight checks.").start();

      const projectInfo = await detectProject(cwd);

      const removeAgents = async (agentsToRemove: string[], skipInstall: boolean = false) => {
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

          if (!skipInstall) {
            uninstallPackagesWithFeedback(
              getPackagesToUninstall(agentToRemove),
              projectInfo.packageManager,
              projectInfo.projectRoot,
            );
          }

          if (removalResult.success && !removalResult.noChanges && removalResult.newContent) {
            applyTransformWithFeedback(
              removalResult,
              `Removing ${getAgentName(agentToRemove)} from ${removalResult.filePath}.`,
            );
          }

          if (removalPackageJsonResult.success && !removalPackageJsonResult.noChanges && removalPackageJsonResult.newContent) {
            applyPackageJsonWithFeedback(
              removalPackageJsonResult,
              `Removing ${getAgentName(agentToRemove)} from ${removalPackageJsonResult.filePath}.`,
            );
          }
        }
      };

      if (projectInfo.hasReactGrab && !opts.force) {
        preflightSpinner.succeed();

        if (isNonInteractive) {
          logger.break();
          logger.warn("React Grab is already installed.");
          logger.log(
            `Use ${highlighter.info("--force")} to reconfigure, or remove ${highlighter.info("--yes")} for interactive mode.`,
          );
          logger.break();
          process.exit(0);
        }

        logger.break();
        logger.success("React Grab is already installed.");
        logger.break();

        if (projectInfo.installedAgents.length > 0) {
          logger.log(
            `Currently installed agents: ${highlighter.info(formatInstalledAgentNames(projectInfo.installedAgents))}`,
          );
          logger.break();
        }

        await promptSkillInstall(cwd);

        const { wantCustomizeOptions } = await prompts({
          type: "confirm",
          name: "wantCustomizeOptions",
          message: `Would you like to customize ${highlighter.info("options")}?`,
          initial: false,
        });

        if (wantCustomizeOptions === undefined) {
          logger.break();
          process.exit(1);
        }

        if (wantCustomizeOptions || opts.key) {
          logger.break();
          logger.log(`Configure ${highlighter.info("React Grab")} options:`);
          logger.break();

          const collectedOptions: ReactGrabOptions = {};

          if (opts.key) {
            collectedOptions.activationKey = opts.key;
            logger.log(
              `  Activation key: ${highlighter.info(formatActivationKeyDisplay(collectedOptions.activationKey))}`,
            );
          } else {
            const { wantActivationKey } = await prompts({
              type: "confirm",
              name: "wantActivationKey",
              message: `Configure ${highlighter.info("activation key")}?`,
              initial: false,
            });

            if (wantActivationKey === undefined) {
              logger.break();
              process.exit(1);
            }

            if (wantActivationKey) {
              const { key } = await prompts({
                type: "text",
                name: "key",
                message: "Enter the activation key (e.g., g, k, space):",
                initial: "",
              });

              if (key === undefined) {
                logger.break();
                process.exit(1);
              }

              collectedOptions.activationKey = key ? key.toLowerCase() : undefined;

              logger.log(
                `  Activation key: ${highlighter.info(formatActivationKeyDisplay(collectedOptions.activationKey))}`,
              );
            }
          }

          const { activationMode } = await prompts({
            type: "select",
            name: "activationMode",
            message: `Select ${highlighter.info("activation mode")}:`,
            choices: [
              {
                title: "Toggle (press to activate/deactivate)",
                value: "toggle",
              },
              { title: "Hold (hold key to keep active)", value: "hold" },
            ],
            initial: 0,
          });

          if (activationMode === undefined) {
            logger.break();
            process.exit(1);
          }

          collectedOptions.activationMode = activationMode;

          if (activationMode === "hold") {
            const { keyHoldDuration } = await prompts({
              type: "number",
              name: "keyHoldDuration",
              message: `Enter ${highlighter.info("key hold duration")} in milliseconds:`,
              initial: 150,
              min: 0,
              max: 2000,
            });

            if (keyHoldDuration === undefined) {
              logger.break();
              process.exit(1);
            }

            collectedOptions.keyHoldDuration = keyHoldDuration;
          }

          const { allowActivationInsideInput } = await prompts({
            type: "confirm",
            name: "allowActivationInsideInput",
            message: `Allow activation ${highlighter.info("inside input fields")}?`,
            initial: true,
          });

          if (allowActivationInsideInput === undefined) {
            logger.break();
            process.exit(1);
          }

          collectedOptions.allowActivationInsideInput =
            allowActivationInsideInput;

          const { maxContextLines } = await prompts({
            type: "number",
            name: "maxContextLines",
            message: `Enter ${highlighter.info("max context lines")} to include:`,
            initial: 3,
            min: 0,
            max: 50,
          });

          if (maxContextLines === undefined) {
            logger.break();
            process.exit(1);
          }

          collectedOptions.maxContextLines = maxContextLines;

          const optionsResult = previewOptionsTransform(
            projectInfo.projectRoot,
            projectInfo.framework,
            projectInfo.nextRouterType,
            collectedOptions,
          );

          if (!optionsResult.success) {
            logger.break();
            logger.error(optionsResult.message);
            logger.break();
            process.exit(1);
          }

          const hasOptionsChanges =
            !optionsResult.noChanges &&
            optionsResult.originalContent &&
            optionsResult.newContent;

          if (hasOptionsChanges) {
            logger.break();
            printDiff(
              optionsResult.filePath,
              optionsResult.originalContent!,
              optionsResult.newContent!,
            );

            logger.break();
            const { proceed } = await prompts({
              type: "confirm",
              name: "proceed",
              message: "Apply these changes?",
              initial: true,
            });

            if (!proceed) {
              logger.break();
              logger.log("Options configuration cancelled.");
            } else {
              applyTransformWithFeedback(optionsResult);

              logger.break();
              logger.success("React Grab options have been configured.");
            }
          } else {
            logger.break();
            logger.log("No option changes needed.");
          }
        }

        const availableAgents = AGENTS.filter(
          (agent) => !projectInfo.installedAgents.includes(agent),
        );

        if (availableAgents.length > 0) {
          logger.break();
          const { wantAddAgent } = await prompts({
            type: "confirm",
            name: "wantAddAgent",
            message: `Would you like to add an ${highlighter.info("agent integration")}?`,
            initial: false,
          });

          if (wantAddAgent === undefined) {
            logger.break();
            process.exit(1);
          }

          if (wantAddAgent) {
            const { agent } = await prompts({
              type: "select",
              name: "agent",
              message: `Which ${highlighter.info("agent integration")} would you like to add?`,
              choices: [
                ...availableAgents.map((innerAgent) => ({
                  title: getAgentName(innerAgent),
                  value: innerAgent,
                })),
                { title: "Skip", value: "skip" },
              ],
            });

            if (agent === undefined || agent === "skip") {
              logger.break();
              process.exit(0);
            }

            const agentIntegration = agent as AgentIntegration;
            let agentsToRemove: string[] = [];

            if (projectInfo.installedAgents.length > 0) {
              const installedNames = formatInstalledAgentNames(projectInfo.installedAgents);

              const { action } = await prompts({
                type: "select",
                name: "action",
                message: "How would you like to proceed?",
                choices: [
                  {
                    title: `Replace ${installedNames} with ${getAgentName(agentIntegration)}`,
                    value: "replace",
                  },
                  {
                    title: `Add ${getAgentName(agentIntegration)} alongside existing`,
                    value: "add",
                  },
                  { title: "Cancel", value: "cancel" },
                ],
              });

              if (!action || action === "cancel") {
                logger.break();
                logger.log("Agent addition cancelled.");
              } else {
                if (action === "replace") {
                  agentsToRemove = [...projectInfo.installedAgents];
                }

                if (agentsToRemove.length > 0) {
                  await removeAgents(agentsToRemove);
                  projectInfo.installedAgents =
                    projectInfo.installedAgents.filter(
                      (innerAgent) => !agentsToRemove.includes(innerAgent),
                    );
                }

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

                  if (agentsToRemove.length === 0) {
                    logger.break();
                    const { proceed } = await prompts({
                      type: "confirm",
                      name: "proceed",
                      message: "Apply these changes?",
                      initial: true,
                    });

                    if (!proceed) {
                      logger.break();
                      logger.log("Agent addition cancelled.");
                    } else {
                      installPackagesWithFeedback(
                        getPackagesToInstall(agentIntegration, false),
                        projectInfo.packageManager,
                        projectInfo.projectRoot,
                      );

                      if (hasLayoutChanges) {
                        applyTransformWithFeedback(result);
                      }

                      if (hasPackageJsonChanges) {
                        applyPackageJsonWithFeedback(packageJsonResult);
                      }

                      logger.break();
                      logger.success(
                        `${getAgentName(agentIntegration)} has been added.`,
                      );
                    }
                  } else {
                    installPackagesWithFeedback(
                      getPackagesToInstall(agentIntegration, false),
                      projectInfo.packageManager,
                      projectInfo.projectRoot,
                    );

                    if (hasLayoutChanges) {
                      applyTransformWithFeedback(result);
                    }

                    if (hasPackageJsonChanges) {
                      applyPackageJsonWithFeedback(packageJsonResult);
                    }

                    logger.break();
                    logger.success(
                      `${getAgentName(agentIntegration)} has been added.`,
                    );
                  }
                }
              }
            }
          }
        }

        logger.break();
        process.exit(0);
      }

      preflightSpinner.succeed();

      const frameworkSpinner = spinner("Verifying framework.").start();

      if (projectInfo.unsupportedFramework) {
        const frameworkName =
          UNSUPPORTED_FRAMEWORK_NAMES[projectInfo.unsupportedFramework];
        frameworkSpinner.fail(`Found ${highlighter.info(frameworkName)}.`);
        logger.break();
        logger.log(`${frameworkName} is not yet supported by automatic setup.`);
        logger.log(`Visit ${highlighter.info(DOCS_URL)} for manual setup.`);
        logger.break();
        process.exit(1);
      }

      if (projectInfo.framework === "unknown") {
        if (projectInfo.isMonorepo && !isNonInteractive) {
          frameworkSpinner.info("Verifying framework. Found monorepo.");

          const workspaceProjects = findWorkspaceProjects(
            projectInfo.projectRoot,
          );
          const reactProjects = workspaceProjects.filter(
            (project) => project.hasReact || project.framework !== "unknown",
          );

          if (reactProjects.length > 0) {
            logger.break();
            const sortedProjects = [...reactProjects].sort(
              (projectA, projectB) => {
                if (
                  projectA.framework === "unknown" &&
                  projectB.framework !== "unknown"
                )
                  return 1;
                if (
                  projectA.framework !== "unknown" &&
                  projectB.framework === "unknown"
                )
                  return -1;
                return 0;
              },
            );
            const { selectedProject } = await prompts({
              type: "select",
              name: "selectedProject",
              message: "Select a project to install React Grab:",
              choices: [
                ...sortedProjects.map((project) => {
                  const frameworkLabel =
                    project.framework !== "unknown"
                      ? ` ${highlighter.dim(`(${FRAMEWORK_NAMES[project.framework]})`)}`
                      : "";
                  return {
                    title: `${project.name}${frameworkLabel}`,
                    value: project.path,
                  };
                }),
                { title: "Skip", value: "skip" },
              ],
            });

            if (!selectedProject || selectedProject === "skip") {
              logger.break();
              await promptSkillInstall(cwd);
              process.exit(0);
            }

            process.chdir(selectedProject);
            const newProjectInfo = await detectProject(selectedProject);
            Object.assign(projectInfo, newProjectInfo);

            const newFrameworkSpinner = spinner("Verifying framework.").start();
            newFrameworkSpinner.succeed(
              `Verifying framework. Found ${highlighter.info(FRAMEWORK_NAMES[newProjectInfo.framework])}.`,
            );
          } else {
            frameworkSpinner.fail("Could not detect a supported framework.");
            logger.break();
            logger.log(`Visit ${highlighter.info(DOCS_URL)} for manual setup.`);
            logger.break();
            process.exit(1);
          }
        } else {
          frameworkSpinner.fail("Could not detect a supported framework.");
          logger.break();
          logger.log(
            "React Grab supports Next.js, Vite, and Webpack projects.",
          );
          logger.log(`Visit ${highlighter.info(DOCS_URL)} for manual setup.`);
          logger.break();
          process.exit(1);
        }
      } else {
        frameworkSpinner.succeed(
          `Verifying framework. Found ${highlighter.info(FRAMEWORK_NAMES[projectInfo.framework])}.`,
        );
      }

      if (projectInfo.framework === "next") {
        const routerSpinner = spinner("Detecting router type.").start();
        routerSpinner.succeed(
          `Detecting router type. Found ${highlighter.info(projectInfo.nextRouterType === "app" ? "App Router" : "Pages Router")}.`,
        );
      }

      const packageManagerSpinner = spinner(
        "Detecting package manager.",
      ).start();
      packageManagerSpinner.succeed(
        `Detecting package manager. Found ${highlighter.info(PACKAGE_MANAGER_NAMES[projectInfo.packageManager])}.`,
      );

      const finalFramework = projectInfo.framework;
      const finalPackageManager = projectInfo.packageManager;
      const finalNextRouterType = projectInfo.nextRouterType;
      const agentIntegration: AgentIntegration =
        (opts.agent as AgentIntegration) || "none";
      const agentsToRemove: string[] = [];

      const result = previewTransform(
        projectInfo.projectRoot,
        finalFramework,
        finalNextRouterType,
        agentIntegration,
        false,
      );

      const packageJsonResult = previewPackageJsonTransform(
        projectInfo.projectRoot,
        agentIntegration,
        projectInfo.installedAgents,
        finalPackageManager,
      );

      if (!result.success) {
        logger.break();
        logger.error(result.message);
        logger.error(`Visit ${highlighter.info(DOCS_URL)} for manual setup.`);
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

        logger.break();
        logger.warn("Auto-detection may not be 100% accurate.");
        logger.warn("Please verify the changes before committing.");

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

      if (agentsToRemove.length > 0) {
        await removeAgents(agentsToRemove, opts.skipInstall);
        projectInfo.installedAgents = projectInfo.installedAgents.filter(
          (agent) => !agentsToRemove.includes(agent),
        );
      }

      const shouldInstallReactGrab = !projectInfo.hasReactGrab;
      const shouldInstallAgent =
        agentIntegration !== "none" &&
        !projectInfo.installedAgents.includes(agentIntegration);

      if (!opts.skipInstall && (shouldInstallReactGrab || shouldInstallAgent)) {
        installPackagesWithFeedback(
          getPackagesToInstall(agentIntegration, shouldInstallReactGrab),
          finalPackageManager,
          projectInfo.projectRoot,
        );
      }

      if (hasLayoutChanges) {
        applyTransformWithFeedback(result);
      }

      if (hasPackageJsonChanges) {
        applyPackageJsonWithFeedback(packageJsonResult);
      }

      logger.break();
      logger.log(
        `${highlighter.success("Success!")} React Grab has been installed.`,
      );
      if (packageJsonResult.warning) {
        logger.break();
        logger.warn(packageJsonResult.warning);
        logger.break();
      } else {
        logger.log("You may now start your development server.");
      }
      logger.break();

      if (!isNonInteractive) {
        await promptSkillInstall(cwd);
      }

      reportToCli("completed", {
        framework: finalFramework,
        packageManager: finalPackageManager,
        router: finalNextRouterType,
        agent: agentIntegration !== "none" ? agentIntegration : undefined,
        isMonorepo: projectInfo.isMonorepo,
      });
    } catch (error) {
      handleError(error);
      reportToCli("error", undefined, error as Error);
    }
  });
