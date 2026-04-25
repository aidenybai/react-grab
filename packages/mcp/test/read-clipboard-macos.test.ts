import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

vi.mock("node:child_process", () => ({
  execFile: vi.fn(),
}));

import { execFile } from "node:child_process";
import { readClipboardMacos } from "../src/utils/read-clipboard-macos.js";
import { stubExecFile } from "./helpers/mock-exec-file.js";

const mockExecFile = vi.mocked(execFile);

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("readClipboardMacos", () => {
  it("invokes osascript with the JXA snippet and returns trimmed stdout", async () => {
    stubExecFile(mockExecFile, { stdout: '{"hello":"world"}\n' });

    const result = await readClipboardMacos();
    expect(result.payload).toBe('{"hello":"world"}');

    const [binary, args] = mockExecFile.mock.calls[0];
    expect(binary).toBe("osascript");
    expect(args).toContain("-l");
    expect(args).toContain("JavaScript");
    expect(args.find((arg) => arg.includes("application/x-react-grab"))).toBeDefined();
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
