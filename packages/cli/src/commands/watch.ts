import path from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import { createReader, prepareWorkDir, watchForNextGrab } from "../utils/clipboard.js";

const DEFAULT_INTERVAL_MS = 800;
const DEFAULT_DIR = ".react-grab";

// Native readers (read-clipboard.swift / .ps1) are copied next to the compiled
// CLI at build time (see scripts/copy-native-readers.mjs).
const readersDir = (): string => path.dirname(fileURLToPath(import.meta.url));

interface WatchOptions {
  dir: string;
  interval: string;
  textOnly?: boolean;
  replayLast?: boolean;
}

export const watch = new Command()
  .name("watch")
  .description("watch the clipboard for the next React Grab selection, print it, then exit")
  .option("-d, --dir <dir>", "work dir for history.jsonl + cursor.txt", DEFAULT_DIR)
  .option("-i, --interval <ms>", "clipboard poll interval in ms", String(DEFAULT_INTERVAL_MS))
  .option("--text-only", "skip the native reader and use the plain-text fallback")
  .option("--replay-last", "also capture the grab already on the clipboard at startup")
  .action((options: WatchOptions) => {
    const dir = path.resolve(options.dir);
    const intervalMs = Number(options.interval);
    const textOnly = Boolean(options.textOnly);

    try {
      prepareWorkDir(dir);
    } catch (error) {
      process.stderr.write(`react-grab watch: ${String((error as Error)?.message ?? error)}\n`);
      process.exit(1);
    }

    const reader = createReader({ textOnly, readersDir: readersDir(), workDir: dir });
    if (!reader) {
      process.stderr.write(
        "react-grab watch: no clipboard reader available. Linux: install xclip or wl-clipboard. macOS: install Xcode CLI tools (swiftc) or rely on pbpaste. Windows: ensure PowerShell is on PATH.\n",
      );
      process.exit(1);
    }

    process.stderr.write(
      `react-grab watch: watching clipboard via ${reader.mode}; history → ${path.join(dir, "history.jsonl")} (Ctrl+C to stop)\n`,
    );

    watchForNextGrab({
      reader,
      dir,
      intervalMs: Number.isFinite(intervalMs) && intervalMs > 0 ? intervalMs : DEFAULT_INTERVAL_MS,
      replayLast: Boolean(options.replayLast),
      onWarn: (message) => process.stderr.write(`react-grab watch: ${message}\n`),
    })
      .then((grab) => {
        if (!grab) process.exit(0);
        process.stdout.write(`${JSON.stringify(grab)}\n`);
        process.exit(0);
      })
      .catch((error) => {
        process.stderr.write(`react-grab watch: ${String((error as Error)?.message ?? error)}\n`);
        process.exit(1);
      });
  });
