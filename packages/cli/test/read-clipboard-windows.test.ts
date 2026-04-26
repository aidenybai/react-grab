import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

vi.mock("node:child_process", () => ({
  execFile: vi.fn(),
}));

import { execFile } from "node:child_process";
import { readClipboardWindows } from "../src/utils/read-clipboard-windows.js";
import {
  enoentError,
  getExecFileCall,
  getExecFileFlagValue,
  stubExecFile,
} from "./helpers/mock-exec-file.js";

const mockExecFile = vi.mocked(execFile);

const getDecodedPowerShellScript = (): string => {
  const encoded = getExecFileFlagValue(mockExecFile, "-EncodedCommand");
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

    const { binary, args } = getExecFileCall(mockExecFile);
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
    expect(decodedScript).toContain("[System.IO.Stream]");
    expect(decodedScript).toContain("CopyTo");
    expect(decodedScript).toContain("ToArray()");
    expect(decodedScript).toContain("[System.Text.Encoding]::UTF8.GetString");
  });

  it("configures BOM-less UTF-8 output to keep JSON.parse happy", async () => {
    stubExecFile(mockExecFile, { stdout: "{}" });

    await readClipboardWindows();

    const decodedScript = getDecodedPowerShellScript();
    expect(decodedScript).toContain("New-Object System.Text.UTF8Encoding $false");
    expect(decodedScript).not.toMatch(
      /\[Console\]::OutputEncoding\s*=\s*\[System\.Text\.Encoding\]::UTF8\b/,
    );
  });

  it("returns ENOENT hint when powershell is missing and marks the outcome unrecoverable", async () => {
    stubExecFile(mockExecFile, { error: enoentError() });

    const result = await readClipboardWindows();
    expect(result.payload).toBeNull();
    expect(result.hint).toContain("powershell");
    expect(result.recoverable).toBe(false);
  });
});
