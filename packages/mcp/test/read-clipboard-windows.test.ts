import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

vi.mock("node:child_process", () => ({
  execFile: vi.fn(),
}));

import { execFile } from "node:child_process";
import { readClipboardWindows } from "../src/utils/read-clipboard-windows.js";
import { enoentError, stubExecFile } from "./helpers/mock-exec-file.js";

const mockExecFile = vi.mocked(execFile);

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("readClipboardWindows", () => {
  it("invokes powershell.exe with -Sta and a base64 EncodedCommand", async () => {
    stubExecFile(mockExecFile, { stdout: "{}" });

    await readClipboardWindows();

    const [binary, args] = mockExecFile.mock.calls[0];
    expect(binary).toBe("powershell.exe");
    expect(args).toContain("-Sta");
    expect(args).toContain("-NoProfile");
    expect(args).toContain("-EncodedCommand");

    const encodedIndex = args.indexOf("-EncodedCommand") + 1;
    const decodedScript = Buffer.from(args[encodedIndex], "base64").toString("utf16le");
    expect(decodedScript).toContain("System.Windows.Forms");
    expect(decodedScript).toContain("application/x-react-grab");
  });

  it("returns ENOENT hint when powershell is missing", async () => {
    stubExecFile(mockExecFile, { error: enoentError() });

    const result = await readClipboardWindows();
    expect(result.payload).toBeNull();
    expect(result.hint).toContain("powershell");
  });
});
