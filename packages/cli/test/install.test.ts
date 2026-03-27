import { describe, expect, it } from "vitest";
import {
  getPackagesToInstall,
} from "../src/utils/install.js";

describe("getPackagesToInstall", () => {
  it("should return only react-grab when no agent and includeReactGrab is true", () => {
    const packages = getPackagesToInstall("none", true);

    expect(packages).toEqual(["react-grab"]);
  });

  it("should return only react-grab when agent is mcp (providers deprecated)", () => {
    const packages = getPackagesToInstall("mcp", true);

    expect(packages).toEqual(["react-grab"]);
  });

  it("should return empty array when no agent and includeReactGrab is false", () => {
    const packages = getPackagesToInstall("none", false);

    expect(packages).toEqual([]);
  });

  it("should return empty array when agent is mcp and includeReactGrab is false", () => {
    const packages = getPackagesToInstall("mcp", false);

    expect(packages).toEqual([]);
  });
});
