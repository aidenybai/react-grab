import path from "node:path";
import { Command } from "commander";
import { prepareWorkDir } from "../utils/clipboard.js";
import { DEFAULT_WATCH_DIR, READ_DEFAULT_LIMIT, READ_WAIT_POLL_MS } from "../utils/constants.js";
import { consumeGrabs } from "../utils/grab-log.js";
import { sleep } from "../utils/sleep.js";
import { unrefStdin } from "../utils/unref-stdin.js";

interface ReadOptions {
  dir: string;
  wait?: string;
  limit: string;
  all?: boolean;
}

export const read = new Command()
  .name("read")
  .description("print React Grab selections captured since the last read, then advance the cursor")
  .option("-d, --dir <dir>", "work dir holding history.jsonl + cursor.txt", DEFAULT_WATCH_DIR)
  .option("-w, --wait <ms>", "block up to <ms> for at least one new grab (default: no wait)")
  .option(
    "-n, --limit <count>",
    "max grabs to print per call (0 = no limit); the cursor only advances past what is printed",
    String(READ_DEFAULT_LIMIT),
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

    const limitRaw = Number(options.limit);
    const limit = Number.isInteger(limitRaw) && limitRaw >= 0 ? limitRaw : READ_DEFAULT_LIMIT;
    const all = Boolean(options.all);

    const drain = (): number => {
      const fresh = consumeGrabs(dir, { limit, all });
      if (fresh.length > 0) process.stdout.write(`${fresh.join("\n")}\n`);
      return fresh.length;
    };

    const waitRaw = options.wait ? Number(options.wait) : 0;
    const deadline = Date.now() + (Number.isFinite(waitRaw) && waitRaw > 0 ? waitRaw : 0);

    if (drain() > 0) process.exit(0);
    while (Date.now() < deadline) {
      await sleep(READ_WAIT_POLL_MS);
      if (drain() > 0) break;
    }
    process.exit(0);
  });
