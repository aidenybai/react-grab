import { vi, describe, expect, it, beforeEach } from "vite-plus/test";

vi.mock("node:fs", () => ({
  statSync: vi.fn(),
  accessSync: vi.fn(),
  constants: { X_OK: 1 },
}));

vi.mock("agent-install/skill", () => ({
  detectInstalledSkillAgents: vi.fn(),
  getSkillAgentTypes: vi.fn(),
}));

import { statSync, accessSync } from "node:fs";
import { detectInstalledSkillAgents, getSkillAgentTypes } from "agent-install/skill";
import { detectAvailableAgents } from "../src/utils/detect-agents.js";

const mockStatSync = vi.mocked(statSync);
const mockAccessSync = vi.mocked(accessSync);
const mockDetectInstalled = vi.mocked(detectInstalledSkillAgents);
const mockGetTypes = vi.mocked(getSkillAgentTypes);

const toPosixPath = (path: unknown): string => `${path}`.replace(/\\/g, "/");

// `path.join` uses `\` on Windows; normalize so the POSIX binary paths match.
const binaryPresent = (binaryPath: string) => {
  mockStatSync.mockImplementation((path) => {
    if (toPosixPath(path) === binaryPath) return { isFile: () => true } as never;
    throw new Error("ENOENT");
  });
  mockAccessSync.mockImplementation((path) => {
    if (toPosixPath(path) !== binaryPath) throw new Error("EACCES");
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.PATH = "/usr/bin";
  mockGetTypes.mockReturnValue(["claude-code", "cursor", "codex", "universal"] as never);
});

describe("detectAvailableAgents", () => {
  it("detects an agent from a PATH binary even with no config dir", async () => {
    mockDetectInstalled.mockResolvedValue([]);
    binaryPresent("/usr/bin/claude");

    expect(await detectAvailableAgents()).toEqual(["claude-code"]);
  });

  it("unions PATH-detected and filesystem-detected agents in canonical order", async () => {
    mockDetectInstalled.mockResolvedValue(["cursor"] as never);
    binaryPresent("/usr/bin/claude");

    expect(await detectAvailableAgents()).toEqual(["claude-code", "cursor"]);
  });

  it("filters out the synthetic universal agent", async () => {
    mockDetectInstalled.mockResolvedValue(["universal"] as never);
    mockStatSync.mockImplementation(() => {
      throw new Error("ENOENT");
    });

    expect(await detectAvailableAgents()).toEqual([]);
  });

  it("returns nothing when no agents are found anywhere", async () => {
    mockDetectInstalled.mockResolvedValue([]);
    mockStatSync.mockImplementation(() => {
      throw new Error("ENOENT");
    });

    expect(await detectAvailableAgents()).toEqual([]);
  });
});
