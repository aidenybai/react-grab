import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

vi.mock("../src/utils/read-clipboard-windows.js", () => ({
  readClipboardViaWindowsPowerShell: vi.fn(),
}));

vi.mock("../src/utils/read-clipboard-linux.js", () => ({
  readClipboardLinux: vi.fn(),
}));

import { readClipboardViaWindowsPowerShell } from "../src/utils/read-clipboard-windows.js";
import { readClipboardLinux } from "../src/utils/read-clipboard-linux.js";
import { readClipboardWsl } from "../src/utils/read-clipboard-wsl.js";

const mockReadClipboardViaWindowsPowerShell = vi.mocked(readClipboardViaWindowsPowerShell);
const mockReadClipboardLinux = vi.mocked(readClipboardLinux);

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("readClipboardWsl", () => {
  it("returns the Windows host payload when interop succeeds and the value looks like JSON", async () => {
    mockReadClipboardViaWindowsPowerShell.mockResolvedValue({
      payload: '{"version":"x","content":"<a/>","entries":[],"timestamp":1}',
    });

    const result = await readClipboardWsl();
    expect(result.payload).toBe('{"version":"x","content":"<a/>","entries":[],"timestamp":1}');
    expect(mockReadClipboardLinux).not.toHaveBeenCalled();
  });

  it("falls through to WSLg when Windows host returns non-JSON garbage and WSLg has a real payload", async () => {
    mockReadClipboardViaWindowsPowerShell.mockResolvedValue({ payload: "not-json-trash" });
    mockReadClipboardLinux.mockResolvedValue({
      payload: '{"version":"y","content":"<b/>","entries":[],"timestamp":2}',
    });

    const result = await readClipboardWsl();
    expect(result.payload).toBe('{"version":"y","content":"<b/>","entries":[],"timestamp":2}');
    expect(mockReadClipboardLinux).toHaveBeenCalledOnce();
  });

  it("surfaces the host garbage when no channel has a JSON-shaped payload (parser will diagnose)", async () => {
    mockReadClipboardViaWindowsPowerShell.mockResolvedValue({ payload: "host-junk" });
    mockReadClipboardLinux.mockResolvedValue({ payload: null });

    const result = await readClipboardWsl();
    expect(result.payload).toBe("host-junk");
  });

  it("falls back to WSLg Linux clipboard when Windows host returns nothing", async () => {
    mockReadClipboardViaWindowsPowerShell.mockResolvedValue({ payload: null });
    mockReadClipboardLinux.mockResolvedValue({ payload: "from-wslg" });

    const result = await readClipboardWsl();
    expect(result.payload).toBe("from-wslg");
    expect(mockReadClipboardViaWindowsPowerShell).toHaveBeenCalledOnce();
    expect(mockReadClipboardLinux).toHaveBeenCalledOnce();
  });

  it("surfaces a WSL-specific hint when interop fails and WSLg is empty", async () => {
    mockReadClipboardViaWindowsPowerShell.mockResolvedValue({
      payload: null,
      hint: "Cannot launch powershell.exe.",
    });
    mockReadClipboardLinux.mockResolvedValue({ payload: null });

    const result = await readClipboardWsl();
    expect(result.payload).toBeNull();
    expect(result.hint).toContain("WSL");
    expect(result.hint).toContain("interop");
  });

  it("propagates the Linux install hint when Wayland tools are missing and host has no payload", async () => {
    mockReadClipboardViaWindowsPowerShell.mockResolvedValue({ payload: null });
    mockReadClipboardLinux.mockResolvedValue({
      payload: null,
      hint: "Install xclip or wl-clipboard.",
    });

    const result = await readClipboardWsl();
    expect(result.hint).toContain("xclip");
  });

  it("combines WSL interop and Linux install hints when both fallbacks have guidance, marks unrecoverable when both channels are", async () => {
    mockReadClipboardViaWindowsPowerShell.mockResolvedValue({
      payload: null,
      hint: "Cannot launch powershell.exe.",
      recoverable: false,
    });
    mockReadClipboardLinux.mockResolvedValue({
      payload: null,
      hint: "Install xclip or wl-clipboard.",
      recoverable: false,
    });

    const result = await readClipboardWsl();
    expect(result.payload).toBeNull();
    expect(result.hint).toContain("interop");
    expect(result.hint).toContain("xclip");
    expect(result.recoverable).toBe(false);
  });

  it("stays recoverable when only the Windows host channel is unrecoverable but WSLg can still produce", async () => {
    mockReadClipboardViaWindowsPowerShell.mockResolvedValue({
      payload: null,
      hint: "Cannot launch powershell.exe.",
      recoverable: false,
    });
    // WSLg is healthy (clipboard is just empty right now). recoverable
    // defaults to true (omitted).
    mockReadClipboardLinux.mockResolvedValue({
      payload: null,
    });

    const result = await readClipboardWsl();
    expect(result.payload).toBeNull();
    expect(result.recoverable).not.toBe(false);
  });
});
