import { confirm, select } from "@inquirer/prompts";
import pc from "picocolors";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { detectProject, type Framework, type PackageManager } from "./detect.js";
import { printDiff } from "./diff.js";
import { getPackagesToInstall, installPackages } from "./install.js";
import type { AgentIntegration } from "./templates.js";
import { applyTransform, previewTransform } from "./transform.js";

const VERSION = process.env.VERSION ?? "0.0.1";

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

type ActionType = "install-all" | "add-agent" | "reconfigure";

const DOCS_URL = "https://react-grab.com/docs";

const showDocsLink = () => {
  console.log("\nFor manual installation instructions, visit:");
  console.log(`  ${DOCS_URL}\n`);
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
    .usage("Usage: $0 [options]")
    .option("framework", {
      alias: "f",
      type: "string",
      choices: ["next", "vite", "webpack"] as const,
      description: "Framework to configure (next, vite, webpack)",
    })
    .option("package-manager", {
      alias: "p",
      type: "string",
      choices: ["npm", "yarn", "pnpm", "bun"] as const,
      description: "Package manager to use",
    })
    .option("router", {
      alias: "r",
      type: "string",
      choices: ["app", "pages"] as const,
      description: "Next.js router type (app or pages)",
    })
    .option("agent", {
      alias: "a",
      type: "string",
      choices: ["claude-code", "cursor", "opencode", "none"] as const,
      description: "Agent integration to add",
    })
    .option("yes", {
      alias: "y",
      type: "boolean",
      default: false,
      description: "Skip all confirmation prompts",
    })
    .option("skip-install", {
      type: "boolean",
      default: false,
      description: "Skip package installation (only modify files)",
    })
    .help()
    .alias("help", "h")
    .version(VERSION)
    .alias("version", "v")
    .example("$0", "Run interactive setup")
    .example("$0 -y", "Auto-detect and install without prompts")
    .example("$0 -f next -r app -a cursor", "Install for Next.js App Router with Cursor agent")
    .example("$0 -p pnpm -a claude-code -y", "Use pnpm and add Claude Code agent")
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

  console.log(`\n${pc.magenta("⚛")} ${pc.bold("React Grab")} ${pc.gray(VERSION)}`);

  const projectInfo = await detectProject(process.cwd());

  console.log(`- Framework:       ${pc.cyan(FRAMEWORK_NAMES[projectInfo.framework])}`);
  console.log(`- Package Manager: ${pc.cyan(PACKAGE_MANAGER_NAMES[projectInfo.packageManager])}`);
  if (projectInfo.framework === "next") {
    console.log(`- Router Type:     ${pc.cyan(projectInfo.nextRouterType === "app" ? "App Router" : "Pages Router")}`);
  }
  console.log(`- Monorepo:        ${pc.cyan(projectInfo.isMonorepo ? "Yes" : "No")}`);
  console.log(`- React Grab:      ${projectInfo.hasReactGrab ? pc.green("Installed") : pc.yellow("Not installed")}`);
  if (projectInfo.installedAgents.length > 0) {
    console.log(`- Agents:          ${pc.cyan(projectInfo.installedAgents.map((agent) => AGENT_NAMES[agent] || agent).join(", "))}`);
  }
  console.log("");

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
  const shouldAskForAgent = (action === "install-all" || action === "add-agent") && !args.agent;

  if (shouldAskForAgent && !isNonInteractive) {
    const availableAgents = [
      { name: "Claude Code", value: "claude-code" as const },
      { name: "Cursor", value: "cursor" as const },
      { name: "Opencode", value: "opencode" as const },
    ].filter((agent) => !projectInfo.installedAgents.includes(agent.value));

    if (availableAgents.length === 0) {
      console.log(`\n${pc.green("All agent integrations are already installed.")}\n`);
    } else if (action === "add-agent") {
      agentIntegration = await select({
        message: "Select an agent integration to add:",
        choices: availableAgents,
      });
    } else {
      const wantAgentIntegration = await confirm({
        message: "Do you want to add an agent integration (Claude Code, Cursor, or Opencode)?",
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

  const shouldTransform = action === "reconfigure" || action === "install-all" || (action === "add-agent" && agentIntegration !== "none");

  if (shouldTransform) {
    console.log(`\n${pc.magenta("⚛")} Previewing changes...\n`);

    const result = previewTransform(
      projectInfo.projectRoot,
      finalFramework,
      finalNextRouterType,
      agentIntegration,
      projectInfo.hasReactGrab || action === "add-agent"
    );

    if (!result.success) {
      console.error(`${pc.red("Error:")} ${result.message}`);
      showDocsLink();
      process.exit(1);
    }

    if (result.noChanges) {
      console.log(`${pc.cyan("Info:")} ${result.message}`);
    } else if (result.originalContent && result.newContent) {
      printDiff(result.filePath, result.originalContent, result.newContent);

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

      const shouldInstallReactGrab = action === "install-all" && !projectInfo.hasReactGrab;
      const shouldInstallAgent = agentIntegration !== "none" && !projectInfo.installedAgents.includes(agentIntegration);

      if (!args.skipInstall && (shouldInstallReactGrab || shouldInstallAgent)) {
        const packages = getPackagesToInstall(agentIntegration, shouldInstallReactGrab);

        if (packages.length > 0) {
          console.log(`\n${pc.magenta("⚛")} Installing: ${pc.cyan(packages.join(", "))}\n`);

          try {
            installPackages(packages, finalPackageManager, projectInfo.projectRoot);
            console.log(`\n${pc.green("Packages installed successfully!")}\n`);
          } catch (error) {
            console.error(`\n${pc.red("Failed to install packages:")}`, error);
            showDocsLink();
            process.exit(1);
          }
        }
      }

      applyTransform(result);
      console.log(`\n${pc.green("Applied:")} ${result.filePath}`);
    }
  }

  console.log(`\n${pc.green("Done!")}`);
  console.log(`\nNext steps:`);
  console.log(`  - Start your development server`);
  console.log(`  - Select an element to copy its context`);
  console.log(`  - Learn more at ${pc.cyan("https://react-grab.com")}\n`);

  if (agentIntegration !== "none") {
    console.log(`${pc.magenta("⚛")} Agent: ${pc.cyan(AGENT_NAMES[agentIntegration])}`);
    console.log(`  Make sure to start the agent server before using it.\n`);
  }
};

main().catch((error) => {
  console.error(`${pc.red("Error:")}`, error);
  console.log("\nFor manual installation instructions, visit:");
  console.log(`  ${DOCS_URL}\n`);
  process.exit(1);
});
