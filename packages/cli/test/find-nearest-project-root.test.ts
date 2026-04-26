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

  it("stops at the deepest package.json (workspace package over root)", () => {
    fs.writeFileSync(path.join(tempDir, "package.json"), "{}");
    const workspaceRoot = path.join(tempDir, "packages", "ui");
    fs.mkdirSync(workspaceRoot, { recursive: true });
    fs.writeFileSync(path.join(workspaceRoot, "package.json"), "{}");
    const subdir = path.join(workspaceRoot, "src");
    fs.mkdirSync(subdir);
    expect(findNearestProjectRoot(subdir)).toBe(workspaceRoot);
  });

  it("falls back to the original input when no package.json is found", () => {
    const subdir = path.join(tempDir, "no-project", "deep");
    fs.mkdirSync(subdir, { recursive: true });
    expect(findNearestProjectRoot(subdir)).toBe(subdir);
  });
});
