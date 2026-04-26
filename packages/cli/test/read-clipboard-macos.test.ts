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

describe("readClipboardMacos", () => {
  it("invokes osascript with a JXA script that reads the React Grab MIME type", async () => {
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
});
