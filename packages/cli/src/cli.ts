import { confirm, select } from "@inquirer/prompts";
import pc from "picocolors";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import {
  detectProject,
  findWorkspaceProjects,
  type Framework,
  type PackageManager,
  type UnsupportedFramework,
} from "./detect.js";
import { printDiff } from "./diff.js";
import { getPackagesToInstall, installPackages } from "./install.js";
import type { AgentIntegration } from "./templates.js";
import {
  applyPackageJsonTransform,
  applyTransform,
  previewPackageJsonTransform,
  previewTransform,
} from "./transform.js";

const VERSION = process.env.VERSION ?? "0.0.1";
const REPORT_URL = "https://reactgrab.com/api/report-cli";

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
    }).catch(() => {
      // HACK: Silently fail if reporting fails - don't interrupt the CLI
    });
  } catch {
    // HACK: Silently fail if reporting fails - don't interrupt the CLI
  }
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

const AGENT_NAMES: Record<string, string> = {
  "claude-code": "Claude Code",
  cursor: "Cursor",
  opencode: "Opencode",
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

type ActionType = "install-all" | "add-agent" | "reconfigure";

const DOCS_URL = "https://github.com/aidenybai/react-grab";

const showDocsLink = () => {
  console.log("\nFor manual installation instructions, visit:");
  console.log(`  ${pc.cyan(DOCS_URL)}\n`);
};

const showManualInstructions = (
  framework: Framework,
  nextRouterType?: string,
) => {
  console.log(
    `\n${pc.yellow("⚠️")} ${pc.yellow("Manual Setup Instructions:")}\n`,
  );

  if (framework === "next" && nextRouterType === "app") {
    console.log(`${pc.bold("Next.js App Router:")}`);
    console.log(`  1. Install: ${pc.cyan("npm install -D react-grab")}`);
    console.log(`  2. Add to ${pc.cyan("app/layout.tsx")} inside <head>:`);
    console.log(`     ${pc.gray('import Script from "next/script";')}`);
    console.log(
      `     ${pc.gray('{process.env.NODE_ENV === "development" && (')}`,
    );
    console.log(`     ${pc.gray("  <Script")}`);
    console.log(
      `     ${pc.gray('    src="//unpkg.com/react-grab/dist/index.global.js"')}`,
    );
    console.log(`     ${pc.gray('    crossOrigin="anonymous"')}`);
    console.log(`     ${pc.gray('    strategy="beforeInteractive"')}`);
    console.log(`     ${pc.gray("  />")}`);
    console.log(`     ${pc.gray(")}")}`);
  } else if (framework === "next" && nextRouterType === "pages") {
    console.log(`${pc.bold("Next.js Pages Router:")}`);
    console.log(`  1. Install: ${pc.cyan("npm install -D react-grab")}`);
    console.log(`  2. Add to ${pc.cyan("pages/_document.tsx")} inside <Head>:`);
    console.log(`     ${pc.gray('import Script from "next/script";')}`);
    console.log(
      `     ${pc.gray('{process.env.NODE_ENV === "development" && (')}`,
    );
    console.log(`     ${pc.gray("  <Script")}`);
    console.log(
      `     ${pc.gray('    src="//unpkg.com/react-grab/dist/index.global.js"')}`,
    );
    console.log(`     ${pc.gray('    crossOrigin="anonymous"')}`);
    console.log(`     ${pc.gray('    strategy="beforeInteractive"')}`);
    console.log(`     ${pc.gray("  />")}`);
    console.log(`     ${pc.gray(")}")}`);
  } else if (framework === "vite") {
    console.log(`${pc.bold("Vite:")}`);
    console.log(`  1. Install: ${pc.cyan("npm install -D react-grab")}`);
    console.log(`  2. Add to ${pc.cyan("index.html")} inside <head>:`);
    console.log(`     ${pc.gray('<script type="module">')}`);
    console.log(
      `     ${pc.gray('  if (import.meta.env.DEV) { import("react-grab"); }')}`,
    );
    console.log(`     ${pc.gray("</script>")}`);
  } else if (framework === "webpack") {
    console.log(`${pc.bold("Webpack:")}`);
    console.log(`  1. Install: ${pc.cyan("npm install -D react-grab")}`);
    console.log(
      `  2. Add to your entry file (e.g., ${pc.cyan("src/index.tsx")}):`,
    );
    console.log(
      `     ${pc.gray('if (process.env.NODE_ENV === "development") {')}`,
    );
    console.log(`     ${pc.gray('  import("react-grab");')}`);
    console.log(`     ${pc.gray("}")}`);
  } else {
    console.log(
      `${pc.bold("Next.js App Router:")} Add to ${pc.cyan("app/layout.tsx")} inside <head>:`,
    );
    console.log(`     ${pc.gray('import Script from "next/script";')}`);
    console.log(
      `     ${pc.gray('{process.env.NODE_ENV === "development" && (')}`,
    );
    console.log(
      `     ${pc.gray('  <Script src="//unpkg.com/react-grab/dist/index.global.js" strategy="beforeInteractive" />')}`,
    );
    console.log(`     ${pc.gray(")}")}`);
    console.log("");
    console.log(
      `${pc.bold("Next.js Pages Router:")} Add to ${pc.cyan("pages/_document.tsx")} inside <Head>:`,
    );
    console.log(`     ${pc.gray('import Script from "next/script";')}`);
    console.log(
      `     ${pc.gray('{process.env.NODE_ENV === "development" && (')}`,
    );
    console.log(
      `     ${pc.gray('  <Script src="//unpkg.com/react-grab/dist/index.global.js" strategy="beforeInteractive" />')}`,
    );
    console.log(`     ${pc.gray(")}")}`);
    console.log("");
    console.log(
      `${pc.bold("Vite:")} Add to ${pc.cyan("index.html")} inside <head>:`,
    );
    console.log(`     ${pc.gray('<script type="module">')}`);
    console.log(
      `     ${pc.gray('  if (import.meta.env.DEV) { import("react-grab"); }')}`,
    );
    console.log(`     ${pc.gray("</script>")}`);
    console.log("");
    console.log(
      `${pc.bold("Webpack:")} Add to entry file (e.g., ${pc.cyan("src/index.tsx")}):`,
    );
    console.log(
      `     ${pc.gray('if (process.env.NODE_ENV === "development") {')}`,
    );
    console.log(`     ${pc.gray('  import("react-grab");')}`);
    console.log(`     ${pc.gray("}")}`);
    console.log("");
    console.log(`For full instructions, visit:`);
    console.log(
      `  ${pc.cyan("https://github.com/aidenybai/react-grab#readme")}`,
    );
    return;
  }

  showDocsLink();
};

const showAccuracyWarning = () => {
  console.log(
    `\n${pc.yellow("⚠️")} ${pc.yellow("Auto-detection may not be 100% accurate.")}`,
  );
  console.log(
    `${pc.yellow("   Please verify the changes in your file before committing.")}`,
  );
};

interface CliArgs {
  framework?: Framework;
  packageManager?: PackageManager;
  router?: "app" | "pages";
  agent?: AgentIntegration;
  yes?: boolean;
  skipInstall?: boolean;
}

const parseArgs = async (): Promise<CliArgs> => {
  const argv = await yargs(hideBin(process.argv))
    .scriptName("react-grab")
    .usage(
      `${pc.magenta("⚛")} ${pc.bold("React Grab CLI")} ${pc.gray(`v${VERSION}`)}\n\n` +
        `${pc.cyan("Usage:")} $0 [options]\n\n` +
        `React Grab adds AI-powered context selection to your React application,\n` +
        `allowing you to select components and copy their context for AI assistants.\n\n` +
        `The CLI auto-detects your project configuration (framework, package manager,\n` +
        `router type) and installs React Grab with optional agent integrations.`,
    )
    .option("framework", {
      alias: "f",
      type: "string",
      choices: ["next", "vite", "webpack"] as const,
      description: "Override detected framework",
    })
    .option("package-manager", {
      alias: "p",
      type: "string",
      choices: ["npm", "yarn", "pnpm", "bun"] as const,
      description: "Override detected package manager",
    })
    .option("router", {
      alias: "r",
      type: "string",
      choices: ["app", "pages"] as const,
      description: "Next.js router type (only for Next.js projects)",
    })
    .option("agent", {
      alias: "a",
      type: "string",
      choices: ["claude-code", "cursor", "opencode", "none"] as const,
      description:
        "Agent integration to automatically forward selected elements to agent instead of copying to clipboard",
    })
    .option("yes", {
      alias: "y",
      type: "boolean",
      default: false,
      description: "Skip all prompts and use auto-detected/default values",
    })
    .option("skip-install", {
      type: "boolean",
      default: false,
      description: "Only modify config files, skip npm/yarn/pnpm install",
    })
    .help()
    .alias("help", "h")
    .version(VERSION)
    .alias("version", "v")
    .example("$0", "Run interactive setup with prompts")
    .example("$0 -y", "Auto-detect everything and install without prompts")
    .example("$0 -f next -r app", "Configure for Next.js App Router")
    .example(
      "$0 -a cursor -y",
      "Add Cursor agent integration non-interactively",
    )
    .example("$0 -p pnpm -a claude-code", "Use pnpm and add Claude Code agent")
    .example(
      "$0 --skip-install",
      "Only modify files, install packages manually",
    )
    .epilog(
      `${pc.bold("Agent Integrations:")}\n` +
        `  ${pc.cyan("claude-code")}  Connect React Grab to Claude Code\n` +
        `  ${pc.cyan("cursor")}       Connect React Grab to Cursor IDE\n` +
        `  ${pc.cyan("opencode")}     Connect React Grab to Opencode\n\n` +
        `${pc.bold("Supported Frameworks:")}\n` +
        `  ${pc.cyan("next")}     Next.js (App Router & Pages Router)\n` +
        `  ${pc.cyan("vite")}     Vite-based React projects\n` +
        `  ${pc.cyan("webpack")}  Webpack-based React projects\n\n` +
        `${pc.bold("Documentation:")} ${pc.underline(DOCS_URL)}`,
    )
    .wrap(Math.min(100, process.stdout.columns || 80))
    .parse();

  return {
    framework: argv.framework as Framework | undefined,
    packageManager: argv["package-manager"] as PackageManager | undefined,
    router: argv.router as "app" | "pages" | undefined,
    agent: argv.agent as AgentIntegration | undefined,
    yes: argv.yes,
    skipInstall: argv["skip-install"],
  };
};

const main = async () => {
  const args = await parseArgs();
  const isNonInteractive = args.yes;

  console.log(
    `\n${pc.magenta("⚛")} ${pc.bold("React Grab")} ${pc.gray(VERSION)}`,
  );

  const projectInfo = await detectProject(process.cwd());

  console.log(
    `- Framework:       ${pc.cyan(FRAMEWORK_NAMES[projectInfo.framework])}`,
  );
  console.log(
    `- Package Manager: ${pc.cyan(PACKAGE_MANAGER_NAMES[projectInfo.packageManager])}`,
  );
  if (projectInfo.framework === "next") {
    console.log(
      `- Router Type:     ${pc.cyan(projectInfo.nextRouterType === "app" ? "App Router" : "Pages Router")}`,
    );
  }
  console.log(
    `- Monorepo:        ${pc.cyan(projectInfo.isMonorepo ? "Yes" : "No")}`,
  );
  console.log(
    `- React Grab:      ${projectInfo.hasReactGrab ? pc.green("Installed") : pc.yellow("Not installed")}`,
  );
  if (projectInfo.installedAgents.length > 0) {
    console.log(
      `- Agents:          ${pc.cyan(projectInfo.installedAgents.map((agent) => AGENT_NAMES[agent] || agent).join(", "))}`,
    );
  }
  console.log("");

  if (projectInfo.unsupportedFramework) {
    const frameworkName =
      UNSUPPORTED_FRAMEWORK_NAMES[projectInfo.unsupportedFramework];
    console.log(
      `${pc.yellow("⚠️")} ${pc.yellow(`Detected ${frameworkName} - this framework requires manual setup.`)}`,
    );
    console.log(
      `${pc.yellow("   React Grab may not work correctly with auto-configuration.")}\n`,
    );
    showManualInstructions(projectInfo.framework, projectInfo.nextRouterType);
    process.exit(0);
  }

  if (projectInfo.framework === "unknown") {
    if (projectInfo.isMonorepo && !isNonInteractive) {
      const workspaceProjects = findWorkspaceProjects(projectInfo.projectRoot);
      const reactProjects = workspaceProjects.filter(
        (p) => p.hasReact || p.framework !== "unknown",
      );

      if (reactProjects.length > 0) {
        console.log(
          `${pc.cyan("ℹ")} ${pc.cyan("Found React projects in this monorepo:")}\n`,
        );

        const selectedProject = await select({
          message: "Select a project to install React Grab:",
          choices: reactProjects.map((project) => ({
            name: `${project.name} ${pc.gray(`(${FRAMEWORK_NAMES[project.framework] || "React"})`)}`,
            value: project.path,
          })),
        });

        console.log(
          `\n${pc.magenta("⚛")} Switching to ${pc.cyan(selectedProject)}...\n`,
        );
        process.chdir(selectedProject);

        const newProjectInfo = await detectProject(selectedProject);
        projectInfo.framework = newProjectInfo.framework;
        projectInfo.nextRouterType = newProjectInfo.nextRouterType;
        projectInfo.hasReactGrab = newProjectInfo.hasReactGrab;
        projectInfo.installedAgents = newProjectInfo.installedAgents;
        projectInfo.projectRoot = newProjectInfo.projectRoot;

        console.log(
          `- Framework:       ${pc.cyan(FRAMEWORK_NAMES[newProjectInfo.framework])}`,
        );
        if (newProjectInfo.framework === "next") {
          console.log(
            `- Router Type:     ${pc.cyan(newProjectInfo.nextRouterType === "app" ? "App Router" : "Pages Router")}`,
          );
        }
        console.log(
          `- React Grab:      ${newProjectInfo.hasReactGrab ? pc.green("Installed") : pc.yellow("Not installed")}`,
        );
        console.log("");
      } else {
        console.log(
          `${pc.yellow("⚠️")} ${pc.yellow("Could not detect framework automatically.")}\n`,
        );
        showManualInstructions("unknown");
        process.exit(0);
      }
    } else {
      console.log(
        `${pc.yellow("⚠️")} ${pc.yellow("Could not detect framework automatically.")}\n`,
      );
      showManualInstructions("unknown");
      process.exit(0);
    }
  }

  let action: ActionType = "install-all";

  if (projectInfo.hasReactGrab && !isNonInteractive) {
    action = await select({
      message: "React Grab is already installed. What would you like to do?",
      choices: [
        { name: "Add an agent integration", value: "add-agent" as const },
        { name: "Reconfigure project files", value: "reconfigure" as const },
        { name: "Reinstall everything", value: "install-all" as const },
      ],
    });
  } else if (projectInfo.hasReactGrab && args.agent && args.agent !== "none") {
    action = "add-agent";
  } else if (projectInfo.hasReactGrab && isNonInteractive && !args.agent) {
    console.log(
      `${pc.yellow("⚠️")} ${pc.yellow("React Grab is already installed.")}`,
    );
    console.log(
      `${pc.yellow("   Use --agent to add an agent, or run without -y for interactive mode.")}\n`,
    );
    action = "reconfigure";
  }

  let finalFramework = args.framework || projectInfo.framework;
  let finalPackageManager = args.packageManager || projectInfo.packageManager;
  let finalNextRouterType = args.router || projectInfo.nextRouterType;

  if (!isNonInteractive && !args.framework) {
    const confirmSettings = await confirm({
      message: "Are these settings correct?",
      default: true,
    });

    if (!confirmSettings) {
      finalFramework = await select({
        message: "Select your framework:",
        choices: [
          { name: "Next.js", value: "next" as const },
          { name: "Vite", value: "vite" as const },
          { name: "Webpack", value: "webpack" as const },
        ],
        default: projectInfo.framework,
      });

      finalPackageManager = await select({
        message: "Select your package manager:",
        choices: [
          { name: "npm", value: "npm" as const },
          { name: "Yarn", value: "yarn" as const },
          { name: "pnpm", value: "pnpm" as const },
          { name: "Bun", value: "bun" as const },
        ],
        default: projectInfo.packageManager,
      });

      if (finalFramework === "next") {
        finalNextRouterType = await select({
          message: "Select your Next.js router type:",
          choices: [
            { name: "App Router", value: "app" as const },
            { name: "Pages Router", value: "pages" as const },
          ],
          default: projectInfo.nextRouterType === "app" ? "app" : "pages",
        });
      }
    }
  }

  let agentIntegration: AgentIntegration = args.agent || "none";
  const shouldAskForAgent =
    (action === "install-all" || action === "add-agent") && !args.agent;

  if (shouldAskForAgent && !isNonInteractive) {
    const availableAgents = [
      { name: "Claude Code", value: "claude-code" as const },
      { name: "Cursor", value: "cursor" as const },
      { name: "Opencode", value: "opencode" as const },
    ].filter((agent) => !projectInfo.installedAgents.includes(agent.value));

    if (availableAgents.length === 0) {
      console.log(
        `\n${pc.green("All agent integrations are already installed.")}\n`,
      );
    } else if (action === "add-agent") {
      agentIntegration = await select({
        message: "Select an agent integration to add:",
        choices: availableAgents,
      });
    } else {
      const wantAgentIntegration = await confirm({
        message:
          "Do you want to add an agent integration (Claude Code, Cursor, or Opencode)?",
        default: false,
      });

      if (wantAgentIntegration) {
        agentIntegration = await select({
          message: "Select an agent integration:",
          choices: availableAgents,
        });
      }
    }
  }

  const shouldTransform =
    action === "reconfigure" ||
    action === "install-all" ||
    (action === "add-agent" && agentIntegration !== "none");

  if (shouldTransform) {
    console.log(`\n${pc.magenta("⚛")} Previewing changes...\n`);

    const result = previewTransform(
      projectInfo.projectRoot,
      finalFramework,
      finalNextRouterType,
      agentIntegration,
      projectInfo.hasReactGrab || action === "add-agent",
    );

    const packageJsonResult = previewPackageJsonTransform(
      projectInfo.projectRoot,
      agentIntegration,
      projectInfo.installedAgents,
    );

    if (!result.success) {
      console.error(`${pc.red("Error:")} ${result.message}`);
      showDocsLink();
      process.exit(1);
    }

    const hasLayoutChanges =
      !result.noChanges && result.originalContent && result.newContent;
    const hasPackageJsonChanges =
      packageJsonResult.success &&
      !packageJsonResult.noChanges &&
      packageJsonResult.originalContent &&
      packageJsonResult.newContent;

    if (result.noChanges && packageJsonResult.noChanges) {
      console.log(`${pc.cyan("Info:")} ${result.message}`);
      if (packageJsonResult.message) {
        console.log(`${pc.cyan("Info:")} ${packageJsonResult.message}`);
      }
    } else {
      if (hasLayoutChanges) {
        printDiff(result.filePath, result.originalContent!, result.newContent!);
      }

      if (hasPackageJsonChanges) {
        if (hasLayoutChanges) {
          console.log("");
        }
        printDiff(
          packageJsonResult.filePath,
          packageJsonResult.originalContent!,
          packageJsonResult.newContent!,
        );
      }

      if (hasLayoutChanges || hasPackageJsonChanges) {
        showAccuracyWarning();

        if (!isNonInteractive) {
          const confirmChanges = await confirm({
            message: "Apply these changes?",
            default: true,
          });

          if (!confirmChanges) {
            console.log(`\n${pc.yellow("Changes cancelled.")}\n`);
            process.exit(0);
          }
        }
      }

      const shouldInstallReactGrab =
        (action === "install-all" || action === "add-agent") &&
        !projectInfo.hasReactGrab;
      const shouldInstallAgent =
        agentIntegration !== "none" &&
        !projectInfo.installedAgents.includes(agentIntegration);

      if (!args.skipInstall && (shouldInstallReactGrab || shouldInstallAgent)) {
        const packages = getPackagesToInstall(
          agentIntegration,
          shouldInstallReactGrab,
        );

        if (packages.length > 0) {
          console.log(
            `\n${pc.magenta("⚛")} Installing: ${pc.cyan(packages.join(", "))}\n`,
          );

          try {
            installPackages(
              packages,
              finalPackageManager,
              projectInfo.projectRoot,
            );
            console.log(`\n${pc.green("Packages installed successfully!")}\n`);
          } catch (error) {
            console.error(`\n${pc.red("Failed to install packages:")}`, error);
            showDocsLink();
            process.exit(1);
          }
        }
      }

      if (hasLayoutChanges) {
        const writeResult = applyTransform(result);
        if (!writeResult.success) {
          console.error(`\n${pc.red("Error:")} ${writeResult.error}`);
          showDocsLink();
          process.exit(1);
        }
        console.log(`\n${pc.green("Applied:")} ${result.filePath}`);
      }

      if (hasPackageJsonChanges) {
        const packageJsonWriteResult =
          applyPackageJsonTransform(packageJsonResult);
        if (!packageJsonWriteResult.success) {
          console.error(
            `\n${pc.red("Error:")} ${packageJsonWriteResult.error}`,
          );
          showDocsLink();
          process.exit(1);
        }
        console.log(`${pc.green("Applied:")} ${packageJsonResult.filePath}`);
      }
    }
  }

  console.log(`\n${pc.green("Done!")}`);
  console.log(`\nNext steps:`);
  console.log(`- Start your development server`);
  console.log(`- Select an element to copy its context`);
  console.log(`- Learn more at ${pc.cyan(DOCS_URL)}\n`);

  if (agentIntegration !== "none") {
    console.log(
      `${pc.magenta("⚛")} Agent: ${pc.cyan(AGENT_NAMES[agentIntegration])}`,
    );
    console.log(`  Make sure to start the agent server before using it.\n`);
  }

  await reportToCli("completed", {
    framework: finalFramework,
    packageManager: finalPackageManager,
    router: finalNextRouterType,
    agent: agentIntegration !== "none" ? agentIntegration : undefined,
    isMonorepo: projectInfo.isMonorepo,
  });
};

main().catch(async (error) => {
  console.error(`${pc.red("Error:")}`, error);
  console.log("\nFor manual installation instructions, visit:");
  console.log(`  ${DOCS_URL}\n`);
  await reportToCli("error", undefined, error);
  process.exit(1);
});
