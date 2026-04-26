import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import {
  readLastSelectedAgents,
  writeLastSelectedAgents,
} from "../src/utils/last-selected-agents.js";

let tempDir: string;
const originalXdg = process.env.XDG_STATE_HOME;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "last-selected-test-"));
  process.env.XDG_STATE_HOME = tempDir;
});

afterEach(() => {
  if (originalXdg === undefined) delete process.env.XDG_STATE_HOME;
  else process.env.XDG_STATE_HOME = originalXdg;
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe("readLastSelectedAgents", () => {
  it("returns [] when the state file does not exist", () => {
    expect(readLastSelectedAgents()).toEqual([]);
  });

  it("returns [] when the state file is invalid JSON", () => {
    const stateDir = path.join(tempDir, "react-grab");
    fs.mkdirSync(stateDir, { recursive: true });
    fs.writeFileSync(path.join(stateDir, "last-selected-agents.json"), "{not json");
    expect(readLastSelectedAgents()).toEqual([]);
  });

  it("returns [] when the state file has an invalid shape", () => {
    const stateDir = path.join(tempDir, "react-grab");
    fs.mkdirSync(stateDir, { recursive: true });
    fs.writeFileSync(
      path.join(stateDir, "last-selected-agents.json"),
      JSON.stringify({ agents: [1, 2, 3] }),
    );
    expect(readLastSelectedAgents()).toEqual([]);
  });

  it("returns the persisted agent list", () => {
    writeLastSelectedAgents(["Cursor", "Claude Code"]);
    expect(readLastSelectedAgents()).toEqual(["Cursor", "Claude Code"]);
  });
});

describe("writeLastSelectedAgents", () => {
  it("creates the state file under XDG_STATE_HOME/react-grab/", () => {
    writeLastSelectedAgents(["Cursor"]);
    const expectedPath = path.join(tempDir, "react-grab", "last-selected-agents.json");
    expect(fs.existsSync(expectedPath)).toBe(true);
    const content = JSON.parse(fs.readFileSync(expectedPath, "utf8"));
    expect(content).toEqual({ agents: ["Cursor"] });
  });

  it("overwrites previous selection", () => {
    writeLastSelectedAgents(["Cursor"]);
    writeLastSelectedAgents(["Claude Code", "Codex"]);
    expect(readLastSelectedAgents()).toEqual(["Claude Code", "Codex"]);
  });

  it("never throws when the state directory cannot be written", () => {
    // Pointing at /dev/null forces mkdir to fail (file, not directory).
    // The function should swallow the error silently rather than throw,
    // since state persistence is best-effort.
    if (process.platform === "win32") return;
    process.env.XDG_STATE_HOME = path.join("/dev/null", "child");
    expect(() => writeLastSelectedAgents(["Cursor"])).not.toThrow();
  });
});
