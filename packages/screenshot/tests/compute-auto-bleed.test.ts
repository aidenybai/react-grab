import { describe, expect, it } from "vite-plus/test";
import { computeAutoBleed } from "../src/utils/compute-auto-bleed";

describe("computeAutoBleed", () => {
  it("returns 0 when nothing bleeds", () => {
    expect(computeAutoBleed({})).toBe(0);
    expect(computeAutoBleed({ "box-shadow": "none", filter: "none" })).toBe(0);
  });

  it("covers a box-shadow's blur, spread, and worst-side offset", () => {
    const bleed = computeAutoBleed({
      "box-shadow": "rgba(20, 40, 60, 0.55) 0px 12px 40px 8px",
    });
    expect(bleed).toBe(80);
  });

  it("takes the maximum across comma-separated shadows and ignores inset ones", () => {
    const bleed = computeAutoBleed({
      "box-shadow":
        "rgb(0, 0, 0) 0px 0px 10px 0px inset, rgba(0, 0, 0, 0.4) 0px 4px 8px 2px, rgba(0, 0, 0, 0.2) 0px 0px 30px 0px",
    });
    expect(bleed).toBe(45);
  });

  it("covers outlines including a positive offset", () => {
    const bleed = computeAutoBleed({
      "outline-style": "solid",
      "outline-width": "4px",
      "outline-offset": "6px",
    });
    expect(bleed).toBe(10);
  });

  it("ignores an outline with a negative offset beyond its width", () => {
    const bleed = computeAutoBleed({
      "outline-style": "solid",
      "outline-width": "3px",
      "outline-offset": "-6px",
    });
    expect(bleed).toBe(3);
  });

  it("covers filter blur at three sigma and drop-shadow extents", () => {
    expect(computeAutoBleed({ filter: "blur(10px)" })).toBe(30);
    expect(
      computeAutoBleed({ filter: "drop-shadow(rgba(0, 0, 0, 0.5) 6px -8px 10px)" }),
    ).toBe(23);
  });

  it("takes the maximum across sources", () => {
    const bleed = computeAutoBleed({
      "box-shadow": "rgb(0, 0, 0) 0px 0px 4px 0px",
      "outline-style": "solid",
      "outline-width": "2px",
      filter: "blur(12px)",
    });
    expect(bleed).toBe(36);
  });
});
