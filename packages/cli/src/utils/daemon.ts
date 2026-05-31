import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DAEMON_CLAIM_MAX_ATTEMPTS } from "./constants.js";

const PID_FILE_NAME = "watch.pid";

const pidFilePath = (dir: string): string => path.join(dir, PID_FILE_NAME);

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

// Atomic `wx` create acts as the per-dir lock; a file left by a crashed daemon is
// reclaimed. The post-write re-read closes the open->write window where a racing
// claimant could see a momentarily-empty file and steal it.
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

// Removes the pid file only if it still names the pid we signalled, so a
// successor that already re-claimed the dir is not clobbered.
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

// Detached + unref'd so the launcher can exit immediately while the daemon keeps
// running in the background.
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
