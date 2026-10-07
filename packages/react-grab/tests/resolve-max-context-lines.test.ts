import { describe, expect, it } from "vite-plus/test";
import { resolveMaxContextLines } from "../src/utils/resolve-max-context-lines.js";
import { DEFAULT_MAX_CONTEXT_LINES } from "../src/constants.js";

describe("resolveMaxContextLines", () => {
  it("passes through valid non-negative integers", () => {
    expect(resolveMaxContextLines(0)).toBe(0);
    expect(resolveMaxContextLines(3)).toBe(3);
    expect(resolveMaxContextLines(20)).toBe(20);
  });

  it("falls back to the default for undefined or non-finite values", () => {
    expect(resolveMaxContextLines(undefined)).toBe(DEFAULT_MAX_CONTEXT_LINES);
    expect(resolveMaxContextLines(Number.NaN)).toBe(DEFAULT_MAX_CONTEXT_LINES);
    expect(resolveMaxContextLines(Number.POSITIVE_INFINITY)).toBe(DEFAULT_MAX_CONTEXT_LINES);
  });

  it("clamps negatives to zero and floors fractions", () => {
    expect(resolveMaxContextLines(-5)).toBe(0);
    expect(resolveMaxContextLines(3.9)).toBe(3);
  });
});
