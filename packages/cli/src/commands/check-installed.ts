import { resolve } from "node:path";
import { Command } from "commander";
import { detectReactGrab, findNearestProjectRoot } from "../utils/detect.js";

interface CheckInstalledOptions {
  cwd: string;
  json?: boolean;
}

export const checkInstalled = new Command()
  .name("check-installed")
  .alias("is-installed")
  .description("exit 0 if react-grab is installed in the project, exit 1 otherwise")
  .option("-c, --cwd <cwd>", "working directory (defaults to current directory)", process.cwd())
  .option("--json", "print structured JSON output instead of human text")
  .action((rawOptions: CheckInstalledOptions) => {
    // Walk up to the project root so the skill template's preflight check
    // succeeds when the agent's working directory is a subdirectory of the
    // project (common in monorepos and when the agent opens a deeper folder).
    // Sibling commands (add, install-skill, remove) already do this; if
    // check-installed didn't, the skill would falsely report "not installed"
    // and prompt the user to run `grab init` even when react-grab is set up.
    const requestedCwd = resolve(rawOptions.cwd);
    const projectRoot = findNearestProjectRoot(requestedCwd);
    const installed = detectReactGrab(projectRoot);

    if (rawOptions.json) {
      process.stdout.write(`${JSON.stringify({ installed, cwd: projectRoot })}\n`);
    } else if (installed) {
      process.stdout.write(`react-grab is installed at ${projectRoot}\n`);
    } else {
      process.stderr.write(
        `react-grab is not installed at ${projectRoot}. Run \`npx grab@latest init\` to install.\n`,
      );
    }

    process.exit(installed ? 0 : 1);
  });
