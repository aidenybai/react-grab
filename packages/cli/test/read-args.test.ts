import { describe, expect, it } from "vite-plus/test";
import { parseGrabCount, parseWaitMs } from "../src/utils/read-args.js";

describe("parseWaitMs", () => {
  it("treats missing/empty as no wait", () => {
    expect(parseWaitMs(undefined)).toBe(0);
    expect(parseWaitMs("")).toBe(0);
    expect(parseWaitMs("   ")).toBe(0);
  });

  it("accepts a millisecond count", () => {
    expect(parseWaitMs("0")).toBe(0);
    expect(parseWaitMs("20000")).toBe(20000);
    expect(parseWaitMs(" 500 ")).toBe(500);
    expect(parseWaitMs("1e9")).toBe(1e9);
  });

  it("accepts infinite synonyms (including the JS spelling) case-insensitively", () => {
    for (const raw of ["infinite", "inf", "forever", "Infinity", "INFINITE", " forever "]) {
      expect(parseWaitMs(raw)).toBe(Number.POSITIVE_INFINITY);
    }
  });

  it("returns null for unparseable input instead of silently degrading to no-wait", () => {
    for (const raw of ["5s", "1m", "abc", "-5", "NaN", "1.2.3"]) {
      expect(parseWaitMs(raw)).toBe(null);
    }
  });
});

describe("parseGrabCount", () => {
  it("accepts non-negative integers", () => {
    expect(parseGrabCount("0")).toBe(0);
    expect(parseGrabCount("50")).toBe(50);
    expect(parseGrabCount(" 7 ")).toBe(7);
  });

  it("returns null for negative, fractional, or non-numeric input", () => {
    for (const raw of ["-1", "1.5", "abc", "", "Infinity"]) {
      expect(parseGrabCount(raw)).toBe(null);
    }
    expect(parseGrabCount(undefined)).toBe(null);
  });
});
