import { vi, describe, expect, it, beforeEach } from "vite-plus/test";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  rmSync: vi.fn(),
}));

vi.mock("agent-install/skill", () => ({
  add: vi.fn(),
  getCanonicalSkillsDir: vi.fn(),
  getSkillAgentConfig: vi.fn(),
  getSkillAgentDir: vi.fn(),
  isUniversalSkillAgent: vi.fn(),
}));

vi.mock("../src/utils/detect-agents.js", () => ({
  detectAvailableAgents: vi.fn(),
}));

import { existsSync, rmSync } from "node:fs";
import {
  add,
  getCanonicalSkillsDir,
  getSkillAgentDir,
  isUniversalSkillAgent,
} from "agent-install/skill";
import { detectAvailableAgents } from "../src/utils/detect-agents.js";
import { installSkill, removeSkill } from "../src/utils/install-skill.js";

const mockExistsSync = vi.mocked(existsSync);
const mockRmSync = vi.mocked(rmSync);
const mockAdd = vi.mocked(add);
const mockGetCanonicalSkillsDir = vi.mocked(getCanonicalSkillsDir);
const mockGetSkillAgentDir = vi.mocked(getSkillAgentDir);
const mockIsUniversalSkillAgent = vi.mocked(isUniversalSkillAgent);
const mockDetectAvailableAgents = vi.mocked(detectAvailableAgents);

beforeEach(() => {
  vi.clearAllMocks();
  mockIsUniversalSkillAgent.mockReturnValue(false);
  mockGetSkillAgentDir.mockImplementation((agent, options) => `${options.cwd}/.${agent}`);
  mockGetCanonicalSkillsDir.mockImplementation((_global, cwd) => `${cwd}/.agents/skills`);
  mockAdd.mockResolvedValue({ installed: [], failed: [] } as never);
});

describe("installSkill", () => {
  it("installs to detected agents by default in copy mode", async () => {
    mockDetectAvailableAgents.mockResolvedValue(["claude-code", "cursor"] as never);

    await installSkill({ cwd: "/app" });

    expect(mockDetectAvailableAgents).toHaveBeenCalledTimes(1);
    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        source: expect.stringContaining("skills/react-grab"),
        agents: ["claude-code", "cursor"],
        global: false,
        cwd: "/app",
        mode: "copy",
      }),
    );
  });

  it("uses explicit agents without running detection", async () => {
    await installSkill({ agents: ["codex"] as never, cwd: "/app", global: true });

    expect(mockDetectAvailableAgents).not.toHaveBeenCalled();
    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({ agents: ["codex"], global: true, cwd: "/app", mode: "copy" }),
    );
  });
});

describe("removeSkill", () => {
  it("removes skill directories that exist and returns the removed agents", async () => {
    mockDetectAvailableAgents.mockResolvedValue(["claude-code", "cursor"] as never);
    mockExistsSync.mockImplementation((path) => `${path}`.includes(".claude-code"));

    const removed = await removeSkill({ cwd: "/app" });

    expect(removed).toEqual(["claude-code"]);
    expect(mockRmSync).toHaveBeenCalledTimes(1);
    expect(mockRmSync).toHaveBeenCalledWith("/app/.claude-code/react-grab", {
      recursive: true,
      force: true,
    });
  });

  it("returns an empty array and removes nothing when no skill is installed", async () => {
    mockDetectAvailableAgents.mockResolvedValue(["claude-code"] as never);
    mockExistsSync.mockReturnValue(false);

    const removed = await removeSkill({ cwd: "/app" });

    expect(removed).toEqual([]);
    expect(mockRmSync).not.toHaveBeenCalled();
  });

  it("resolves universal agents to the canonical skills directory", async () => {
    mockDetectAvailableAgents.mockResolvedValue(["universal"] as never);
    mockIsUniversalSkillAgent.mockReturnValue(true);
    mockExistsSync.mockReturnValue(true);

    const removed = await removeSkill({ cwd: "/app", global: true });

    expect(removed).toEqual(["universal"]);
    expect(mockGetCanonicalSkillsDir).toHaveBeenCalledWith(true, "/app");
    expect(mockRmSync).toHaveBeenCalledWith("/app/.agents/skills/react-grab", {
      recursive: true,
      force: true,
    });
  });
});
