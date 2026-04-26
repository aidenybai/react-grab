import { resolve } from "node:path";
import { Command } from "commander";
import { detectReactGrab, findNearestProjectRoot } from "../utils/detect.js";
import { handleError } from "../utils/handle-error.js";

interface CheckInstalledOptions {
  cwd: string;
  json?: boolean;
}

const exitWithFlush = (stream: NodeJS.WriteStream, message: string, exitCode: number): void => {
  stream.write(message, () => process.exit(exitCode));
};

export const checkInstalled = new Command()
  .name("check-installed")
  .alias("is-installed")
  .description("exit 0 if react-grab is installed in the project, exit 1 otherwise")
  .option("-c, --cwd <cwd>", "working directory (defaults to current directory)", process.cwd())
  .option("--json", "print structured JSON output instead of human text")
  .action((rawOptions: CheckInstalledOptions) => {
    try {
      const requestedCwd = resolve(rawOptions.cwd);
      // Match `add`, `install-skill`, `remove`: walk up so the preflight
      // works from any subdirectory inside a monorepo.
      const projectRoot = findNearestProjectRoot(requestedCwd);
      const installed = detectReactGrab(projectRoot);

      if (rawOptions.json) {
        const payload = JSON.stringify({ installed, projectRoot, requestedCwd });
        exitWithFlush(process.stdout, `${payload}\n`, installed ? 0 : 1);
        return;
      }

      if (installed) {
        exitWithFlush(process.stdout, `react-grab is installed at ${projectRoot}\n`, 0);
        return;
      }

      exitWithFlush(
        process.stderr,
        `react-grab is not installed at ${projectRoot}. Run \`npx grab@latest init\` to install.\n`,
        1,
      );
    } catch (error) {
      handleError(error);
    }
  });
