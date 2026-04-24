import { describe, expect, it } from "vite-plus/test";
import {
  REACT_GRAB_CLIPBOARD_END_MARKER,
  REACT_GRAB_CLIPBOARD_START_MARKER,
} from "./constants.js";
import { parseClipboardContext } from "./server.js";

describe("parseClipboardContext", () => {
  it("should parse a React Grab clipboard envelope", () => {
    const clipboardText = [
      "<button>Save</button>",
      "",
      REACT_GRAB_CLIPBOARD_START_MARKER,
      JSON.stringify({
        content: ["<button>Save</button>\n  in SaveButton"],
        prompt: "Make this primary",
      }),
      REACT_GRAB_CLIPBOARD_END_MARKER,
    ].join("\n");

    expect(parseClipboardContext(clipboardText)).toEqual({
      content: ["<button>Save</button>\n  in SaveButton"],
      prompt: "Make this primary",
    });
  });

  it("should parse React Grab metadata from the clipboard envelope", () => {
    const clipboardText = [
      REACT_GRAB_CLIPBOARD_START_MARKER,
      JSON.stringify({
        content: "copied content",
        entries: [
          {
            content: "<button>Save</button>",
            commentText: "Use a filled variant",
          },
        ],
      }),
      REACT_GRAB_CLIPBOARD_END_MARKER,
    ].join("\n");

    expect(parseClipboardContext(clipboardText)).toEqual({
      content: ["<button>Save</button>"],
      prompt: "Use a filled variant",
    });
  });

  it("should ignore unrelated clipboard text", () => {
    expect(parseClipboardContext("plain clipboard text")).toBe(null);
  });
});
