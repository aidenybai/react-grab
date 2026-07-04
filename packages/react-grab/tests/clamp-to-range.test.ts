import { describe, expect, it } from "vite-plus/test";
import { clampToRange } from "../src/utils/clamp-to-range.js";

describe("clampToRange", () => {
  it("returns the value unchanged when inside the range", () => {
    expect(clampToRange(5, 0, 10)).toBe(5);
  });

  it("clamps to the lower bound", () => {
    expect(clampToRange(-3, 0, 10)).toBe(0);
  });

  it("clamps to the upper bound", () => {
    expect(clampToRange(42, 0, 10)).toBe(10);
  });

  it("returns the bound when the value sits on it", () => {
    expect(clampToRange(0, 0, 10)).toBe(0);
    expect(clampToRange(10, 0, 10)).toBe(10);
  });

  it("supports negative ranges", () => {
    expect(clampToRange(-5, -10, -1)).toBe(-5);
    expect(clampToRange(0, -10, -1)).toBe(-1);
  });
});
