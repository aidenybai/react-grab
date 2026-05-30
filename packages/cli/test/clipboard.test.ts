import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vite-plus/test";
import {
  GRAB_MIME,
  detectLinuxTool,
  extractGrab,
  extractPrompt,
  isGrabText,
  parseChromiumPickle,
} from "../src/utils/clipboard.js";
import {
  canUseClipboard,
  encodeChromiumPickle,
  encodeGrabPickle,
  hasCommand,
  writeGrab,
  writeText,
} from "./clipboard-helpers.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLI_BIN = path.join(HERE, "..", "bin", "cli.js");

// Real bytes captured from Chromium copying application/x-react-grab on macOS
// (see fixtures/golden-pickle.bin). Proves the parser matches actual browser
// output, independent of our own encoder.
const GOLDEN_PICKLE = fs.readFileSync(path.join(HERE, "fixtures", "golden-pickle.bin"));

interface CapturedRecord {
  source: string;
  content: string;
  entries: { componentName?: string }[];
}

// Spawns `react-grab watch` (single-shot: exits on the first captured grab) and
// returns the records written to history.jsonl. For the "ignores" case nothing
// is captured, so the watcher never exits and is killed once the timeout lapses.
const collectGrabs = (
  extraArgs: string[],
  { timeoutMs = 6000 }: { timeoutMs?: number } = {},
): Promise<CapturedRecord[]> =>
  new Promise((resolve) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rg-test-"));
    const logPath = path.join(dir, "history.jsonl");
    const child = spawn(
      process.execPath,
      [CLI_BIN, "watch", "--dir", dir, "--interval", "120", "--replay-last", ...extraArgs],
      { stdio: "ignore" },
    );
    const readRecords = (): CapturedRecord[] => {
      try {
        return fs
          .readFileSync(logPath, "utf8")
          .split("\n")
          .filter(Boolean)
          .map((line) => JSON.parse(line) as CapturedRecord);
      } catch {
        return [];
      }
    };
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.kill();
      resolve(readRecords());
    };
    const timer = setTimeout(finish, timeoutMs);
    child.on("exit", finish);
  });

describe("parseChromiumPickle", () => {
  it("decodes a real Chromium web-custom-data pickle (golden)", () => {
    const formats = parseChromiumPickle(GOLDEN_PICKLE);
    const grab = formats[GRAB_MIME];
    expect(grab).toBeTruthy();
    const parsed = JSON.parse(grab);
    expect(parsed.version).toBe("0.1.0");
    expect(parsed.content.startsWith("GOLDEN_SAMPLE")).toBe(true);
    expect(parsed.entries[0].componentName).toBe("SaveButton");
    expect(parsed.timestamp).toBe(1780000000000);
  });

  it("round-trips through the encoder, including 4-byte alignment padding", () => {
    // An odd code-unit length ("odd") forces 2 bytes of padding after the value.
    const grabJson = JSON.stringify({ content: "odd", entries: [], timestamp: 1 });
    const formats = parseChromiumPickle(encodeGrabPickle(grabJson));
    expect(formats[GRAB_MIME]).toBe(grabJson);
  });

  it("decodes multiple format pairs", () => {
    const pickle = encodeChromiumPickle({ "text/plain": "hi", [GRAB_MIME]: "{}" });
    const formats = parseChromiumPickle(pickle);
    expect(formats["text/plain"]).toBe("hi");
    expect(formats[GRAB_MIME]).toBe("{}");
  });

  it("returns an empty map for short or malformed buffers", () => {
    expect(parseChromiumPickle(Buffer.alloc(0))).toEqual({});
    expect(parseChromiumPickle(Buffer.from([1, 2, 3]))).toEqual({});
  });
});

describe("extractGrab", () => {
  it("prefers an already-resolved grab string", () => {
    expect(extractGrab({ grab: '{"a":1}' })).toBe('{"a":1}');
  });

  it("parses a base64 pickle when no resolved grab is present", () => {
    const grabJson = JSON.stringify({ content: "x", entries: [], timestamp: 2 });
    const pickleBase64 = encodeGrabPickle(grabJson).toString("base64");
    expect(extractGrab({ pickleBase64 })).toBe(grabJson);
  });

  it("returns undefined when nothing is available", () => {
    expect(extractGrab({})).toBe(undefined);
  });
});

