import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
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

  it("walks up from a subdirectory to find the project's package.json", () => {
    writeFileSync(
      path.join(workDir, "package.json"),
      JSON.stringify({ name: "demo", dependencies: { "react-grab": "^0.1.0" } }),
    );
    const subdir = path.join(workDir, "packages", "ui", "src");
    mkdirSync(subdir, { recursive: true });

    const result = runCheck(subdir, ["--json"]);
    if (result === null) return;

    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.installed).toBe(true);
    expect(parsed.cwd).toBe(path.resolve(workDir));
  });

  it("treats the react-grab source repo as installed (workspace named react-grab)", () => {
    // The root package.json has no react-grab dep (it IS the workspace
    // root) but a workspace package's name is `react-grab`. The detector
    // must recognize this so the skill preflight doesn't suggest running
    // `grab init` on the source repo / dogfood checkout.
    writeFileSync(
      path.join(workDir, "package.json"),
      JSON.stringify({
        name: "react-grab-monorepo",
        private: true,
        workspaces: ["packages/*"],
      }),
    );
    const reactGrabPkgDir = path.join(workDir, "packages", "react-grab");
    mkdirSync(reactGrabPkgDir, { recursive: true });
    writeFileSync(
      path.join(reactGrabPkgDir, "package.json"),
      JSON.stringify({ name: "react-grab", version: "0.1.0" }),
    );

    const result = runCheck(workDir, ["--json"]);
    if (result === null) return;

    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.installed).toBe(true);
  });

  it("treats a monorepo with react-grab in a workspace package as installed", () => {
    // Common pattern: root has no react-grab dep, but apps/web depends
    // on it. The preflight should still report installed.
    writeFileSync(
      path.join(workDir, "package.json"),
      JSON.stringify({
        name: "demo-monorepo",
        private: true,
        workspaces: ["apps/*"],
      }),
    );
    const appDir = path.join(workDir, "apps", "web");
    mkdirSync(appDir, { recursive: true });
    writeFileSync(
      path.join(appDir, "package.json"),
      JSON.stringify({ name: "web", dependencies: { "react-grab": "^0.1.0" } }),
    );

    const result = runCheck(workDir, ["--json"]);
    if (result === null) return;

    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.installed).toBe(true);
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
