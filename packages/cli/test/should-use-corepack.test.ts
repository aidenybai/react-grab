import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

vi.mock("package-manager-detector/detect", () => ({
  detect: vi.fn(),
}));

vi.mock("tinyexec", () => ({
  x: vi.fn(),
}));

import { detect } from "package-manager-detector/detect";
import { x } from "tinyexec";
import { shouldUseCorepack } from "../src/utils/should-use-corepack.js";

const mockDetect = vi.mocked(detect);
const mockExecute = vi.mocked(x);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("shouldUseCorepack", () => {
  it("uses Corepack for a pinned pnpm version", async () => {
    mockDetect.mockResolvedValue({
      agent: "pnpm",
      name: "pnpm",
      version: "10.24.0",
    });
    mockExecute.mockResolvedValue({
      exitCode: 0,
      stderr: "",
      stdout: "0.34.0",
    });

    await expect(shouldUseCorepack("pnpm", "/app")).resolves.toBe(true);
    expect(mockDetect).toHaveBeenCalledWith({
      cwd: "/app",
      strategies: ["packageManager-field"],
    });
    expect(mockExecute).toHaveBeenCalledWith("corepack", ["--version"], {
      nodeOptions: { cwd: "/app", stdio: "ignore" },
    });
  });

  it("uses the package manager directly when no version is pinned", async () => {
    mockDetect.mockResolvedValue({
      agent: "pnpm",
      name: "pnpm",
    });

    await expect(shouldUseCorepack("pnpm", "/app")).resolves.toBe(false);
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it("does not use Corepack for unsupported package managers", async () => {
    await expect(shouldUseCorepack("bun", "/app")).resolves.toBe(false);
    expect(mockDetect).not.toHaveBeenCalled();
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it("falls back when Corepack is unavailable", async () => {
    mockDetect.mockResolvedValue({
      agent: "yarn@berry",
      name: "yarn",
      version: "4.9.1",
    });
    mockExecute.mockRejectedValue(new Error("spawn corepack ENOENT"));

    await expect(shouldUseCorepack("yarn", "/app")).resolves.toBe(false);
  });
});