describe("extractPrompt", () => {
  it("returns the comment prepended above the element references (prompt mode)", () => {
    const record = {
      content: "Make this disabled until valid\n[<button>Submit</button> in Btn (at a.tsx:1:1)]",
      entries: [],
    };
    expect(extractPrompt(record)).toBe("Make this disabled until valid");
  });

  it("prefers structured entry commentText", () => {
    const record = {
      content: "[<a> in NavLink (at nav.tsx:8:2)]",
      entries: [{ componentName: "NavLink", commentText: "fix the aria-label" }],
    };
    expect(extractPrompt(record)).toBe("fix the aria-label");
  });

  it("returns undefined for a plain grab with no comment", () => {
    const record = { content: "[<button>Submit</button> in Btn (at a.tsx:1:1)]", entries: [] };
    expect(extractPrompt(record)).toBe(undefined);
  });

  it("does not throw on forged records (non-array entries, non-string content)", () => {
    expect(extractPrompt({ entries: "x", content: 5 })).toBe(undefined);
    expect(extractPrompt({ entries: [1, null], content: undefined })).toBe(undefined);
  });

  it("returns undefined for a whitespace-only prefix (no empty-string prompt)", () => {
    expect(extractPrompt({ content: "   \n[<a> in A (at a.tsx:1:1)]", entries: [] })).toBe(
      undefined,
    );
  });
});

describe("isGrabText", () => {
  it("matches a React Grab component-stack frame", () => {
    expect(isGrabText("in LoginForm (at src/auth/login.tsx:22:7)")).toBe(true);
  });

  it("matches a frame with parentheses in the path (Next.js route groups)", () => {
    expect(isGrabText("in LoginForm (at src/app/(auth)/login/page.tsx:22:7)")).toBe(true);
  });

  it("rejects ordinary copied text", () => {
    expect(isGrabText("just some copied text, not a grab")).toBe(false);
  });
});

describe(`clipboard round-trip via text fallback (${process.platform})`, () => {
  const runnable = canUseClipboard();

  it.skipIf(!runnable)("captures a grab from real clipboard text", async () => {
    const grabText =
      "<button>Save</button>\n\n// src/widgets/save-button.tsx:42\n  in SaveButton (at src/widgets/save-button.tsx:42:3)";
    if (!writeText(grabText)) return;
    const records = await collectGrabs(["--text-only"], { timeoutMs: 6000 });
    expect(records.length >= 1).toBe(true);
    expect(records[0].source).toBe("text");
    expect(records[0].content).toMatch(/in SaveButton/);
  });

  it.skipIf(!runnable)("ignores ordinary copied text", async () => {
    if (!writeText("hello world, just some copied text")) return;
    const records = await collectGrabs(["--text-only"], { timeoutMs: 2500 });
    expect(records.length).toBe(0);
  });
});

describe(`clipboard round-trip via custom format (${process.platform})`, () => {
  const grabJson = JSON.stringify({
    version: "0.1.0",
    content: '<a href="#">Link</a>\n\n// src/nav.tsx:8\n  in NavLink (at src/nav.tsx:8:2)',
    entries: [{ tagName: "a", componentName: "NavLink", content: '<a href="#">Link</a>' }],
    timestamp: Date.now(),
  });

  if (process.platform === "linux") {
    const runnable = canUseClipboard();
    // xclip serves one X11 target per invocation, so the full reader (which
    // needs a text target too) can't see a custom-only selection. Exercise the
    // Linux custom fetch + shared parser directly instead.
    it.skipIf(!runnable)("reads chromium/x-web-custom-data and parses the grab", () => {
      if (!writeGrab({ text: "", grabJson })) return;
      const tool = detectLinuxTool();
      expect(tool?.readCustom).toBeTruthy();
      const buffer = tool?.readCustom?.();
      expect(buffer).toBeTruthy();
      expect(parseChromiumPickle(buffer)[GRAB_MIME]).toBe(grabJson);
    });
    return;
  }

  const customSupported =
    process.platform === "win32"
      ? canUseClipboard()
      : process.platform === "darwin" && hasCommand("swift") && hasCommand("swiftc");

  it.skipIf(!customSupported)(
    "captures a structured grab end-to-end",
    async () => {
      if (!writeGrab({ text: "plain text alongside", grabJson })) return;
      const records = await collectGrabs([], { timeoutMs: 20000 });
      expect(records.length >= 1).toBe(true);
      expect(records[0].source).toBe("custom");
      expect(records[0].entries[0].componentName).toBe("NavLink");
    },
    25000,
  );
});
