import path from "node:path";
import { Command } from "commander";
import { NO_READER_MESSAGE, prepareWorkDir } from "../utils/clipboard.js";
import {
  DEFAULT_GRAB_AGE_MS,
  DEFAULT_WATCH_DIR,
  DEFAULT_WATCH_INTERVAL_MS,
  READ_DEFAULT_LIMIT,
  READ_WAIT_POLL_MS,
} from "../utils/constants.js";
import { ensureDaemon } from "../utils/daemon.js";
import { consumeGrabs } from "../utils/grab-log.js";
import { parseNonNegativeInt, parseWaitMs } from "../utils/read-args.js";
import { sleep } from "../utils/sleep.js";
import { unrefStdin } from "../utils/unref-stdin.js";

interface PullOptions {
  dir: string;
  wait: string;
  limit: string;
  maxAge: string;
  textOnly?: boolean;
  all?: boolean;
}

const fail = (message: string): never => {
  process.stderr.write(`react-grab pull: ${message}\n`);
  process.exit(1);
};

// Exit only after the write flushes; process.exit() mid-write can truncate a pipe.
const emitAndExit = (lines: string[]): void => {
  process.stdout.write(`${lines.join("\n")}\n`, () => process.exit(0));
};

export const pull = new Command()
  .name("pull")
  .description("start the watcher if needed, then wait for and print the next React Grab grab(s)")
  .option("-d, --dir <dir>", "work dir for history.jsonl + watch.pid", DEFAULT_WATCH_DIR)
  .option(
    "-w, --wait <ms>",
    "how long to wait for a grab: ms, 'infinite', or 0 for none",
    "infinite",
  )
  .option(
    "-n, --limit <count>",
    "max grabs to print per call (0 = no limit)",
    String(READ_DEFAULT_LIMIT),
  )
  .option(
    "--max-age <ms>",
    "skip grabs captured longer ago than <ms> (0 = never)",
    String(DEFAULT_GRAB_AGE_MS),
  )
  .option(
    "--text-only",
    "watcher uses the plain-text clipboard reader (ignored if already running)",
  )
  .option("--all", "print the whole history without advancing the cursor")
  .action(async (options: PullOptions) => {
    const dir = path.resolve(options.dir);

    try {
      prepareWorkDir(dir);
    } catch (error) {
      fail(String((error as Error)?.message ?? error));
    }

    const waitMs = parseWaitMs(options.wait);
    if (waitMs === null) fail(`invalid --wait "${options.wait}" (use milliseconds or "infinite")`);
    const limit = parseNonNegativeInt(options.limit);
    if (limit === null) fail(`invalid --limit "${options.limit}" (use a non-negative integer)`);
    const maxAgeMs = parseNonNegativeInt(options.maxAge);
    if (maxAgeMs === null)
      fail(`invalid --max-age "${options.maxAge}" (use milliseconds, 0 to disable)`);

    const all = Boolean(options.all);
    const textOnly = Boolean(options.textOnly);

    if (
      ensureDaemon({ dir, intervalMs: DEFAULT_WATCH_INTERVAL_MS, textOnly, replayLast: false }) ===
      "no-reader"
    ) {
      fail(NO_READER_MESSAGE);
    }

    unrefStdin();
    const consume = (): string[] => consumeGrabs(dir, { limit, all, maxAgeMs });

    const first = consume();
    if (first.length > 0) {
      emitAndExit(first);
      return;
    }

    const deadline = Date.now() + waitMs;
    while (Date.now() < deadline) {
      await sleep(READ_WAIT_POLL_MS);
      const batch = consume();
      if (batch.length > 0) {
        emitAndExit(batch);
        return;
      }
    }
    process.exit(0);
  });
