import { describe, expect, it } from "vite-plus/test";
import { findClosestWord, isTypoMatch } from "../src/utils/fuzzy-match.js";

describe("isTypoMatch", () => {
  it("accepts single edits on medium and long words", () => {
    expect(isTypoMatch("paddng", "padding")).toBe(true);
    expect(isTypoMatch("incrase", "increase")).toBe(true);
    expect(isTypoMatch("opacty", "opacity")).toBe(true);
  });

  it("requires exact matches for short words", () => {
    expect(isTypoMatch("gap", "tap")).toBe(false);
    expect(isTypoMatch("bold", "cold")).toBe(false);
  });

  it("rejects tokens that are too short or too far off", () => {
    expect(isTypoMatch("pad", "padding")).toBe(false);
    expect(isTypoMatch("paddxyz", "padding")).toBe(false);
  });
});

describe("findClosestWord", () => {
  const candidates = ["bigger", "smaller", "increase", "padding"];

  it("returns the closest candidate within budget", () => {
    expect(findClosestWord("biger", candidates)).toBe("bigger");
    expect(findClosestWord("smaler", candidates)).toBe("smaller");
    expect(findClosestWord("incrase", candidates)).toBe("increase");
  });

  it("returns null when nothing is close enough", () => {
    expect(findClosestWord("color", candidates)).toBeNull();
    expect(findClosestWord("xyz", candidates)).toBeNull();
  });
});
