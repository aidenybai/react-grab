import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

vi.mock("node:child_process", () => ({
  execFile: vi.fn(),
}));

import { execFile } from "node:child_process";
import { readClipboardLinux } from "../src/utils/read-clipboard-linux.js";
import { enoentError, stubExecFile, stubExecFilePerCall } from "./helpers/mock-exec-file.js";

const mockExecFile = vi.mocked(execFile);

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.WAYLAND_DISPLAY;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("readClipboardLinux", () => {
  it("uses xclip when not in Wayland", async () => {
    stubExecFile(mockExecFile, { stdout: "clipboard-data" });

    const result = await readClipboardLinux();
    expect(result.payload).toBe("clipboard-data");

    const [binary, args] = mockExecFile.mock.calls[0];
    expect(binary).toBe("xclip");
    expect(args).toContain("application/x-react-grab");
  });

  it("uses wl-paste in Wayland sessions", async () => {
    process.env.WAYLAND_DISPLAY = "wayland-0";
    stubExecFile(mockExecFile, { stdout: "payload-from-wayland" });

    const result = await readClipboardLinux();
    expect(result.payload).toBe("payload-from-wayland");

    const [binary, args] = mockExecFile.mock.calls[0];
    expect(binary).toBe("wl-paste");
    expect(args).toContain("application/x-react-grab");
  });

  it("falls back from missing wl-paste to xclip", async () => {
    process.env.WAYLAND_DISPLAY = "wayland-0";
    stubExecFilePerCall(mockExecFile, [{ error: enoentError() }, { stdout: "from-xclip" }]);

    const result = await readClipboardLinux();
    expect(result.payload).toBe("from-xclip");
    expect(mockExecFile.mock.calls[0][0]).toBe("wl-paste");
    expect(mockExecFile.mock.calls[1][0]).toBe("xclip");
  });

  it("returns install hint when xclip is missing", async () => {
    stubExecFile(mockExecFile, { error: enoentError() });

    const result = await readClipboardLinux();
    expect(result.payload).toBeNull();
    expect(result.hint).toContain("xclip");
  });

  it("returns null payload when stdout is empty", async () => {
    stubExecFile(mockExecFile, { stdout: "" });

    const result = await readClipboardLinux();
    expect(result.payload).toBeNull();
  });
});
