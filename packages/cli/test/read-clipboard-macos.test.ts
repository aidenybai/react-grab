import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

vi.mock("node:child_process", () => ({
  execFile: vi.fn(),
}));

import { execFile } from "node:child_process";
import { readClipboardMacos } from "../src/utils/read-clipboard-macos.js";
import { getExecFileCall, getExecFileFlagValue, stubExecFile } from "./helpers/mock-exec-file.js";

const mockExecFile = vi.mocked(execFile);

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const PICKLE_SENTINEL = "__react_grab_chromium_pickle_b64__";

const buildChromiumPickleBase64 = (mime: string, data: string): string => {
  const mimeBytes = Buffer.byteLength(mime, "utf16le");
  const dataBytes = Buffer.byteLength(data, "utf16le");
  const alignedMime = (mimeBytes + 3) & ~3;
  const alignedData = (dataBytes + 3) & ~3;
  const payloadSize = 4 + 4 + alignedMime + 4 + alignedData;
  const buffer = Buffer.alloc(4 + payloadSize);
  buffer.writeUInt32LE(payloadSize, 0);
  buffer.writeUInt32LE(1, 4);
  let offset = 8;
  buffer.writeUInt32LE(mime.length, offset);
  offset += 4;
  Buffer.from(mime, "utf16le").copy(buffer, offset);
  offset += alignedMime;
  buffer.writeUInt32LE(data.length, offset);
  offset += 4;
  Buffer.from(data, "utf16le").copy(buffer, offset);
  return buffer.toString("base64");
};

describe("readClipboardMacos", () => {
  it("invokes osascript with a JXA script that reads the React Grab MIME type and Chromium fallbacks", async () => {
    stubExecFile(mockExecFile, { stdout: '{"hello":"world"}\n' });

    const result = await readClipboardMacos();
    expect(result.payload).toBe('{"hello":"world"}');

    const { binary, args } = getExecFileCall(mockExecFile);
    expect(binary).toBe("osascript");
    expect(args).toContain("-l");
    expect(args).toContain("JavaScript");

    const jxaScript = getExecFileFlagValue(mockExecFile, "-e");
    expect(jxaScript).toContain("NSPasteboard");
    expect(jxaScript).toContain("application/x-react-grab");
    expect(jxaScript).toContain("org.chromium.web-custom-data");
    expect(jxaScript).toContain("org.webkit.web-custom-data");
  });

  it("decodes a Chromium web-custom-data pickle when JXA returns the sentinel-prefixed base64", async () => {
    const json = '{"version":"0.1.32","content":"<button/>","entries":[],"timestamp":1}';
    const pickle = buildChromiumPickleBase64("application/x-react-grab", json);
    stubExecFile(mockExecFile, { stdout: `${PICKLE_SENTINEL}${pickle}\n` });

    const result = await readClipboardMacos();
    expect(result.payload).toBe(json);
  });

  it("returns null when the Chromium pickle does not contain our MIME type", async () => {
    const pickle = buildChromiumPickleBase64("text/plain", "unrelated");
    stubExecFile(mockExecFile, { stdout: `${PICKLE_SENTINEL}${pickle}\n` });

    const result = await readClipboardMacos();
    expect(result.payload).toBeNull();
  });

  it("returns null when stdout is empty", async () => {
    stubExecFile(mockExecFile, { stdout: "" });

    const result = await readClipboardMacos();
    expect(result.payload).toBeNull();
  });

  it("returns null when osascript fails", async () => {
    stubExecFile(mockExecFile, { error: new Error("osascript boom") as NodeJS.ErrnoException });

    const result = await readClipboardMacos();
    expect(result.payload).toBeNull();
  });

  it("flags ENOENT (osascript missing) as unrecoverable with an actionable hint", async () => {
    const enoent = new Error("ENOENT") as NodeJS.ErrnoException;
    enoent.code = "ENOENT";
    stubExecFile(mockExecFile, { error: enoent });

    const result = await readClipboardMacos();
    expect(result.payload).toBeNull();
    expect(result.hint).toContain("osascript");
    expect(result.recoverable).toBe(false);
  });
});
