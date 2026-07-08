import { describe, expect, it } from "vite-plus/test";
import { extractFontFaceBlocks } from "../src/utils/extract-font-face-blocks";

describe("extractFontFaceBlocks", () => {
  it("returns no blocks for css without font faces", () => {
    expect(extractFontFaceBlocks("body{color:red}")).toEqual([]);
  });

  it("extracts every font-face block with its descriptors", () => {
    const blocks = extractFontFaceBlocks(
      `@font-face { font-family: "Alpha"; src: url(alpha.woff2); unicode-range: U+0000-00FF; }
       .rule { color: blue; }
       @font-face { font-family: "Beta"; font-weight: 700; src: url("beta.woff2") format("woff2"); }`,
    );
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toContain('font-family: "Alpha"');
    expect(blocks[0]).toContain("unicode-range: U+0000-00FF");
    expect(blocks[1]).toContain("font-weight: 700");
    expect(blocks[1]).toMatch(/^@font-face\{/);
  });

  it("ignores font-face mentions inside comments", () => {
    const blocks = extractFontFaceBlocks(
      "/* @font-face { font-family: Ghost; } */ @font-face { font-family: Real; src: url(a.woff2); }",
    );
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toContain("Real");
  });

  it("tolerates a truncated trailing block", () => {
    expect(extractFontFaceBlocks("@font-face { font-family: Cut")).toEqual([]);
  });
});
