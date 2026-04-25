import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

vi.mock("node:child_process", () => ({
  execFile: vi.fn(),
}));

import { execFile } from "node:child_process";
import { readClipboardWindows } from "../src/utils/read-clipboard-windows.js";
import { enoentError, stubExecFile } from "./helpers/mock-exec-file.js";

const mockExecFile = vi.mocked(execFile);

const getDecodedPowerShellScript = (): string => {
  const firstCall = mockExecFile.mock.calls[0];
  if (!firstCall) throw new Error("expected execFile to have been called");
  const args = firstCall[1];
  if (!Array.isArray(args)) throw new Error("expected execFile args array");
  const encodedIndex = args.indexOf("-EncodedCommand") + 1;
  const encoded = args[encodedIndex];
  if (typeof encoded !== "string") throw new Error("expected -EncodedCommand value");
  return Buffer.from(encoded, "base64").toString("utf16le");
};

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

    const firstCall = mockExecFile.mock.calls[0];
    expect(firstCall).toBeDefined();
    const [binary, args] = firstCall ?? [];
    expect(binary).toBe("powershell.exe");
    expect(args).toContain("-Sta");
    expect(args).toContain("-NoProfile");
    expect(args).toContain("-EncodedCommand");

    const decodedScript = getDecodedPowerShellScript();
    expect(decodedScript).toContain("System.Windows.Forms");
    expect(decodedScript).toContain("application/x-react-grab");
  });

  it("decodes clipboard payloads delivered as a System.IO.Stream", async () => {
    stubExecFile(mockExecFile, { stdout: "{}" });

    await readClipboardWindows();

    const decodedScript = getDecodedPowerShellScript();

    // Browsers store web-custom-format data as a UTF-8 byte stream that
    // surfaces in .NET as System.IO.MemoryStream, so the script must read
    // the stream rather than fall back to $data.ToString().
    expect(decodedScript).toContain("[System.IO.Stream]");
    expect(decodedScript).toContain("CopyTo");
    expect(decodedScript).toContain("ToArray()");
    expect(decodedScript).toContain("[System.Text.Encoding]::UTF8.GetString");
  });

  it("returns ENOENT hint when powershell is missing", async () => {
    stubExecFile(mockExecFile, { error: enoentError() });

    const result = await readClipboardWindows();
    expect(result.payload).toBeNull();
    expect(result.hint).toContain("powershell");
  });
});
