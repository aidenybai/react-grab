import { describe, expect, it } from "vite-plus/test";
import { parseTimeoutSeconds } from "../src/utils/parse-timeout-seconds.js";

describe("parseTimeoutSeconds", () => {
  it("parses positive integers", () => {
    expect(parseTimeoutSeconds("60")).toBe(60);
    expect(parseTimeoutSeconds("0")).toBe(0);
    expect(parseTimeoutSeconds("600")).toBe(600);
  });

  it("parses positive decimals", () => {
    expect(parseTimeoutSeconds("1.5")).toBeCloseTo(1.5);
    expect(parseTimeoutSeconds("0.25")).toBeCloseTo(0.25);
  });

  it("trims surrounding whitespace", () => {
    expect(parseTimeoutSeconds("  30  ")).toBe(30);
  });

  it("rejects negative values", () => {
    expect(() => parseTimeoutSeconds("-1")).toThrow(/Invalid --timeout/);
    expect(() => parseTimeoutSeconds("-0.5")).toThrow(/Invalid --timeout/);
  });

  it("rejects non-numeric input", () => {
    expect(() => parseTimeoutSeconds("abc")).toThrow(/Invalid --timeout/);
    expect(() => parseTimeoutSeconds("")).toThrow(/Invalid --timeout/);
  });

  it("rejects partially-numeric input that parseFloat would silently accept", () => {
    expect(() => parseTimeoutSeconds("5abc")).toThrow(/Invalid --timeout/);
    expect(() => parseTimeoutSeconds("5e2")).toThrow(/Invalid --timeout/);
    expect(() => parseTimeoutSeconds("5.5.5")).toThrow(/Invalid --timeout/);
  });

  it("rejects Infinity and NaN literals", () => {
    expect(() => parseTimeoutSeconds("Infinity")).toThrow(/Invalid --timeout/);
    expect(() => parseTimeoutSeconds("NaN")).toThrow(/Invalid --timeout/);
  });

  it("rejects whitespace-only input", () => {
    expect(() => parseTimeoutSeconds("   ")).toThrow(/Invalid --timeout/);
  });

  it("includes the offending value in the error message", () => {
    expect(() => parseTimeoutSeconds("xyz")).toThrow(/"xyz"/);
  });
});
