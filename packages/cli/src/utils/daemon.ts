import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DAEMON_CLAIM_MAX_ATTEMPTS } from "./constants.js";

const PID_FILE_NAME = "watch.pid";

const pidFilePath = (dir: string): string => path.join(dir, PID_FILE_NAME);

// Re-execing the CLI needs the path Node was launched with; fall back to the
// compiled bundle's own URL on the rare host where argv[1] is absent.
const cliEntryPath = (): string => process.argv[1] ?? fileURLToPath(import.meta.url);

// Signal 0 only runs the kernel's permission/existence checks without delivering
// anything: ESRCH means the process is gone, EPERM means it exists under another
// user (still "alive" for dedup purposes).
const isProcessAlive = (pid: number): boolean => {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
};

export const readDaemonPid = (dir: string): number | null => {
  try {
    const pid = Number.parseInt(fs.readFileSync(pidFilePath(dir), "utf8").trim(), 10);
    return Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
};

export const isDaemonRunning = (dir: string): boolean => {
  const pid = readDaemonPid(dir);
  return pid !== null && isProcessAlive(pid);
};

// Atomically claims the per-dir pid file so exactly one daemon body runs per work
// dir. Returns false when a live daemon already owns it (the caller lost the race
// and should exit). A pid file left by a crashed daemon is reclaimed. The post-
// write re-read closes the tiny open->write window where a racing body could see
// a momentarily-empty file and reclaim it.
export const claimDaemon = (dir: string): boolean => {
  const file = pidFilePath(dir);
  for (let attempt = 0; attempt < DAEMON_CLAIM_MAX_ATTEMPTS; attempt += 1) {
    try {
      const handle = fs.openSync(file, "wx");
      fs.writeFileSync(handle, String(process.pid));
      fs.closeSync(handle);
      return readDaemonPid(dir) === process.pid;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      if (isDaemonRunning(dir)) return false;
      try {
        fs.rmSync(file, { force: true });
      } catch {}
    }
  }
  return false;
};

// Removes the pid file only when this process still owns it, so a freshly
// restarted daemon's file is never clobbered by a predecessor's late cleanup.
export const releaseDaemon = (dir: string): void => {
  if (readDaemonPid(dir) === process.pid) {
    try {
      fs.rmSync(pidFilePath(dir), { force: true });
    } catch {}
  }
};

// Stops the daemon watching `dir`: SIGTERMs it (when alive), then clears the pid
// file only if it still names that pid, so a successor daemon that already
// re-claimed the dir is never clobbered. Returns the pid of the live daemon that
// was stopped, or null when none was running.
export const stopDaemon = (dir: string): number | null => {
  const pid = readDaemonPid(dir);
  if (pid === null) return null;
  const wasAlive = isProcessAlive(pid);
  if (wasAlive) {
    try {
      process.kill(pid, "SIGTERM");
    } catch {}
  }
  if (readDaemonPid(dir) === pid) {
    try {
      fs.rmSync(pidFilePath(dir), { force: true });
    } catch {}
  }
  return wasAlive ? pid : null;
};

interface SpawnDaemonOptions {
  dir: string;
  intervalMs: number;
  textOnly: boolean;
  replayLast: boolean;
}

// Re-execs this CLI as a detached `watch --foreground` process, then unrefs it so
// the launcher exits immediately while the daemon keeps capturing in the
// background. The detached child claims the pid file itself (see claimDaemon).
export const spawnDaemon = (options: SpawnDaemonOptions): void => {
  const args = [
    cliEntryPath(),
    "watch",
    "--foreground",
    "--dir",
    options.dir,
    "--interval",
    String(options.intervalMs),
  ];
  if (options.textOnly) args.push("--text-only");
  if (options.replayLast) args.push("--replay-last");
  const child = spawn(process.execPath, args, {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();
};
