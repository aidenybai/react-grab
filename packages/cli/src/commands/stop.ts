import { Command } from "commander";
import { stopDaemon } from "../utils/daemon.js";
import { resolveWatchDir } from "../utils/resolve-watch-dir.js";

export const stop = new Command()
  .name("stop")
  .description("stop the React Grab watcher for this dir")
  .option(
    "-d, --dir <dir>",
    "work dir holding watch.pid (default: per-project dir under ~/.react-grab)",
  )
  .action((options: { dir?: string }) => {
    const dir = resolveWatchDir(options.dir);
    const stoppedPid = stopDaemon(dir);
    process.stderr.write(
      stoppedPid
        ? `react-grab stop: stopped watcher (pid ${stoppedPid})\n`
        : `react-grab stop: no watcher running for ${dir}\n`,
    );
    process.exit(0);
  });
