import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

vi.mock("node:fs", () => ({
  readFileSync: vi.fn(),
}));

import { readFileSync } from "node:fs";
import { detectClipboardEnv } from "../src/utils/detect-clipboard-env.js";

const mockReadFileSync = vi.mocked(readFileSync);
const originalEnv = { ...process.env };
const originalPlatform = process.platform;

const SSH_ENV_KEYS = ["SSH_CLIENT", "SSH_TTY", "SSH_CONNECTION", "WSL_DISTRO_NAME"] as const;

const setPlatform = (platform: NodeJS.Platform): void => {
  Object.defineProperty(process, "platform", { value: platform, configurable: true });
};

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of SSH_ENV_KEYS) delete process.env[key];
  mockReadFileSync.mockImplementation(() => {
    throw new Error("not mocked");
  });
});

afterEach(() => {
  process.env = { ...originalEnv };
  setPlatform(originalPlatform);
});

describe("detectClipboardEnv", () => {
  it("detects SSH from SSH_CLIENT", () => {
    process.env.SSH_CLIENT = "1.2.3.4 5678 22";
    setPlatform("linux");
    expect(detectClipboardEnv()).toBe("ssh");
  });

  it("detects SSH from SSH_TTY", () => {
    process.env.SSH_TTY = "/dev/pts/0";
    setPlatform("darwin");
    expect(detectClipboardEnv()).toBe("ssh");
  });

  it("detects WSL from WSL_DISTRO_NAME", () => {
    process.env.WSL_DISTRO_NAME = "Ubuntu";
    setPlatform("linux");
    expect(detectClipboardEnv()).toBe("wsl");
  });

  it("detects WSL from /proc/version containing microsoft", () => {
    setPlatform("linux");
    mockReadFileSync.mockReturnValue("Linux version 5.15.0-microsoft-standard");
    expect(detectClipboardEnv()).toBe("wsl");
  });

  it("returns macos on darwin", () => {
    setPlatform("darwin");
    expect(detectClipboardEnv()).toBe("macos");
  });

  it("returns windows on win32", () => {
    setPlatform("win32");
    expect(detectClipboardEnv()).toBe("windows");
  });

  it("returns linux on plain linux", () => {
    setPlatform("linux");
    mockReadFileSync.mockReturnValue("Linux version 6.0.0-generic");
    expect(detectClipboardEnv()).toBe("linux");
  });

  it("prefers ssh over wsl when both are set", () => {
    process.env.SSH_CLIENT = "1.2.3.4 5678 22";
    process.env.WSL_DISTRO_NAME = "Ubuntu";
    setPlatform("linux");
    expect(detectClipboardEnv()).toBe("ssh");
  });
});
