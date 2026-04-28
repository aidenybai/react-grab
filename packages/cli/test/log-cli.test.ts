import { spawnSync, type SpawnSyncOptions } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vite-plus/test";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const CLI_PATH = path.resolve(TEST_DIR, "..", "dist", "cli.js");

const SSH_DETECTION_KEYS = ["SSH_CLIENT", "SSH_TTY", "SSH_CONNECTION", "WSL_DISTRO_NAME"] as const;

const buildCleanEnv = (): NodeJS.ProcessEnv => {
  const cleaned: NodeJS.ProcessEnv = { ...process.env };
  for (const key of SSH_DETECTION_KEYS) delete cleaned[key];
  return cleaned;
};

const runLog = (
  args: string[],
  envOverrides: Record<string, string>,
  spawnOptions: Partial<SpawnSyncOptions> = {},
): ReturnType<typeof spawnSync> | null => {
  if (!existsSync(CLI_PATH)) return null;
  return spawnSync(process.execPath, [CLI_PATH, "log", ...args], {
    encoding: "utf8",
    timeout: 10_000,
    env: { ...buildCleanEnv(), ...envOverrides },
    ...spawnOptions,
  });
};

describe("react-grab log CLI", () => {
  it("exits 2 immediately under SSH without polling", () => {
    const result = runLog([], { SSH_CLIENT: "1.2.3.4 5678 22" });
    if (result === null) return;

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("SSH");
    expect(result.stderr).not.toContain("Streaming React Grab clipboard");
  });

  it("rejects unknown flags (log takes none)", () => {
    const result = runLog(["--timeout", "30"], {});
    if (result === null) return;

    // Commander exits with a non-zero status and reports the unknown option
    // on stderr; the exact code is implementation-defined but must not be 0.
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/unknown option|--timeout/i);
  });
});
