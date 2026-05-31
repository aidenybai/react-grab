import path from "node:path";
import { Command } from "commander";
import { DEFAULT_WATCH_DIR } from "../utils/constants.js";
import { stopDaemon } from "../utils/daemon.js";

export const stop = new Command()
  .name("stop")
  .description("stop the React Grab watcher for this dir")
  .option("-d, --dir <dir>", "work dir holding watch.pid", DEFAULT_WATCH_DIR)
  .action((options: { dir: string }) => {
    const dir = path.resolve(options.dir);
    const stoppedPid = stopDaemon(dir);
    process.stderr.write(
      stoppedPid
        ? `react-grab stop: stopped watcher (pid ${stoppedPid})\n`
        : `react-grab stop: no watcher running for ${dir}\n`,
    );
    process.exit(0);
  });
