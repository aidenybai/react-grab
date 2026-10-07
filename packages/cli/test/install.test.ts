import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

vi.mock("tinyexec", () => ({
  x: vi.fn(),
}));

vi.mock("../src/utils/should-use-corepack.js", () => ({
  shouldUseCorepack: vi.fn(),
}));

import { x } from "tinyexec";
import { getPackagesToInstall, installPackages } from "../src/utils/install.js";
import { shouldUseCorepack } from "../src/utils/should-use-corepack.js";

const mockExecute = vi.mocked(x);
const mockShouldUseCorepack = vi.mocked(shouldUseCorepack);

beforeEach(() => {
  vi.clearAllMocks();
  mockShouldUseCorepack.mockResolvedValue(false);
});

describe("installPackages", () => {
  it("runs a pinned pnpm version through Corepack", async () => {
    mockShouldUseCorepack.mockResolvedValue(true);
    mockExecute.mockResolvedValue({
      exitCode: 0,
      stderr: "",
      stdout: "",
    });

    await installPackages(["react-grab"], {
      cwd: "/app",
      packageManager: "pnpm",
      silent: true,
    });

    expect(mockExecute).toHaveBeenCalledWith(
      "corepack",
      ["pnpm", "add", "-D", "--prod=false", "react-grab"],
      {
        nodeOptions: {
          stdio: "ignore",
          cwd: "/app",
          env: { ...process.env, REACT_GRAB_INIT: "1" },
        },
        throwOnError: true,
      },
    );
  });

  it("falls back to the package manager executable", async () => {
    mockExecute.mockResolvedValue({
      exitCode: 0,
      stderr: "",
      stdout: "",
    });

    await installPackages(["react-grab"], {
      cwd: "/app",
      packageManager: "pnpm",
      silent: true,
    });

    expect(mockExecute).toHaveBeenCalledWith(
      "pnpm",
      ["add", "-D", "--prod=false", "react-grab"],
      expect.any(Object),
    );
  });
});

describe("getPackagesToInstall", () => {
  it("should return react-grab when includeReactGrab is true", () => {
    const packages = getPackagesToInstall(true);

    expect(packages).toEqual(["react-grab"]);
  });

  it("should return empty array when includeReactGrab is false", () => {
    const packages = getPackagesToInstall(false);

    expect(packages).toEqual([]);
  });
});
