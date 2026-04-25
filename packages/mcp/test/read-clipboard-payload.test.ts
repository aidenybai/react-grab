import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

vi.mock("../src/utils/detect-clipboard-env.js", () => ({
  detectClipboardEnv: vi.fn(),
}));

vi.mock("../src/utils/read-clipboard-macos.js", () => ({
  readClipboardMacos: vi.fn(),
}));

vi.mock("../src/utils/read-clipboard-linux.js", () => ({
  readClipboardLinux: vi.fn(),
}));

vi.mock("../src/utils/read-clipboard-windows.js", () => ({
  readClipboardWindows: vi.fn(),
}));

vi.mock("../src/utils/read-clipboard-wsl.js", () => ({
  readClipboardWsl: vi.fn(),
}));

import { detectClipboardEnv } from "../src/utils/detect-clipboard-env.js";
import { readClipboardMacos } from "../src/utils/read-clipboard-macos.js";
import { readClipboardLinux } from "../src/utils/read-clipboard-linux.js";
import { readClipboardWindows } from "../src/utils/read-clipboard-windows.js";
import { readClipboardWsl } from "../src/utils/read-clipboard-wsl.js";
import { readClipboardPayload } from "../src/utils/read-clipboard-payload.js";

const mockDetectClipboardEnv = vi.mocked(detectClipboardEnv);
const mockReadClipboardMacos = vi.mocked(readClipboardMacos);
const mockReadClipboardLinux = vi.mocked(readClipboardLinux);
const mockReadClipboardWindows = vi.mocked(readClipboardWindows);
const mockReadClipboardWsl = vi.mocked(readClipboardWsl);

const validPayloadJson = JSON.stringify({
  version: "0.1.32",
  content: "<button />",
  entries: [{ content: "<button />" }],
  timestamp: 1700000000000,
});

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("readClipboardPayload", () => {
  it("dispatches to the macos reader on darwin", async () => {
    mockDetectClipboardEnv.mockReturnValue("macos");
    mockReadClipboardMacos.mockResolvedValue({ payload: validPayloadJson });

    const result = await readClipboardPayload();
    expect(mockReadClipboardMacos).toHaveBeenCalledOnce();
    expect(result.env).toBe("macos");
    expect(result.payload?.version).toBe("0.1.32");
  });

  it("dispatches to the linux reader on linux", async () => {
    mockDetectClipboardEnv.mockReturnValue("linux");
    mockReadClipboardLinux.mockResolvedValue({ payload: validPayloadJson });

    const result = await readClipboardPayload();
    expect(mockReadClipboardLinux).toHaveBeenCalledOnce();
    expect(result.env).toBe("linux");
  });

  it("dispatches to the windows reader on win32", async () => {
    mockDetectClipboardEnv.mockReturnValue("windows");
    mockReadClipboardWindows.mockResolvedValue({ payload: validPayloadJson });

    await readClipboardPayload();
    expect(mockReadClipboardWindows).toHaveBeenCalledOnce();
  });

  it("dispatches to the wsl reader inside WSL", async () => {
    mockDetectClipboardEnv.mockReturnValue("wsl");
    mockReadClipboardWsl.mockResolvedValue({ payload: validPayloadJson });

    await readClipboardPayload();
    expect(mockReadClipboardWsl).toHaveBeenCalledOnce();
  });

  it("returns SSH guidance hint without invoking any reader", async () => {
    mockDetectClipboardEnv.mockReturnValue("ssh");

    const result = await readClipboardPayload();
    expect(result.env).toBe("ssh");
    expect(result.payload).toBeNull();
    expect(result.hint).toContain("SSH");
    expect(mockReadClipboardMacos).not.toHaveBeenCalled();
    expect(mockReadClipboardLinux).not.toHaveBeenCalled();
    expect(mockReadClipboardWindows).not.toHaveBeenCalled();
    expect(mockReadClipboardWsl).not.toHaveBeenCalled();
  });

  it("propagates platform hints when present", async () => {
    mockDetectClipboardEnv.mockReturnValue("linux");
    mockReadClipboardLinux.mockResolvedValue({
      payload: null,
      hint: "Install xclip",
    });

    const result = await readClipboardPayload();
    expect(result.payload).toBeNull();
    expect(result.hint).toBe("Install xclip");
  });

  it("returns null payload when raw text fails validation", async () => {
    mockDetectClipboardEnv.mockReturnValue("macos");
    mockReadClipboardMacos.mockResolvedValue({ payload: "not json" });

    const result = await readClipboardPayload();
    expect(result.payload).toBeNull();
  });
});
