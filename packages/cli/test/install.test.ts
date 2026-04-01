import { describe, expect, it } from "vitest";
import { getPackagesToInstall } from "../src/utils/install.js";

describe("getPackagesToInstall", () => {
  it("should return react-grab when includeReactGrab is true", () => {
    const packages = getPackagesToInstall(true);

    expect(packages).toEqual(["react-grab"]);
  });

  it("should return empty array when includeReactGrab is false", () => {
    const packages = getPackagesToInstall(false);

    expect(packages).toEqual([]);
  });
});
