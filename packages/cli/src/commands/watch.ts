import path from "node:path";
import { Command } from "commander";
import {
  HISTORY_FILE_NAME,
  NO_READER_MESSAGE,
  createReader,
  prepareWorkDir,
  runWatchLoop,
} from "../utils/clipboard.js";
import { DEFAULT_WATCH_DIR, DEFAULT_WATCH_INTERVAL_MS } from "../utils/constants.js";
import { claimDaemon, releaseDaemon } from "../utils/daemon.js";

interface WatchOptions {
  dir: string;
  interval: string;
  textOnly?: boolean;
  replayLast?: boolean;
}

const writeStatus = (message: string): void => {
  process.stderr.write(`react-grab watch: ${message}\n`);
};

// The capture-daemon body that `pull` re-execs detached. Claims the per-dir lock
// (exits quietly if another daemon already owns it), then polls the clipboard
// into history.jsonl until the process is killed.
export const watch = new Command()
  .name("watch")
  .description("run the React Grab capture daemon in the foreground (used internally by `pull`)")
  .option("-d, --dir <dir>", "work dir for history.jsonl + watch.pid", DEFAULT_WATCH_DIR)
  .option("-i, --interval <ms>", "clipboard poll interval in ms", String(DEFAULT_WATCH_INTERVAL_MS))
  .option("--text-only", "skip the native reader and use the plain-text fallback")
  .option("--replay-last", "also capture the grab already on the clipboard at startup")
  .action((options: WatchOptions) => {
    const dir = path.resolve(options.dir);
    const intervalRaw = Number(options.interval);
    const intervalMs =
      Number.isFinite(intervalRaw) && intervalRaw > 0 ? intervalRaw : DEFAULT_WATCH_INTERVAL_MS;

    try {
      prepareWorkDir(dir);
    } catch (error) {
      writeStatus(String((error as Error)?.message ?? error));
      process.exit(1);
    }

    if (!claimDaemon(dir)) process.exit(0);
    process.on("exit", () => releaseDaemon(dir));

    const reader = createReader({ textOnly: Boolean(options.textOnly), workDir: dir });
    if (!reader) {
      writeStatus(NO_READER_MESSAGE);
      process.exit(1);
    }

    writeStatus(
      `watching clipboard via ${reader.mode}; history → ${path.join(dir, HISTORY_FILE_NAME)}`,
    );

    runWatchLoop({
      reader,
      dir,
      intervalMs,
      replayLast: Boolean(options.replayLast),
      onWarn: writeStatus,
    }).catch((error) => {
      writeStatus(String((error as Error)?.message ?? error));
      process.exit(1);
    });
  });
