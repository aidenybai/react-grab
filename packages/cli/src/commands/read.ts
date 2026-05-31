import path from "node:path";
import { Command } from "commander";
import { prepareWorkDir } from "../utils/clipboard.js";
import {
  DEFAULT_WATCH_DIR,
  MAX_GRAB_AGE_MS,
  READ_DEFAULT_LIMIT,
  READ_WAIT_POLL_MS,
} from "../utils/constants.js";
import { consumeGrabs } from "../utils/grab-log.js";
import { sleep } from "../utils/sleep.js";
import { unrefStdin } from "../utils/unref-stdin.js";

interface ReadOptions {
  dir: string;
  wait?: string;
  limit: string;
  maxAge: string;
  all?: boolean;
}

// Accepts a millisecond count or "infinite"/"inf"/"forever"; anything else (or
// non-positive) means no wait.
const parseWaitMs = (raw: string | undefined): number => {
  if (!raw) return 0;
  if (/^(inf|infinite|forever)$/i.test(raw.trim())) return Number.POSITIVE_INFINITY;
  const ms = Number(raw);
  return Number.isFinite(ms) && ms > 0 ? ms : 0;
};

const parseNonNegativeInt = (raw: string, fallback: number): number => {
  const value = Number(raw);
  return Number.isInteger(value) && value >= 0 ? value : fallback;
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
    String(MAX_GRAB_AGE_MS),
  )
  .option("--all", "print the entire history without advancing the cursor")
  .action(async (options: ReadOptions) => {
    const dir = path.resolve(options.dir);

    try {
      prepareWorkDir(dir);
    } catch (error) {
      process.stderr.write(`react-grab read: ${String((error as Error)?.message ?? error)}\n`);
      process.exit(1);
    }

    unrefStdin();

    const limit = parseNonNegativeInt(options.limit, READ_DEFAULT_LIMIT);
    const maxAgeMs = parseNonNegativeInt(options.maxAge, MAX_GRAB_AGE_MS);
    const all = Boolean(options.all);

    const drain = (): number => {
      const fresh = consumeGrabs(dir, { limit, all, maxAgeMs });
      if (fresh.length > 0) process.stdout.write(`${fresh.join("\n")}\n`);
      return fresh.length;
    };

    const waitMs = parseWaitMs(options.wait);
    const deadline =
      waitMs === Number.POSITIVE_INFINITY ? Number.POSITIVE_INFINITY : Date.now() + waitMs;

    if (drain() > 0) process.exit(0);
    while (Date.now() < deadline) {
      await sleep(READ_WAIT_POLL_MS);
      if (drain() > 0) break;
    }
    process.exit(0);
  });
