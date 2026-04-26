import { spawnSync, type SpawnSyncOptions } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vite-plus/test";

const CLI_PATH = path.resolve(__dirname, "..", "dist", "cli.js");

const SSH_DETECTION_KEYS = ["SSH_CLIENT", "SSH_TTY", "SSH_CONNECTION", "WSL_DISTRO_NAME"] as const;

const buildCleanEnv = (): NodeJS.ProcessEnv => {
  const cleaned: NodeJS.ProcessEnv = { ...process.env };
  for (const key of SSH_DETECTION_KEYS) delete cleaned[key];
  return cleaned;
};

const runWatch = (
  args: string[],
  envOverrides: Record<string, string>,
  spawnOptions: Partial<SpawnSyncOptions> = {},
): ReturnType<typeof spawnSync> | null => {
  if (!existsSync(CLI_PATH)) return null;
  return spawnSync(process.execPath, [CLI_PATH, "watch", ...args], {
    encoding: "utf8",
    timeout: 10_000,
    env: { ...buildCleanEnv(), ...envOverrides },
    ...spawnOptions,
  });
};

describe("react-grab watch CLI", () => {
  it("exits 2 immediately under SSH without polling", () => {
    const result = runWatch(["--timeout", "30"], { SSH_CLIENT: "1.2.3.4 5678 22" });
    if (result === null) return;

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("SSH");
    expect(result.stderr).not.toContain("Waiting for React Grab clipboard");
  });

  it("exits 2 with a parse-error message for an invalid --timeout value", () => {
    const result = runWatch(["--timeout", "abc"], {});
    if (result === null) return;

    expect(result.status).toBe(2);
    expect(result.stderr).toContain('Invalid --timeout value: "abc"');
    expect(result.stderr).not.toContain("Waiting for React Grab clipboard");
  });

  it("exits 1 with a click-and-retry message after a short timeout", () => {
    const result = runWatch(["--timeout", "0.5"], {});
    if (result === null) return;

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Timed out");
    expect(result.stderr).toContain("Click an element");
  });
});
