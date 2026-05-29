import { spawn } from "node:child_process";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  CHROMIUM_CUSTOM_FORMAT,
  GRAB_MIME,
  detectLinuxTool,
  extractGrab,
  extractPrompt,
  isGrabText,
  parseChromiumPickle,
} from "../../../skills/react-grab/scripts/watch.mjs";
import {
  canUseClipboard,
  encodeChromiumPickle,
  encodeGrabPickle,
  hasCommand,
  writeGrab,
  writeText,
} from "./clipboard-helpers.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WATCH_SCRIPT = path.join(HERE, "..", "..", "..", "skills", "react-grab", "scripts", "watch.mjs");

// Real bytes captured from Chromium copying application/x-react-grab on macOS
// (see fixtures/golden-pickle.bin). Proves the parser matches actual browser
// output, independent of our own encoder.
const GOLDEN_PICKLE = fs.readFileSync(path.join(HERE, "fixtures", "golden-pickle.bin"));

const collectGrabs = (extraArgs, { minRecords = 1, timeoutMs = 6000 } = {}) =>
  new Promise((resolve) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rg-test-"));
    const logPath = path.join(dir, "grabs.jsonl");
    const child = spawn(
      process.execPath,
      [WATCH_SCRIPT, "--dir", dir, "--interval", "120", "--replay-last", ...extraArgs],
      { stdio: "ignore" },
    );
    const startedAt = Date.now();
    const readRecords = () => {
      try {
        return fs
          .readFileSync(logPath, "utf8")
          .split("\n")
          .filter(Boolean)
          .map((line) => JSON.parse(line));
      } catch {
        return [];
      }
    };
    const poll = setInterval(() => {
      const records = readRecords();
      if (records.length >= minRecords || Date.now() - startedAt > timeoutMs) {
        clearInterval(poll);
        child.kill();
        resolve(records);
      }
    }, 100);
  });

describe("parseChromiumPickle", () => {
  it("decodes a real Chromium web-custom-data pickle (golden)", () => {
    const formats = parseChromiumPickle(GOLDEN_PICKLE);
    const grab = formats[GRAB_MIME];
    assert.ok(grab, "golden pickle should contain the React Grab MIME type");
    const parsed = JSON.parse(grab);
    assert.equal(parsed.version, "0.1.0");
    assert.ok(parsed.content.startsWith("GOLDEN_SAMPLE"));
    assert.equal(parsed.entries[0].componentName, "SaveButton");
    assert.equal(parsed.timestamp, 1780000000000);
  });

  it("round-trips through the encoder, including 4-byte alignment padding", () => {
    // An odd code-unit length ("odd") forces 2 bytes of padding after the value.
    const grabJson = JSON.stringify({ content: "odd", entries: [], timestamp: 1 });
    const formats = parseChromiumPickle(encodeGrabPickle(grabJson));
    assert.equal(formats[GRAB_MIME], grabJson);
  });

  it("decodes multiple format pairs", () => {
    const pickle = encodeChromiumPickle({ "text/plain": "hi", [GRAB_MIME]: "{}" });
    const formats = parseChromiumPickle(pickle);
    assert.equal(formats["text/plain"], "hi");
    assert.equal(formats[GRAB_MIME], "{}");
  });

  it("returns an empty map for short or malformed buffers", () => {
    assert.deepEqual(parseChromiumPickle(Buffer.alloc(0)), {});
    assert.deepEqual(parseChromiumPickle(Buffer.from([1, 2, 3])), {});
  });
});

describe("extractGrab", () => {
  it("prefers an already-resolved grab string", () => {
    assert.equal(extractGrab({ grab: '{"a":1}' }), '{"a":1}');
  });

  it("parses a base64 pickle when no resolved grab is present", () => {
    const grabJson = JSON.stringify({ content: "x", entries: [], timestamp: 2 });
    const pickleBase64 = encodeGrabPickle(grabJson).toString("base64");
    assert.equal(extractGrab({ pickleBase64 }), grabJson);
  });

  it("returns undefined when nothing is available", () => {
    assert.equal(extractGrab({}), undefined);
  });
});

