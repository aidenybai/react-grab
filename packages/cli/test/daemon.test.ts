import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import {
  claimDaemon,
  isDaemonRunning,
  readDaemonPid,
  releaseDaemon,
  stopDaemon,
} from "../src/utils/daemon.js";

// A pid far above every platform's pid_max, so it never names a real process.
const UNUSED_PID = "2147483647";

let dir: string;
const spawnedPids: number[] = [];

const pidFilePath = (): string => path.join(dir, "watch.pid");
const writePidFile = (value: string): void => fs.writeFileSync(pidFilePath(), value);

const spawnLiveProcess = (): number => {
  const child = spawn(process.execPath, ["-e", "setInterval(() => {}, 1e9)"], { stdio: "ignore" });
  const pid = child.pid;
  if (pid === undefined) throw new Error("failed to spawn test process");
  spawnedPids.push(pid);
  return pid;
};

const isAlive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

const waitForDead = async (pid: number, timeoutMs = 3000): Promise<void> => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (!isAlive(pid)) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
};

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "rg-daemon-"));
});

afterEach(() => {
  for (const pid of spawnedPids.splice(0)) {
    try {
      process.kill(pid, "SIGKILL");
    } catch {}
  }
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("readDaemonPid", () => {
  it("returns null when no pid file exists", () => {
    expect(readDaemonPid(dir)).toBe(null);
  });

  it("returns null for a non-numeric pid file", () => {
    writePidFile("not-a-pid");
    expect(readDaemonPid(dir)).toBe(null);
  });

  it("returns the parsed pid", () => {
    writePidFile("12345");
    expect(readDaemonPid(dir)).toBe(12345);
  });
});

describe("isDaemonRunning", () => {
  it("is false with no pid file", () => {
    expect(isDaemonRunning(dir)).toBe(false);
  });

  it("is false for a dead pid", () => {
    writePidFile(UNUSED_PID);
    expect(isDaemonRunning(dir)).toBe(false);
  });

  it("is true for a live pid", () => {
    writePidFile(String(process.pid));
    expect(isDaemonRunning(dir)).toBe(true);
  });
});

describe("claimDaemon", () => {
  it("claims an unwatched dir and writes our pid", () => {
    expect(claimDaemon(dir)).toBe(true);
    expect(readDaemonPid(dir)).toBe(process.pid);
  });

  it("refuses to claim when a live daemon already owns the dir", () => {
    const livePid = spawnLiveProcess();
    writePidFile(String(livePid));
    expect(claimDaemon(dir)).toBe(false);
    expect(readDaemonPid(dir)).toBe(livePid);
  });

  it("reclaims a stale pid file left by a dead daemon", () => {
    writePidFile(UNUSED_PID);
    expect(claimDaemon(dir)).toBe(true);
    expect(readDaemonPid(dir)).toBe(process.pid);
  });

  it("reclaims an empty pid file", () => {
    writePidFile("");
    expect(claimDaemon(dir)).toBe(true);
    expect(readDaemonPid(dir)).toBe(process.pid);
  });
});

describe("releaseDaemon", () => {
  it("removes the pid file when this process owns it", () => {
    writePidFile(String(process.pid));
    releaseDaemon(dir);
    expect(fs.existsSync(pidFilePath())).toBe(false);
  });

  it("leaves a pid file owned by another process intact", () => {
    writePidFile(UNUSED_PID);
    releaseDaemon(dir);
    expect(readDaemonPid(dir)).toBe(Number(UNUSED_PID));
  });
});

describe("stopDaemon", () => {
  it("returns null when no daemon is running", () => {
    expect(stopDaemon(dir)).toBe(null);
  });

  it("clears a stale pid file and returns null", () => {
    writePidFile(UNUSED_PID);
    expect(stopDaemon(dir)).toBe(null);
    expect(fs.existsSync(pidFilePath())).toBe(false);
  });

  it("SIGTERMs a live daemon, clears its pid file, and returns its pid", async () => {
    const livePid = spawnLiveProcess();
    writePidFile(String(livePid));
    expect(stopDaemon(dir)).toBe(livePid);
    expect(fs.existsSync(pidFilePath())).toBe(false);
    await waitForDead(livePid);
    expect(isAlive(livePid)).toBe(false);
  });
});
