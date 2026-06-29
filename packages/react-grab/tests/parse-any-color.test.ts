import { describe, expect, it } from "vite-plus/test";
import { EDIT_TRANSPARENT_COLOR_HEX } from "../src/constants.js";
import { parseAnyColor } from "../src/utils/parse-any-color.js";

// These cases stay on the pure, canvas-free paths (hex normalization, the
// `transparent` keyword, and the hand-rolled oklch() converter). In node there
// is no <canvas>, so any input that would fall through to the canvas resolves
// to null — which lets us assert that fall-through too.
describe("parseAnyColor", () => {
  it("returns null for blank input", () => {
    expect(parseAnyColor("")).toBe(null);
    expect(parseAnyColor("   ")).toBe(null);
  });

  it("maps the transparent keyword to the transparent hex (case-insensitive)", () => {
    expect(parseAnyColor("transparent")).toBe(EDIT_TRANSPARENT_COLOR_HEX);
    expect(parseAnyColor("TRANSPARENT")).toBe(EDIT_TRANSPARENT_COLOR_HEX);
  });

  it("expands and normalizes hex, with or without a leading #", () => {
    expect(parseAnyColor("#abc")).toBe("#aabbcc");
    expect(parseAnyColor("#abcd")).toBe("#aabbccdd");
    expect(parseAnyColor("abcdef")).toBe("#abcdef");
    expect(parseAnyColor("#AABBCC")).toBe("#AABBCC");
  });

  it("converts opaque oklch() to a 6-digit hex", () => {
    expect(parseAnyColor("oklch(0.7 0.15 30)")).toMatch(/^#[0-9a-f]{6}$/i);
    expect(parseAnyColor("oklch(70% 50% 30)")).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("converts oklch() with alpha to an 8-digit hex", () => {
    expect(parseAnyColor("oklch(0.7 0.15 30 / 0.5)")).toMatch(/^#[0-9a-f]{8}$/i);
  });

  it("accepts every oklch hue unit", () => {
    expect(parseAnyColor("oklch(0.7 0.15 0.25turn)")).toMatch(/^#[0-9a-f]{6}$/i);
    expect(parseAnyColor("oklch(0.7 0.15 200grad)")).toMatch(/^#[0-9a-f]{6}$/i);
    expect(parseAnyColor("oklch(0.7 0.15 3.14rad)")).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("returns null for unparseable input when no canvas is available", () => {
    expect(parseAnyColor("not-a-color")).toBe(null);
    expect(parseAnyColor("oklch(garbage)")).toBe(null);
  });
});