describe("extractPrompt", () => {
  it("returns the comment prepended above the element references (prompt mode)", () => {
    const record = {
      content: "Make this disabled until valid\n[<button>Submit</button> in Btn (at a.tsx:1:1)]",
      entries: [],
    };
    assert.equal(extractPrompt(record), "Make this disabled until valid");
  });

  it("prefers structured entry commentText", () => {
    const record = {
      content: "[<a> in NavLink (at nav.tsx:8:2)]",
      entries: [{ componentName: "NavLink", commentText: "fix the aria-label" }],
    };
    assert.equal(extractPrompt(record), "fix the aria-label");
  });

  it("returns undefined for a plain grab with no comment", () => {
    const record = { content: "[<button>Submit</button> in Btn (at a.tsx:1:1)]", entries: [] };
    assert.equal(extractPrompt(record), undefined);
  });

  it("does not throw on forged records (non-array entries, non-string content)", () => {
    assert.equal(extractPrompt({ entries: "x", content: 5 }), undefined);
    assert.equal(extractPrompt({ entries: [1, null], content: undefined }), undefined);
  });

  it("returns undefined for a whitespace-only prefix (no empty-string prompt)", () => {
    assert.equal(
      extractPrompt({ content: "   \n[<a> in A (at a.tsx:1:1)]", entries: [] }),
      undefined,
    );
  });
});

describe("isGrabText", () => {
  it("matches a React Grab component-stack frame", () => {
    assert.equal(isGrabText("in LoginForm (at src/auth/login.tsx:22:7)"), true);
  });

  it("matches a frame with parentheses in the path (Next.js route groups)", () => {
    assert.equal(isGrabText("in LoginForm (at src/app/(auth)/login/page.tsx:22:7)"), true);
  });

  it("rejects ordinary copied text", () => {
    assert.equal(isGrabText("just some copied text, not a grab"), false);
  });
});

describe(`clipboard round-trip via text fallback (${process.platform})`, () => {
  const skip = canUseClipboard() ? false : "no clipboard tool available on this host";

  it("captures a grab from real clipboard text", { skip }, async (t) => {
    const grabText =
      "<button>Save</button>\n\n// src/widgets/save-button.tsx:42\n  in SaveButton (at src/widgets/save-button.tsx:42:3)";
    if (!writeText(grabText)) {
      t.skip("clipboard write unavailable on this host");
      return;
    }
    const records = await collectGrabs(["--text-only"], { minRecords: 1, timeoutMs: 6000 });
    assert.equal(records.length >= 1, true, "expected at least one captured grab");
    assert.equal(records[0].source, "text");
    assert.match(records[0].content, /in SaveButton/);
  });

  it("ignores ordinary copied text", { skip }, async (t) => {
    if (!writeText("hello world, just some copied text")) {
      t.skip("clipboard write unavailable on this host");
      return;
    }
    const records = await collectGrabs(["--text-only"], {
      minRecords: Number.POSITIVE_INFINITY,
      timeoutMs: 2500,
    });
    assert.equal(records.length, 0, "non-grab text must not be captured");
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
    const skip = canUseClipboard() ? false : "no DISPLAY/xclip available";
    // xclip serves one X11 target per invocation, so the full reader (which
    // needs a text target too) can't see a custom-only selection. Exercise the
    // Linux custom fetch + shared parser directly instead.
    it("reads chromium/x-web-custom-data and parses the grab", { skip }, (t) => {
      if (!writeGrab({ text: "", grabJson })) {
        t.skip("clipboard write unavailable on this host");
        return;
      }
      const tool = detectLinuxTool();
      assert.ok(tool?.readCustom, "expected a Linux tool with custom-format support");
      const buffer = tool.readCustom();
      assert.ok(buffer, `expected bytes for ${CHROMIUM_CUSTOM_FORMAT}`);
      assert.equal(parseChromiumPickle(buffer)[GRAB_MIME], grabJson);
    });
    return;
  }

  const customSupported =
    process.platform === "win32"
      ? canUseClipboard()
      : process.platform === "darwin" && hasCommand("swift") && hasCommand("swiftc");
  const skip = customSupported ? false : "native custom-format tooling unavailable";

  it("captures a structured grab end-to-end", { skip }, async (t) => {
    if (!writeGrab({ text: "plain text alongside", grabJson })) {
      t.skip("clipboard write unavailable on this host");
      return;
    }
    const records = await collectGrabs([], { minRecords: 1, timeoutMs: 20000 });
    assert.equal(records.length >= 1, true, "expected at least one captured grab");
    assert.equal(records[0].source, "custom");
    assert.equal(records[0].entries[0].componentName, "NavLink");
  });
});
