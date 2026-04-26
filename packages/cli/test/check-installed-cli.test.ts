import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const CLI_PATH = path.resolve(TEST_DIR, "..", "dist", "cli.js");

interface RunResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

const runCheck = (cwd: string, args: string[] = []): RunResult | null => {
  if (!existsSync(CLI_PATH)) return null;
  const result = spawnSync(process.execPath, [CLI_PATH, "check-installed", "--cwd", cwd, ...args], {
    encoding: "utf8",
    timeout: 10_000,
  });
  return {
    status: result.status,
    stdout: String(result.stdout ?? ""),
    stderr: String(result.stderr ?? ""),
  };
};

let workDir: string;

beforeEach(() => {
  workDir = mkdtempSync(path.join(tmpdir(), "react-grab-check-"));
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

describe("react-grab check-installed CLI", () => {
  it("exits 1 with stderr guidance when react-grab is not installed", () => {
    writeFileSync(
      path.join(workDir, "package.json"),
      JSON.stringify({ name: "demo", dependencies: { react: "^18.0.0" } }),
    );

    const result = runCheck(workDir);
    if (result === null) return;

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("react-grab is not installed");
    expect(result.stderr).toContain("npx grab@latest init");
  });

  it("exits 0 with stdout confirmation when react-grab is in dependencies", () => {
    writeFileSync(
      path.join(workDir, "package.json"),
      JSON.stringify({ name: "demo", dependencies: { "react-grab": "^0.1.0" } }),
    );

    const result = runCheck(workDir);
    if (result === null) return;

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("react-grab is installed");
  });

  it("emits structured JSON under --json regardless of installation state", () => {
    writeFileSync(
      path.join(workDir, "package.json"),
      JSON.stringify({ name: "demo", dependencies: { react: "^18.0.0" } }),
    );

    const result = runCheck(workDir, ["--json"]);
    if (result === null) return;

    expect(result.status).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed).toEqual({ installed: false, cwd: workDir });
  });

  it("is reachable via the is-installed alias", () => {
    if (!existsSync(CLI_PATH)) return;
    writeFileSync(
      path.join(workDir, "package.json"),
      JSON.stringify({ name: "demo", dependencies: { "react-grab": "^0.1.0" } }),
    );

    const result = spawnSync(process.execPath, [CLI_PATH, "is-installed", "--cwd", workDir], {
      encoding: "utf8",
      timeout: 10_000,
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("react-grab is installed");
  });
});
