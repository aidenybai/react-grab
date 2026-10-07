import { describe, expect, it } from "vite-plus/test";
import { escapeHtmlText } from "../src/utils/escape-html-text.js";

describe("escapeHtmlText", () => {
  it("encodes HTML structural characters without changing text-only quotes or whitespace", () => {
    expect(escapeHtmlText('Save "draft" & close\n<next>')).toBe(
      'Save "draft" &amp; close\n&lt;next&gt;',
    );
  });
});
