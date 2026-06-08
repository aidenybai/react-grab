import { describe, expect, it } from "vite-plus/test";
import { getInstallableSkillAgents } from "../src/utils/install-skill.js";

describe("getInstallableSkillAgents", () => {
  it("removes Windsurf from install targets", () => {
    expect(getInstallableSkillAgents(["claude-code", "windsurf", "cursor"])).toEqual([
      "claude-code",
      "cursor",
    ]);
  });
});
