import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { findNearestProjectRoot } from "../src/utils/detect.js";

let tempDir: string;

beforeEach(() => {
  tempDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "find-root-test-")));
});

afterEach(() => {
  if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
});

describe("findNearestProjectRoot", () => {
  it("returns the directory itself when it contains package.json", () => {
    fs.writeFileSync(path.join(tempDir, "package.json"), "{}");
    expect(findNearestProjectRoot(tempDir)).toBe(tempDir);
  });

  it("walks up from a subdirectory to the nearest package.json", () => {
    fs.writeFileSync(path.join(tempDir, "package.json"), "{}");
    const subdir = path.join(tempDir, "packages", "ui", "src", "components");
    fs.mkdirSync(subdir, { recursive: true });
    expect(findNearestProjectRoot(subdir)).toBe(tempDir);
  });

  it("returns the workspace root over a deeper package.json (pnpm-workspace.yaml)", () => {
    fs.writeFileSync(path.join(tempDir, "package.json"), "{}");
    fs.writeFileSync(path.join(tempDir, "pnpm-workspace.yaml"), "packages:\n  - 'packages/*'\n");
    const workspacePackage = path.join(tempDir, "packages", "ui");
    fs.mkdirSync(workspacePackage, { recursive: true });
    fs.writeFileSync(path.join(workspacePackage, "package.json"), "{}");
    const subdir = path.join(workspacePackage, "src");
    fs.mkdirSync(subdir);
    expect(findNearestProjectRoot(subdir)).toBe(tempDir);
  });

  it("returns the workspace root for npm/yarn workspaces (workspaces field)", () => {
    fs.writeFileSync(
      path.join(tempDir, "package.json"),
      JSON.stringify({ workspaces: ["packages/*"] }),
    );
    const workspacePackage = path.join(tempDir, "packages", "ui");
    fs.mkdirSync(workspacePackage, { recursive: true });
    fs.writeFileSync(path.join(workspacePackage, "package.json"), "{}");
    expect(findNearestProjectRoot(workspacePackage)).toBe(tempDir);
  });

  it("returns the workspace root for lerna.json monorepos", () => {
    fs.writeFileSync(path.join(tempDir, "package.json"), "{}");
    fs.writeFileSync(
      path.join(tempDir, "lerna.json"),
      JSON.stringify({ packages: ["packages/*"] }),
    );
    const workspacePackage = path.join(tempDir, "packages", "core");
    fs.mkdirSync(workspacePackage, { recursive: true });
    fs.writeFileSync(path.join(workspacePackage, "package.json"), "{}");
    expect(findNearestProjectRoot(workspacePackage)).toBe(tempDir);
  });

  it("returns the deepest package.json for non-workspace single repos", () => {
    // A nested project inside an unrelated parent: parent has package.json
    // but no workspaces marker. The nested project's package.json wins.
    fs.writeFileSync(path.join(tempDir, "package.json"), "{}");
    const nested = path.join(tempDir, "subprojects", "isolated");
    fs.mkdirSync(nested, { recursive: true });
    fs.writeFileSync(path.join(nested, "package.json"), "{}");
    const subdir = path.join(nested, "src");
    fs.mkdirSync(subdir);
    expect(findNearestProjectRoot(subdir)).toBe(nested);
  });

  it("falls back to the original input when no package.json is found", () => {
    const subdir = path.join(tempDir, "no-project", "deep");
    fs.mkdirSync(subdir, { recursive: true });
    expect(findNearestProjectRoot(subdir)).toBe(subdir);
  });

  it("resolves a relative input on the no-package.json fallback path", () => {
    // Walk into a deep subdir of the temp dir so the fallback branch fires
    // (no package.json anywhere up the chain to the filesystem root). We
    // call findNearestProjectRoot with a *relative* path and expect an
    // absolute path back, otherwise downstream `path.resolve(cwd, ...)`
    // calls would silently use the process-cwd as a base instead of the
    // intended directory.
    const previousCwd = process.cwd();
    const relativeStart = path.join("no-project", "deep");
    const absoluteStart = path.join(tempDir, relativeStart);
    fs.mkdirSync(absoluteStart, { recursive: true });
    process.chdir(tempDir);
    try {
      const result = findNearestProjectRoot(relativeStart);
      expect(path.isAbsolute(result)).toBe(true);
      expect(result).toBe(absoluteStart);
    } finally {
      process.chdir(previousCwd);
    }
  });
});
