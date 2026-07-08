import { describe, expect, it } from "vite-plus/test";
import { selectSrcsetCandidate } from "../src/utils/select-srcset-candidate";

describe("selectSrcsetCandidate", () => {
  it("returns null for an empty srcset", () => {
    expect(selectSrcsetCandidate("", 100, 1)).toBeNull();
  });

  it("picks the smallest density candidate at or above the pixel ratio", () => {
    const selected = selectSrcsetCandidate("small.png 1x, medium.png 2x, large.png 3x", 100, 2);
    expect(selected).toBe("medium.png");
  });

  it("falls back to the densest candidate when none is sufficient", () => {
    expect(selectSrcsetCandidate("small.png 1x, medium.png 2x", 100, 3)).toBe("medium.png");
  });

  it("converts width descriptors into densities against the layout width", () => {
    const selected = selectSrcsetCandidate("small.png 300w, large.png 900w", 150, 1);
    expect(selected).toBe("small.png");
  });

  it("treats descriptorless candidates as 1x", () => {
    expect(selectSrcsetCandidate("plain.png", 100, 1)).toBe("plain.png");
  });

  it("ignores malformed candidates", () => {
    expect(selectSrcsetCandidate("broken.png 0x, good.png 1x", 100, 1)).toBe("good.png");
  });
});
