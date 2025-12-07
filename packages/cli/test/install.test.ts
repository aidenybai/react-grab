import { describe, expect, it } from "vitest";
import { getPackagesToInstall } from "../src/utils/install.js";

describe("getPackagesToInstall", () => {
  it("should return only react-grab when no agent and includeReactGrab is true", () => {
    const packages = getPackagesToInstall("none", true);

    expect(packages).toEqual(["react-grab"]);
  });

  it("should return react-grab and agent package", () => {
    const packages = getPackagesToInstall("cursor", true);

    expect(packages).toEqual(["react-grab", "@react-grab/cursor"]);
  });

  it("should return only agent package when includeReactGrab is false", () => {
    const packages = getPackagesToInstall("claude-code", false);

    expect(packages).toEqual(["@react-grab/claude-code"]);
  });

  it("should return empty array when no agent and includeReactGrab is false", () => {
    const packages = getPackagesToInstall("none", false);

    expect(packages).toEqual([]);
  });

  it("should handle all agent types", () => {
    const agents = ["claude-code", "cursor", "opencode"] as const;

    for (const agent of agents) {
      const packages = getPackagesToInstall(agent, false);
      expect(packages).toEqual([`@react-grab/${agent}`]);
    }
  });
});
