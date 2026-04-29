import { describe, expect, it } from "vite-plus/test";
import { formatPayload } from "../src/utils/format-payload.js";
import type { ReactGrabPayload } from "../src/utils/parse-react-grab-payload.js";

const buildPayload = (overrides: Partial<ReactGrabPayload> = {}): ReactGrabPayload => ({
  version: "0.1.32",
  content: "<button>Click me</button>",
  entries: [
    {
      tagName: "button",
      componentName: "Button",
      content: "<button>Click me</button>",
      commentText: "Make this larger",
    },
  ],
  timestamp: 1700000000000,
  ...overrides,
});

describe("formatPayload", () => {
  it("returns formatted prompt and content for a single-entry payload", () => {
    const text = formatPayload(
      buildPayload({
        entries: [
          {
            tagName: "button",
            componentName: "Button",
            content: "<button>Click me</button>",
            commentText: "Refactor this",
          },
        ],
      }),
    );
    expect(text).toContain("Prompt: Refactor this");
    expect(text).toContain("Elements (1):");
    expect(text).toContain("<button>Click me</button>");
  });

  it("omits the prompt section when no entries carry commentText", () => {
    const payload = buildPayload();
    payload.entries[0].commentText = undefined;
    const text = formatPayload(payload);
    expect(text.startsWith("Elements (1):")).toBe(true);
  });

  it("deduplicates the prompt across entries and excludes it from the elements section", () => {
    const sharedPrompt = "Fix all the buttons";
    const canonicalContent = `${sharedPrompt}\n\n[1]\n<button>One</button>\n\n[2]\n<button>Two</button>\n\n[3]\n<button>Three</button>`;
    const text = formatPayload({
      version: "0.1.32",
      content: canonicalContent,
      entries: [
        { tagName: "button", content: "<button>One</button>", commentText: sharedPrompt },
        { tagName: "button", content: "<button>Two</button>", commentText: sharedPrompt },
        { tagName: "button", content: "<button>Three</button>", commentText: sharedPrompt },
      ],
      timestamp: Date.now(),
    });

    const promptOccurrences = text.split(sharedPrompt).length - 1;
    expect(promptOccurrences).toBe(1);
    expect(text).toContain(`Prompt: ${sharedPrompt}`);
    expect(text).toContain("Elements (3):");
    expect(text).toContain("[1]");
    expect(text).toContain("[2]");
    expect(text).toContain("[3]");
  });

  it("preserves transformCopyContent output and snippet labels in the body", () => {
    const transformedBody =
      "<!-- copy-html -->\n[1]\n<button>One</button>\n\n[2]\n<button>Two</button>";
    const text = formatPayload({
      version: "0.1.32",
      content: `Style as primary\n\n${transformedBody}`,
      entries: [
        { tagName: "button", content: "<button>One</button>", commentText: "Style as primary" },
        { tagName: "button", content: "<button>Two</button>", commentText: "Style as primary" },
      ],
      timestamp: Date.now(),
    });
    expect(text).toContain("<!-- copy-html -->");
    expect(text).toContain(`Elements (2):\n${transformedBody}`);
  });

  it("does not strip element content that happens to start with the prompt text", () => {
    const text = formatPayload({
      version: "0.1.32",
      content: "Click me\n\n<button>Click me</button>",
      entries: [
        { tagName: "button", content: "<button>Click me</button>", commentText: undefined },
      ],
      timestamp: Date.now(),
    });
    expect(text).toBe("Elements (1):\nClick me\n\n<button>Click me</button>");
  });

  it("strips the prompt prefix even when the original prompt had surrounding whitespace", () => {
    const rawPrompt = "  Fix this button  ";
    const text = formatPayload({
      version: "0.1.32",
      content: `${rawPrompt}\n\n<button>Click me</button>`,
      entries: [
        { tagName: "button", content: "<button>Click me</button>", commentText: rawPrompt },
      ],
      timestamp: Date.now(),
    });

    expect(text).toBe("Prompt: Fix this button\n\nElements (1):\n<button>Click me</button>");
    const occurrences = text.split("Fix this button").length - 1;
    expect(occurrences).toBe(1);
  });

  it("preserves distinct prompts when entries carry different commentText values", () => {
    const text = formatPayload({
      version: "0.1.32",
      content: "<button>One</button>\n\n<button>Two</button>",
      entries: [
        { tagName: "button", content: "<button>One</button>", commentText: "Make it red" },
        { tagName: "button", content: "<button>Two</button>", commentText: "Make it blue" },
      ],
      timestamp: Date.now(),
    });
    expect(text).toContain("Prompt: Make it red\nMake it blue");
  });
});
