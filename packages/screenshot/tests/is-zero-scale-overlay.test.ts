import { describe, expect, it } from "vite-plus/test";
import { isZeroScaleOverlay } from "../src/utils/is-zero-scale-overlay";

describe("isZeroScaleOverlay", () => {
  it("matches zero-scale transforms on absolute and fixed elements", () => {
    expect(
      isZeroScaleOverlay({ transform: "matrix(0, 0, 0, 0, 0, 0)", position: "absolute" }),
    ).toBe(true);
    expect(isZeroScaleOverlay({ transform: "matrix(0, 0, 0, 1, 0, 0)", position: "fixed" })).toBe(
      true,
    );
    expect(isZeroScaleOverlay({ transform: "scale(0)", position: "absolute" })).toBe(true);
  });

  it("does not match in-flow elements", () => {
    expect(isZeroScaleOverlay({ transform: "scale(0)", position: "static" })).toBe(false);
    expect(isZeroScaleOverlay({ transform: "scale(0)", position: "relative" })).toBe(false);
    expect(isZeroScaleOverlay({ transform: "scale(0)" })).toBe(false);
  });

  it("does not match non-zero transforms", () => {
    expect(
      isZeroScaleOverlay({ transform: "matrix(1, 0, 0, 1, 10, 10)", position: "absolute" }),
    ).toBe(false);
    expect(isZeroScaleOverlay({ position: "absolute" })).toBe(false);
    expect(isZeroScaleOverlay({ transform: "none", position: "fixed" })).toBe(false);
  });
});
