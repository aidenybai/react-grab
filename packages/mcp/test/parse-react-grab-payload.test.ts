import { describe, expect, it } from "vite-plus/test";
import { parseReactGrabPayload } from "../src/utils/parse-react-grab-payload.js";

describe("parseReactGrabPayload", () => {
  it("returns null for null input", () => {
    expect(parseReactGrabPayload(null)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseReactGrabPayload("")).toBeNull();
  });

  it("returns null for malformed JSON", () => {
    expect(parseReactGrabPayload("{not json")).toBeNull();
  });

  it("returns null when required fields are missing", () => {
    expect(parseReactGrabPayload(JSON.stringify({ version: "1.0.0" }))).toBeNull();
  });

  it("parses a well-formed payload", () => {
    const payload = {
      version: "0.1.32",
      content: "<button>Hello</button>",
      entries: [
        {
          tagName: "button",
          componentName: "Button",
          content: "<button>Hello</button>",
          commentText: "Make this larger",
        },
      ],
      timestamp: 1700000000000,
    };

    expect(parseReactGrabPayload(JSON.stringify(payload))).toEqual(payload);
  });

  it("accepts entries with only required fields", () => {
    const payload = {
      version: "0.1.32",
      content: "<div />",
      entries: [{ content: "<div />" }],
      timestamp: 1700000000000,
    };

    expect(parseReactGrabPayload(JSON.stringify(payload))?.entries[0].tagName).toBeUndefined();
  });
});
