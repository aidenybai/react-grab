import { describe, expect, it } from "vite-plus/test";
import { formatSourceSnippetBlock } from "../src/utils/format-source-snippet-block.js";

describe("formatSourceSnippetBlock", () => {
  it("renders the file location header with the highlight line", () => {
    const block = formatSourceSnippetBlock(
      {
        startLine: 10,
        endLine: 12,
        highlightLine: 11,
        lines: ["a", "b", "c"],
        isApproximate: false,
      },
      "components/foo.tsx",
    );
    expect(block.startsWith("// components/foo.tsx:11\n")).toBe(true);
  });

  it("marks approximate snippets so the agent doesn't blindly trust them", () => {
    const block = formatSourceSnippetBlock(
      {
        startLine: 10,
        endLine: 12,
        highlightLine: 11,
        lines: ["a", "b", "c"],
        isApproximate: true,
      },
      "components/foo.tsx",
    );
    expect(block).toContain("(approximate)");
  });

  it("highlights the resolved line with a `>` marker, others with two spaces", () => {
    const block = formatSourceSnippetBlock(
      {
        startLine: 4,
        endLine: 6,
        highlightLine: 5,
        lines: ["a", "b", "c"],
        isApproximate: false,
      },
      "f.tsx",
    );
    const lines = block.split("\n");
    expect(lines[1]).toBe("  4| a");
    expect(lines[2]).toBe("> 5| b");
    expect(lines[3]).toBe("  6| c");
  });

  it("right-pads line numbers to a consistent width across the whole window", () => {
    const block = formatSourceSnippetBlock(
      {
        startLine: 8,
        endLine: 12,
        highlightLine: 10,
        lines: ["a", "b", "c", "d", "e"],
        isApproximate: false,
      },
      "f.tsx",
    );
    const lines = block.split("\n").slice(1);
    expect(lines[0]).toBe("   8| a");
    expect(lines[2]).toBe("> 10| c");
    expect(lines[4]).toBe("  12| e");
  });
});
