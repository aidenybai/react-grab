import { resolve } from "node:path";
import { Command } from "commander";
import { detectReactGrab } from "../utils/detect.js";

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
    const cwd = resolve(rawOptions.cwd);
    const installed = detectReactGrab(cwd);

    if (rawOptions.json) {
      process.stdout.write(`${JSON.stringify({ installed, cwd })}\n`);
    } else if (installed) {
      process.stdout.write(`react-grab is installed at ${cwd}\n`);
    } else {
      process.stderr.write(
        `react-grab is not installed at ${cwd}. Run \`npx grab@latest init\` to install.\n`,
      );
    }

    process.exit(installed ? 0 : 1);
  });
