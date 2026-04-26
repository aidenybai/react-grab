import { describe, expect, it } from "vite-plus/test";
import { formatResultForStdout } from "../src/commands/watch.js";
import type { ReactGrabPayload } from "../src/utils/parse-react-grab-payload.js";

const samplePayload: ReactGrabPayload = {
  version: "0.1.32",
  content: "Refactor\n\n<button>Hi</button>",
  entries: [
    {
      tagName: "button",
      componentName: "Button",
      content: "<button>Hi</button>",
      commentText: "Refactor",
    },
  ],
  timestamp: 1700000000000,
};

describe("formatResultForStdout", () => {
  it("emits formatted text by default", () => {
    const text = formatResultForStdout(samplePayload, false);
    expect(text).toContain("Prompt: Refactor");
    expect(text).toContain("Elements (1):");
    expect(text).toContain("<button>Hi</button>");
    expect(text).not.toMatch(/^\{"version":/);
  });

  it("emits raw JSON when asJson is true", () => {
    const text = formatResultForStdout(samplePayload, true);
    const parsed: ReactGrabPayload = JSON.parse(text);
    expect(parsed.version).toBe("0.1.32");
    expect(parsed.entries).toHaveLength(1);
    expect(parsed.entries[0].componentName).toBe("Button");
    expect(parsed.timestamp).toBe(1700000000000);
  });

  it("treats undefined asJson the same as false", () => {
    const text = formatResultForStdout(samplePayload, undefined);
    expect(text).toContain("Elements (1):");
  });
});
