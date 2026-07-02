import { describe, expect, it } from "vite-plus/test";
import { formatColorLabel } from "../src/utils/format-color-label.js";
import { EDIT_TRANSPARENT_COLOR_LABEL } from "../src/constants.js";

describe("formatColorLabel", () => {
  it("uppercases a regular hex color", () => {
    expect(formatColorLabel("#ff8800")).toBe("#FF8800");
  });

  it("labels the fully transparent hex as 'transparent' (case-insensitive)", () => {
    expect(formatColorLabel("#00000000")).toBe(EDIT_TRANSPARENT_COLOR_LABEL);
    expect(formatColorLabel("#00000000".toUpperCase())).toBe(EDIT_TRANSPARENT_COLOR_LABEL);
  });

  it("does not treat opaque black as transparent", () => {
    expect(formatColorLabel("#000000")).toBe("#000000");
  });
});
