import { describe, expect, it } from "vite-plus/test";
import { escapeHtmlAttribute } from "../src/utils/escape-html-attribute.js";

describe("escapeHtmlAttribute", () => {
  it("encodes HTML delimiters and line-breaking whitespace", () => {
    expect(escapeHtmlAttribute('Save "draft" & close\nnext\tstep')).toBe(
      "Save &quot;draft&quot; &amp; close&#10;next&#9;step",
    );
  });
});
