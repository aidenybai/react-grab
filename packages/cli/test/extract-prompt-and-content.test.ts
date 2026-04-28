import { describe, expect, it } from "vite-plus/test";
import { extractPromptAndContent } from "../src/utils/extract-prompt-and-content.js";
import type { ReactGrabPayload } from "../src/utils/parse-react-grab-payload.js";

const buildPayload = (overrides: Partial<ReactGrabPayload> = {}): ReactGrabPayload => ({
  version: "0.1.32",
  content: "<button>Hi</button>",
  entries: [{ content: "<button>Hi</button>" }],
  timestamp: 0,
  ...overrides,
});

describe("extractPromptAndContent", () => {
  it("returns content only when no entry has a commentText", () => {
    const payload = buildPayload({ content: "<button />" });
    expect(extractPromptAndContent(payload)).toEqual({ content: "<button />" });
  });

  it("dedupes the prompt across entries (the producer copies it onto every entry)", () => {
    const payload = buildPayload({
      content: "Refactor\n\n[1] <button>A</button>\n[2] <button>B</button>",
      entries: [
        { content: "<button>A</button>", commentText: "Refactor" },
        { content: "<button>B</button>", commentText: "Refactor" },
      ],
    });
    expect(extractPromptAndContent(payload)).toEqual({
      prompt: "Refactor",
      content: "[1] <button>A</button>\n[2] <button>B</button>",
    });
  });

  it("strips the leading prompt prefix from content using the raw (untrimmed) prompt", () => {
    const rawPrompt = "  click me  ";
    const payload = buildPayload({
      content: `${rawPrompt}\n\n<button>Hi</button>`,
      entries: [{ content: "<button>Hi</button>", commentText: rawPrompt }],
    });
    expect(extractPromptAndContent(payload)).toEqual({
      prompt: "click me",
      content: "<button>Hi</button>",
    });
  });

  it("does not strip when content does not actually start with the raw prompt + '\\n\\n'", () => {
    const payload = buildPayload({
      content: "<button>click me</button>",
      entries: [{ content: "<button>click me</button>", commentText: "click me" }],
    });
    expect(extractPromptAndContent(payload)).toEqual({
      prompt: "click me",
      content: "<button>click me</button>",
    });
  });

  it("ignores empty / whitespace-only commentTexts", () => {
    const payload = buildPayload({
      entries: [
        { content: "<a />", commentText: "" },
        { content: "<b />", commentText: "   " },
      ],
    });
    expect(extractPromptAndContent(payload)).toEqual({ content: "<button>Hi</button>" });
  });

  it("joins multiple distinct prompts with newlines", () => {
    const payload = buildPayload({
      entries: [
        { content: "<a />", commentText: "rename" },
        { content: "<b />", commentText: "rename" },
        { content: "<c />", commentText: "fix spacing" },
      ],
    });
    const { prompt } = extractPromptAndContent(payload);
    expect(prompt).toBe("rename\nfix spacing");
  });
});
