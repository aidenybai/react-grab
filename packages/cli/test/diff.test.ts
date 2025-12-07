import { describe, expect, it } from "vitest";
import { generateDiff, formatDiff } from "../src/utils/diff.js";

describe("generateDiff", () => {
  it("should detect added lines", () => {
    const original = "line1\nline2";
    const updated = "line1\nline2\nline3";

    const diff = generateDiff(original, updated);

    expect(diff).toContainEqual({ type: "unchanged", content: "line1", lineNumber: 1 });
    expect(diff).toContainEqual({ type: "unchanged", content: "line2", lineNumber: 2 });
    expect(diff).toContainEqual({ type: "added", content: "line3", lineNumber: 3 });
  });

  it("should detect removed lines", () => {
    const original = "line1\nline2\nline3";
    const updated = "line1\nline3";

    const diff = generateDiff(original, updated);

    expect(diff.some((line) => line.type === "removed" && line.content === "line2")).toBe(true);
  });

  it("should handle identical content", () => {
    const content = "line1\nline2";

    const diff = generateDiff(content, content);

    expect(diff.every((line) => line.type === "unchanged")).toBe(true);
  });

  it("should handle empty strings", () => {
    const diff = generateDiff("", "line1");

    expect(diff).toContainEqual({ type: "added", content: "line1", lineNumber: 1 });
  });

  it("should handle complex changes", () => {
    const original = `import React from "react";

function App() {
  return <div>Hello</div>;
}`;

    const updated = `import React from "react";
import Script from "next/script";

function App() {
  return <div>Hello World</div>;
}`;

    const diff = generateDiff(original, updated);

    expect(diff.some((line) => line.type === "added" && line.content.includes("next/script"))).toBe(true);
    expect(diff.some((line) => line.type === "removed" && line.content.includes("Hello</div>"))).toBe(true);
    expect(diff.some((line) => line.type === "added" && line.content.includes("Hello World"))).toBe(true);
  });
});

describe("formatDiff", () => {
  it("should format added lines in green", () => {
    const diff = [
      { type: "unchanged" as const, content: "line1", lineNumber: 1 },
      { type: "added" as const, content: "line2", lineNumber: 2 },
    ];

    const formatted = formatDiff(diff);

    expect(formatted).toContain("+ line2");
    expect(formatted).toContain("\x1b[32m");
  });

  it("should format removed lines in red", () => {
    const diff = [
      { type: "unchanged" as const, content: "line1", lineNumber: 1 },
      { type: "removed" as const, content: "line2" },
    ];

    const formatted = formatDiff(diff);

    expect(formatted).toContain("- line2");
    expect(formatted).toContain("\x1b[31m");
  });

  it("should show no changes message when diff is empty", () => {
    const diff = [
      { type: "unchanged" as const, content: "line1", lineNumber: 1 },
      { type: "unchanged" as const, content: "line2", lineNumber: 2 },
    ];

    const formatted = formatDiff(diff);

    expect(formatted).toContain("No changes");
  });

  it("should limit context lines around changes", () => {
    const diff = [
      { type: "unchanged" as const, content: "line1", lineNumber: 1 },
      { type: "unchanged" as const, content: "line2", lineNumber: 2 },
      { type: "unchanged" as const, content: "line3", lineNumber: 3 },
      { type: "added" as const, content: "new line 1", lineNumber: 4 },
      { type: "unchanged" as const, content: "line4", lineNumber: 5 },
      { type: "unchanged" as const, content: "line5", lineNumber: 6 },
      { type: "unchanged" as const, content: "line6", lineNumber: 7 },
      { type: "unchanged" as const, content: "line7", lineNumber: 8 },
      { type: "unchanged" as const, content: "line8", lineNumber: 9 },
      { type: "unchanged" as const, content: "line9", lineNumber: 10 },
      { type: "added" as const, content: "new line 2", lineNumber: 11 },
      { type: "unchanged" as const, content: "line10", lineNumber: 12 },
    ];

    const formatted = formatDiff(diff, 2);

    expect(formatted).toContain("...");
    expect(formatted).toContain("new line 1");
    expect(formatted).toContain("new line 2");
  });
});
