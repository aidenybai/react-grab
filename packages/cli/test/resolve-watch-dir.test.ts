import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { resolveWatchDir } from "../src/utils/resolve-watch-dir.js";

let originalCwd: string;
let projectDir: string;

beforeEach(() => {
  originalCwd = process.cwd();
  projectDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "rg-watch-dir-")));
  process.chdir(projectDir);
});

afterEach(() => {
  process.chdir(originalCwd);
  fs.rmSync(projectDir, { recursive: true, force: true });
});

describe("resolveWatchDir", () => {
  it("defaults to a per-project dir under the home dir, outside the project", () => {
    const watchDir = resolveWatchDir(undefined);
    expect(watchDir.startsWith(path.join(os.homedir(), ".react-grab", "watch") + path.sep)).toBe(
      true,
    );
    expect(watchDir.startsWith(projectDir + path.sep)).toBe(false);
  });

  it("is stable for the same project and distinct across projects", () => {
    const firstDir = resolveWatchDir(undefined);
    expect(resolveWatchDir(undefined)).toBe(firstDir);
    const otherProjectDir = path.join(projectDir, "nested");
    fs.mkdirSync(otherProjectDir);
    process.chdir(otherProjectDir);
    expect(resolveWatchDir(undefined)).not.toBe(firstDir);
  });

  it("resolves an explicit --dir against the cwd", () => {
    expect(resolveWatchDir("custom")).toBe(path.join(projectDir, "custom"));
  });
});
