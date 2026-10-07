import { describe, expect, it } from "vite-plus/test";
import { truncateEscapedHtml } from "../src/utils/truncate-escaped-html.js";

describe("truncateEscapedHtml", () => {
  it("keeps escaped output within the encoded length budget", () => {
    const truncatedHtml = truncateEscapedHtml("&amp;".repeat(10), 12);

    expect(truncatedHtml.length).toBeLessThanOrEqual(12);
    expect(truncatedHtml).toBe("&amp;...");
  });

  it("preserves escaped output that fits the budget", () => {
    expect(truncateEscapedHtml("&amp;", 12)).toBe("&amp;");
  });
});
