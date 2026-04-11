import { existsSync } from "node:fs";
import { relative, resolve } from "node:path";
import { Command } from "commander";
import pc from "picocolors";
import { detectNonInteractive } from "../utils/is-non-interactive.js";
import { prompts } from "../utils/prompts.js";
import { applyTransformWithFeedback, installPackagesWithFeedback } from "../utils/cli-helpers.js";
import { promptMcpInstall } from "../utils/install-mcp.js";
import {
  detectProject,
  findReactProjects,
  type Framework,
  type PackageManager,
  type UnsupportedFramework,
  type WorkspaceProject,
} from "../utils/detect.js";
import { printDiff } from "../utils/diff.js";
import { handleError } from "../utils/handle-error.js";
import { highlighter } from "../utils/highlighter.js";
import { getPackagesToInstall } from "../utils/install.js";
import { logger } from "../utils/logger.js";
import { spinner } from "../utils/spinner.js";
import {
  previewOptionsTransform,
  previewTransform,
  type ReactGrabOptions,
} from "../utils/transform.js";
import { formatActivationKeyDisplay } from "../utils/format-activation-key.js";

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

const reportToCli = (type: "error" | "completed", config?: ReportConfig, error?: Error): void => {
  fetch(REPORT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type,
      version: VERSION,
      config,
      error: error ? { message: error.message, stack: error.stack } : undefined,
      timestamp: new Date().toISOString(),
    }),
  }).catch(() => {});
};

const FRAMEWORK_NAMES: Record<Framework, string> = {
  next: "Next.js",
  vite: "Vite",
  tanstack: "TanStack Start",
  webpack: "Webpack",
  sveltekit: "SvelteKit",
  unknown: "Unknown",
};

const PACKAGE_MANAGER_NAMES: Record<PackageManager, string> = {
  npm: "npm",
  yarn: "Yarn",
  pnpm: "pnpm",
  bun: "Bun",
};

const UNSUPPORTED_FRAMEWORK_NAMES: Record<NonNullable<UnsupportedFramework>, string> = {
  remix: "Remix",
  astro: "Astro",
  gatsby: "Gatsby",
};

const sortProjectsByFramework = (projects: WorkspaceProject[]): WorkspaceProject[] =>
  [...projects].sort((projectA, projectB) => {
    if (projectA.framework === "unknown" && projectB.framework !== "unknown") return 1;
    if (projectA.framework !== "unknown" && projectB.framework === "unknown") return -1;
    return 0;
  });

const printSubprojects = (searchRoot: string, sortedProjects: WorkspaceProject[]): void => {
  logger.break();
  logger.log("Found the following projects:");
  logger.break();
  for (const project of sortedProjects) {
    const frameworkLabel =
      project.framework !== "unknown"
        ? ` ${highlighter.dim(`(${FRAMEWORK_NAMES[project.framework]})`)}`
        : "";
    const relativePath = relative(searchRoot, project.path);
    logger.log(
      `  ${highlighter.info(project.name)}${frameworkLabel} ${highlighter.dim(relativePath)}`,
    );
  }
  logger.break();
  logger.log(`Re-run with ${highlighter.info("-c <path>")} to specify a project:`);
  logger.break();
  logger.log(
    `  ${highlighter.dim("$")} npx grab@latest init -c ${relative(searchRoot, sortedProjects[0].path)}`,
  );
  logger.break();
};

