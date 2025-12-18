import { Command } from "commander";
import pc from "picocolors";
import prompts from "prompts";
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
  installPackages,
  uninstallPackages,
} from "../utils/install.js";
import { logger } from "../utils/logger.js";
import { spinner } from "../utils/spinner.js";
import type { AgentIntegration } from "../utils/templates.js";
import {
  applyPackageJsonTransform,
  applyTransform,
  previewAgentRemoval,
  previewPackageJsonAgentRemoval,
  previewPackageJsonTransform,
  previewTransform,
} from "../utils/transform.js";

const VERSION = process.env.VERSION ?? "0.0.1";
const REPORT_URL = "https://react-grab.com/api/report-cli";
const DOCS_URL = "https://github.com/aidenybai/react-grab";

interface ReportConfig {
  framework: string;
  packageManager: string;
  router?: string;
  agent?: string;
  isMonorepo: boolean;
}

const reportToCli = async (
  type: "error" | "completed",
  config?: ReportConfig,
  error?: Error,
): Promise<void> => {
  try {
    await fetch(REPORT_URL, {
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
  } catch {}
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

export const init = new Command()
  .name("init")
  .description("initialize React Grab in your project")
  .option("-y, --yes", "skip confirmation prompts", false)
  .option("-f, --force", "force overwrite existing config", false)
  .option(
    "-a, --agent <agent>",
    "agent integration (claude-code, cursor, opencode, codex, gemini, amp, visual-edit)",
  )
  .option("--skip-install", "skip package installation", false)
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

      if (projectInfo.hasReactGrab && !opts.force) {
        preflightSpinner.succeed();
        logger.break();
        logger.warn("React Grab is already installed.");
        logger.log(
          `Use ${highlighter.info("--force")} to reconfigure, or ${highlighter.info("npx grab@latest add")} to add an agent.`,
        );
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
              choices: sortedProjects.map((project) => {
                const frameworkLabel =
                  project.framework !== "unknown"
                    ? ` ${highlighter.dim(`(${FRAMEWORK_NAMES[project.framework]})`)}`
                    : "";
                return {
                  title: `${project.name}${frameworkLabel}`,
                  value: project.path,
                };
              }),
            });

            if (!selectedProject) {
              logger.break();
              process.exit(1);
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

      let finalFramework = projectInfo.framework;
      let finalPackageManager = projectInfo.packageManager;
      let finalNextRouterType = projectInfo.nextRouterType;
      let agentIntegration: AgentIntegration =
        (opts.agent as AgentIntegration) || "none";
      let agentsToRemove: string[] = [];

      if (!isNonInteractive && !opts.agent) {
        logger.break();

        if (opts.force && projectInfo.installedAgents.length > 0) {
          const installedNames = projectInfo.installedAgents
            .map((innerAgent) => AGENT_NAMES[innerAgent] || innerAgent)
            .join(", ");
          logger.warn(`Currently installed: ${installedNames}`);
          logger.break();
        }

        const { agent } = await prompts({
          type: "select",
          name: "agent",
          message: `Would you like to add an ${highlighter.info("agent integration")}?`,
          choices: [
            { title: "None", value: "none" },
            { title: "Claude Code", value: "claude-code" },
            { title: "Cursor", value: "cursor" },
            { title: "OpenCode", value: "opencode" },
            { title: "Codex", value: "codex" },
            { title: "Gemini", value: "gemini" },
            { title: "Amp", value: "amp" },
            { title: "Visual Edit", value: "visual-edit" },
          ],
        });

        if (agent === undefined) {
          logger.break();
          process.exit(1);
        }

        agentIntegration = agent;

        if (
          opts.force &&
          projectInfo.installedAgents.length > 0 &&
          agentIntegration !== "none" &&
          !projectInfo.installedAgents.includes(agentIntegration)
        ) {
          const installedNames = projectInfo.installedAgents
            .map((innerAgent) => AGENT_NAMES[innerAgent] || innerAgent)
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
            agentsToRemove = [...projectInfo.installedAgents];
          }
        }
      } else if (
        opts.agent &&
        opts.force &&
        projectInfo.installedAgents.length > 0 &&
        !projectInfo.installedAgents.includes(opts.agent) &&
        !isNonInteractive
      ) {
        const installedNames = projectInfo.installedAgents
          .map((innerAgent) => AGENT_NAMES[innerAgent] || innerAgent)
          .join(", ");

        logger.break();
        logger.warn(`Currently installed: ${installedNames}`);

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
          agentsToRemove = [...projectInfo.installedAgents];
        }
      }

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

          if (packagesToRemove.length > 0 && !opts.skipInstall) {
            const uninstallSpinner = spinner(
              `Removing ${packagesToRemove.join(", ")}.`,
            ).start();

            try {
              uninstallPackages(
                packagesToRemove,
                finalPackageManager,
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
              `Removing ${AGENT_NAMES[agentToRemove] || agentToRemove} from ${removalResult.filePath}.`,
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
              `Removing ${AGENT_NAMES[agentToRemove] || agentToRemove} from ${removalPackageJsonResult.filePath}.`,
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
          (innerAgent) => !agentsToRemove.includes(innerAgent),
        );
      }

      const shouldInstallReactGrab = !projectInfo.hasReactGrab;
      const shouldInstallAgent =
        agentIntegration !== "none" &&
        !projectInfo.installedAgents.includes(agentIntegration);

      if (!opts.skipInstall && (shouldInstallReactGrab || shouldInstallAgent)) {
        const packages = getPackagesToInstall(
          agentIntegration,
          shouldInstallReactGrab,
        );

        if (packages.length > 0) {
          const installSpinner = spinner(
            `Installing ${packages.join(", ")}.`,
          ).start();

          try {
            installPackages(
              packages,
              finalPackageManager,
              projectInfo.projectRoot,
            );
            installSpinner.succeed();
          } catch (error) {
            installSpinner.fail();
            handleError(error);
          }
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
        `${highlighter.success("Success!")} React Grab has been installed.`,
      );
      if (packageJsonResult.warning) {
        logger.warn(packageJsonResult.warning);
      } else {
        logger.log("You may now start your development server.");
      }
      logger.break();

      await reportToCli("completed", {
        framework: finalFramework,
        packageManager: finalPackageManager,
        router: finalNextRouterType,
        agent: agentIntegration !== "none" ? agentIntegration : undefined,
        isMonorepo: projectInfo.isMonorepo,
      });
    } catch (error) {
      handleError(error);
      await reportToCli("error", undefined, error as Error);
    }
  });
