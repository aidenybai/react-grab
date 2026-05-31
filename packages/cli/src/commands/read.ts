import path from "node:path";
import { Command } from "commander";
import { prepareWorkDir } from "../utils/clipboard.js";
import {
  DEFAULT_GRAB_AGE_MS,
  DEFAULT_WATCH_DIR,
  READ_DEFAULT_LIMIT,
  READ_WAIT_POLL_MS,
} from "../utils/constants.js";
import { consumeGrabs } from "../utils/grab-log.js";
import { parseGrabCount, parseWaitMs } from "../utils/read-args.js";
import { sleep } from "../utils/sleep.js";
import { unrefStdin } from "../utils/unref-stdin.js";

interface ReadOptions {
  dir: string;
  wait?: string;
  limit: string;
  maxAge: string;
  all?: boolean;
}

const fail = (message: string): never => {
  process.stderr.write(`react-grab read: ${message}\n`);
  process.exit(1);
};

// Exit only after the write flushes; process.exit() mid-write can truncate a pipe.
const emitAndExit = (lines: string[]): void => {
  process.stdout.write(`${lines.join("\n")}\n`, () => process.exit(0));
};

export const read = new Command()
  .name("read")
  .description("print React Grab selections captured since the last read, then advance the cursor")
  .option("-d, --dir <dir>", "work dir holding history.jsonl + cursor.txt", DEFAULT_WATCH_DIR)
  .option("-w, --wait <ms>", "block up to <ms> (or 'infinite') for a new grab (default: no wait)")
  .option(
    "-n, --limit <count>",
    "max grabs to print per call (0 = no limit); the cursor only advances past what is printed",
    String(READ_DEFAULT_LIMIT),
  )
  .option(
    "--max-age <ms>",
    "skip grabs captured longer ago than <ms> (0 = never evict)",
    String(DEFAULT_GRAB_AGE_MS),
  )
  .option("--all", "print the entire history without advancing the cursor")
  .action(async (options: ReadOptions) => {
    const dir = path.resolve(options.dir);

    try {
      prepareWorkDir(dir);
    } catch (error) {
      fail(String((error as Error)?.message ?? error));
    }

    unrefStdin();

    const waitMs = parseWaitMs(options.wait);
    if (waitMs === null) fail(`invalid --wait "${options.wait}" (use milliseconds or "infinite")`);
    const limit = parseGrabCount(options.limit);
    if (limit === null) fail(`invalid --limit "${options.limit}" (use a non-negative integer)`);
    const maxAgeMs = parseGrabCount(options.maxAge);
    if (maxAgeMs === null)
      fail(`invalid --max-age "${options.maxAge}" (use milliseconds, 0 to disable)`);

    const all = Boolean(options.all);
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
