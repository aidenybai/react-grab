import path from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import {
  HISTORY_FILE_NAME,
  createReader,
  prepareWorkDir,
  runWatchLoop,
} from "../utils/clipboard.js";
import { DEFAULT_WATCH_DIR, DEFAULT_WATCH_INTERVAL_MS } from "../utils/constants.js";
import {
  claimDaemon,
  isDaemonRunning,
  readDaemonPid,
  releaseDaemon,
  spawnDaemon,
  stopDaemon,
} from "../utils/daemon.js";

// Native readers (read-clipboard.swift / .ps1) are copied next to the compiled
// CLI at build time (see scripts/copy-native-readers.mjs).
const readersDir = (): string => path.dirname(fileURLToPath(import.meta.url));

interface WatchOptions {
  dir: string;
  interval: string;
  textOnly?: boolean;
  replayLast?: boolean;
  foreground?: boolean;
  stop?: boolean;
}

const NO_READER_MESSAGE =
  "no clipboard reader available. Linux: install xclip or wl-clipboard. macOS: install Xcode CLI tools (swiftc) or rely on pbpaste. Windows: ensure PowerShell is on PATH.";

const writeStatus = (message: string): void => {
  process.stderr.write(`react-grab watch: ${message}\n`);
};

// The daemon body. Claims the per-dir lock (exiting quietly if another daemon
// won the race) then polls the clipboard until the process is signalled.
const runForeground = (
  dir: string,
  intervalMs: number,
  textOnly: boolean,
  replayLast: boolean,
): void => {
  if (!claimDaemon(dir)) process.exit(0);
  process.on("exit", () => releaseDaemon(dir));

  const reader = createReader({ textOnly, readersDir: readersDir(), workDir: dir });
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
    replayLast,
    onWarn: writeStatus,
  }).catch((error) => {
    writeStatus(String((error as Error)?.message ?? error));
    process.exit(1);
  });
};

export const watch = new Command()
  .name("watch")
  .description("start a background daemon that captures React Grab selections to history.jsonl")
  .option("-d, --dir <dir>", "work dir for history.jsonl + watch.pid", DEFAULT_WATCH_DIR)
  .option("-i, --interval <ms>", "clipboard poll interval in ms", String(DEFAULT_WATCH_INTERVAL_MS))
  .option("--text-only", "skip the native reader and use the plain-text fallback")
  .option("--replay-last", "also capture the grab already on the clipboard at startup")
  .option("--foreground", "run the capture loop in this process instead of detaching a daemon")
  .option("--stop", "stop the daemon watching this dir")
  .action((options: WatchOptions) => {
    const dir = path.resolve(options.dir);
    const intervalRaw = Number(options.interval);
    const intervalMs =
      Number.isFinite(intervalRaw) && intervalRaw > 0 ? intervalRaw : DEFAULT_WATCH_INTERVAL_MS;
    const textOnly = Boolean(options.textOnly);
    const replayLast = Boolean(options.replayLast);

    try {
      prepareWorkDir(dir);
    } catch (error) {
      writeStatus(String((error as Error)?.message ?? error));
      process.exit(1);
    }

    if (options.stop) {
      const stoppedPid = stopDaemon(dir);
      writeStatus(
        stoppedPid ? `stopped daemon (pid ${stoppedPid})` : `no daemon running for ${dir}`,
      );
      process.exit(0);
    }

    if (options.foreground) {
      runForeground(dir, intervalMs, textOnly, replayLast);
      return;
    }

    if (isDaemonRunning(dir)) {
      writeStatus(`already watching ${dir} (pid ${readDaemonPid(dir)})`);
      process.exit(0);
    }

    // Validate the reader here so a missing one surfaces to the caller: the
    // detached daemon's stderr is discarded, so it would otherwise fail
    // invisibly after the launcher already reported success.
    if (!createReader({ textOnly, readersDir: readersDir(), workDir: dir })) {
      writeStatus(NO_READER_MESSAGE);
      process.exit(1);
    }

    spawnDaemon({ dir, intervalMs, textOnly, replayLast });
    writeStatus(
      `started; capturing grabs → ${path.join(dir, HISTORY_FILE_NAME)} (run \`grab read\` to consume, \`grab watch --stop\` to stop)`,
    );
    process.exit(0);
  });
