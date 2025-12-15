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

      if (!isNonInteractive && !opts.agent) {
        logger.break();
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