export const init = new Command()
  .name("init")
  .alias("setup")
  .description("initialize React Grab in your project")
  .option("-y, --yes", "skip confirmation prompts", false)
  .option("-f, --force", "force overwrite existing config", false)
  .option("-k, --key <key>", "activation key (e.g., Meta+K, Ctrl+Shift+G, Space)")
  .option("--skip-install", "skip package installation", false)
  .option("--pkg <pkg>", "custom package URL for CLI (e.g., grab)")
  .option("-c, --cwd <cwd>", "working directory (defaults to current directory)", process.cwd())
  .action(async (opts) => {
    console.log(`${pc.magenta("✿")} ${pc.bold("React Grab")} ${pc.gray(VERSION)}`);
    console.log();

    try {
      const cwd = resolve(opts.cwd);
      const isNonInteractive = detectNonInteractive(opts.yes);

      if (!existsSync(cwd)) {
        logger.break();
        logger.error(`Directory does not exist: ${highlighter.info(cwd)}`);
        logger.break();
        process.exit(1);
      }

      const preflightSpinner = spinner("Preflight checks.").start();

      const projectInfo = await detectProject(cwd);

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

          collectedOptions.allowActivationInsideInput = allowActivationInsideInput;

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
            !optionsResult.noChanges && optionsResult.originalContent && optionsResult.newContent;

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

        logger.break();
        const { wantAddMcp } = await prompts({
          type: "confirm",
          name: "wantAddMcp",
          message: `Would you like to ${highlighter.info("connect it to your agent via MCP")}?`,
          initial: false,
        });

        if (wantAddMcp === undefined) {
          logger.break();
          process.exit(1);
        }

        if (wantAddMcp) {
          const didInstall = await promptMcpInstall();
          if (!didInstall) {
            logger.break();
            process.exit(0);
          }
          logger.break();
          logger.success("MCP server has been configured.");
          logger.log("Restart your agents to activate.");
        }

        logger.break();
        process.exit(0);
      }

      preflightSpinner.succeed();

      const frameworkSpinner = spinner("Verifying framework.").start();

      if (projectInfo.unsupportedFramework) {
        const frameworkName = UNSUPPORTED_FRAMEWORK_NAMES[projectInfo.unsupportedFramework];
        frameworkSpinner.fail(`Found ${highlighter.info(frameworkName)}.`);
        logger.break();
        logger.log(`${frameworkName} is not yet supported by automatic setup.`);
        logger.log(`Visit ${highlighter.info(DOCS_URL)} for manual setup.`);
        logger.break();
        process.exit(1);
      }

      if (projectInfo.framework === "unknown") {
        let searchRoot = cwd;
        let reactProjects = findReactProjects(searchRoot);
        if (reactProjects.length === 0 && cwd !== process.cwd()) {
          searchRoot = process.cwd();
          reactProjects = findReactProjects(searchRoot);
        }

        if (reactProjects.length > 0) {
          frameworkSpinner.info(
            `Verifying framework. Found ${reactProjects.length} project${reactProjects.length === 1 ? "" : "s"}.`,
          );

          const sortedProjects = sortProjectsByFramework(reactProjects);

          if (isNonInteractive) {
            printSubprojects(searchRoot, sortedProjects);
            process.exit(1);
          }

          logger.break();
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
          logger.log("React Grab supports Next.js, Vite, TanStack Start, and Webpack projects.");
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

      const packageManagerSpinner = spinner("Detecting package manager.").start();
      packageManagerSpinner.succeed(
        `Detecting package manager. Found ${highlighter.info(PACKAGE_MANAGER_NAMES[projectInfo.packageManager])}.`,
      );

      const finalFramework = projectInfo.framework;
      const finalPackageManager = projectInfo.packageManager;
      const finalNextRouterType = projectInfo.nextRouterType;
      let didInstallMcp = false;

      if (!isNonInteractive) {
        logger.break();
        const { wantAddMcp } = await prompts({
          type: "confirm",
          name: "wantAddMcp",
          message: `Would you like to ${highlighter.info("connect it to your agent via MCP")}?`,
          initial: false,
        });

        if (wantAddMcp === undefined) {
          logger.break();
          process.exit(1);
        }

        if (wantAddMcp) {
          didInstallMcp = Boolean(await promptMcpInstall());
          if (!didInstallMcp) {
            logger.break();
            process.exit(0);
          }
          logger.break();
          logger.success("MCP server has been configured.");
          logger.log("Continuing with React Grab installation...");
          logger.break();
        }
      }

      const result = previewTransform(
        projectInfo.projectRoot,
        finalFramework,
        finalNextRouterType,
        false,
        opts.force,
      );

      if (!result.success) {
        logger.break();
        logger.error(result.message);
        logger.error(`Visit ${highlighter.info(DOCS_URL)} for manual setup.`);
        logger.break();
        process.exit(1);
      }

      const hasLayoutChanges = !result.noChanges && result.originalContent && result.newContent;

      if (hasLayoutChanges) {
        logger.break();

        printDiff(result.filePath, result.originalContent!, result.newContent!);

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

      if (!opts.skipInstall && shouldInstallReactGrab) {
        installPackagesWithFeedback(
          getPackagesToInstall(shouldInstallReactGrab),
          finalPackageManager,
          projectInfo.projectRoot,
        );
      }

      if (hasLayoutChanges) {
        applyTransformWithFeedback(result);
      }

      logger.break();
      logger.log(`${highlighter.success("Success!")} React Grab has been installed.`);
      logger.log("You may now start your development server.");
      logger.break();

      reportToCli("completed", {
        framework: finalFramework,
        packageManager: finalPackageManager,
        router: finalNextRouterType,
        agent: didInstallMcp ? "mcp" : undefined,
        isMonorepo: projectInfo.isMonorepo,
      });
    } catch (error) {
      handleError(error);
      reportToCli("error", undefined, error as Error);
    }
  });
