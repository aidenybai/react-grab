import { vi, describe, expect, it, beforeEach } from "vite-plus/test";
import type { ProjectInfo } from "../src/utils/detect.js";

vi.mock("../src/utils/detect.js", () => ({
  detectProject: vi.fn(),
  detectNextRouterType: vi.fn(() => "app"),
}));

vi.mock("../src/utils/install.js", () => ({
  installPackages: vi.fn(),
  getPackagesToInstall: vi.fn(() => ["react-grab"]),
}));

vi.mock("../src/utils/transform.js", () => ({
  previewTransform: vi.fn(),
  applyTransform: vi.fn(),
}));

import { detectNextRouterType, detectProject } from "../src/utils/detect.js";
import { installPackages } from "../src/utils/install.js";
import { applyTransform, previewTransform } from "../src/utils/transform.js";
import { installReactGrab, ReactGrabInstallError } from "../src/utils/install-react-grab.js";

const mockDetectProject = vi.mocked(detectProject);
const mockDetectNextRouterType = vi.mocked(detectNextRouterType);
const mockInstallPackages = vi.mocked(installPackages);
const mockPreviewTransform = vi.mocked(previewTransform);
const mockApplyTransform = vi.mocked(applyTransform);

const baseProject = {
  packageManager: "pnpm",
  framework: "vite",
  nextRouterType: "unknown",
  isMonorepo: false,
  projectRoot: "/app",
  hasReactGrab: false,
  isReactGrabConfigured: false,
  reactGrabVersion: null,
  unsupportedFramework: null,
} satisfies ProjectInfo;

const pendingTransform = {
  success: true,
  filePath: "/app/src/main.tsx",
  message: "Add React Grab",
  originalContent: "render()",
  newContent: 'import("react-grab");\n\nrender()',
};

beforeEach(() => {
  vi.clearAllMocks();
  mockApplyTransform.mockReturnValue({ success: true });
  mockDetectNextRouterType.mockReturnValue("app");
});

describe("installReactGrab", () => {
  it("installs the package and writes the entry file for a fresh project", async () => {
    mockDetectProject.mockResolvedValue({ ...baseProject });
    mockPreviewTransform.mockReturnValue(pendingTransform);

    const result = await installReactGrab({ cwd: "/app" });

    expect(mockInstallPackages).toHaveBeenCalledWith(["react-grab"], {
      cwd: "/app",
      packageManager: "pnpm",
    });
    expect(mockApplyTransform).toHaveBeenCalledTimes(1);
    expect(result.didInstallPackage).toBe(true);
    expect(result.didChangeFile).toBe(true);
    expect(result.framework).toBe("vite");
  });

  it("does not install the package when it is already present", async () => {
    mockDetectProject.mockResolvedValue({ ...baseProject, hasReactGrab: true });
    mockPreviewTransform.mockReturnValue(pendingTransform);

    const result = await installReactGrab({ cwd: "/app" });

    expect(mockInstallPackages).not.toHaveBeenCalled();
    expect(result.didInstallPackage).toBe(false);
    expect(result.didChangeFile).toBe(true);
  });

  it("never installs or writes during a dry run", async () => {
    mockDetectProject.mockResolvedValue({ ...baseProject });
    mockPreviewTransform.mockReturnValue(pendingTransform);

    const result = await installReactGrab({ cwd: "/app", dryRun: true });

    expect(mockInstallPackages).not.toHaveBeenCalled();
    expect(mockApplyTransform).not.toHaveBeenCalled();
    expect(result.dryRun).toBe(true);
    expect(result.didInstallPackage).toBe(false);
    expect(result.didChangeFile).toBe(false);
  });

  it("does not write when there are no pending changes", async () => {
    mockDetectProject.mockResolvedValue({ ...baseProject, isReactGrabConfigured: true });
    mockPreviewTransform.mockReturnValue({
      success: true,
      filePath: "/app/src/main.tsx",
      message: "React Grab is already configured",
      noChanges: true,
    });

    const result = await installReactGrab({ cwd: "/app" });

    expect(mockApplyTransform).not.toHaveBeenCalled();
    expect(result.alreadyConfigured).toBe(true);
    expect(result.didChangeFile).toBe(false);
  });

  it("honors framework and package manager overrides", async () => {
    mockDetectProject.mockResolvedValue({ ...baseProject, framework: "unknown" });
    mockPreviewTransform.mockReturnValue({
      success: true,
      filePath: "/app/app/layout.tsx",
      message: "Add React Grab",
      originalContent: "x",
      newContent: "y",
    });

    const result = await installReactGrab({
      cwd: "/app",
      framework: "next",
      nextRouterType: "app",
      packageManager: "npm",
    });

    expect(mockPreviewTransform).toHaveBeenCalledWith("/app", "next", "app", false);
    expect(mockInstallPackages).toHaveBeenCalledWith(["react-grab"], {
      cwd: "/app",
      packageManager: "npm",
    });
    expect(result.framework).toBe("next");
  });

  it("throws for unsupported frameworks", async () => {
    mockDetectProject.mockResolvedValue({ ...baseProject, unsupportedFramework: "remix" });

    await expect(installReactGrab({ cwd: "/app" })).rejects.toMatchObject({
      code: "unsupported-framework",
    });
    expect(mockInstallPackages).not.toHaveBeenCalled();
  });

  it("throws an unknown-framework error when no framework can be resolved", async () => {
    mockDetectProject.mockResolvedValue({ ...baseProject, framework: "unknown" });

    await expect(installReactGrab({ cwd: "/app" })).rejects.toMatchObject({
      code: "unknown-framework",
    });
    await expect(installReactGrab({ cwd: "/app" })).rejects.toBeInstanceOf(ReactGrabInstallError);
  });

  it("derives the Next.js router type when only the framework is overridden", async () => {
    mockDetectProject.mockResolvedValue({ ...baseProject, framework: "unknown" });
    mockPreviewTransform.mockReturnValue({
      success: true,
      filePath: "/app/app/layout.tsx",
      message: "Add React Grab",
      originalContent: "x",
      newContent: "y",
    });

    const result = await installReactGrab({ cwd: "/app", framework: "next" });

    expect(mockDetectNextRouterType).toHaveBeenCalledWith("/app");
    expect(mockPreviewTransform).toHaveBeenCalledWith("/app", "next", "app", false);
    expect(result.nextRouterType).toBe("app");
  });

  it("skips package installation when skipPackageInstall is set", async () => {
    mockDetectProject.mockResolvedValue({ ...baseProject });
    mockPreviewTransform.mockReturnValue(pendingTransform);

    const result = await installReactGrab({ cwd: "/app", skipPackageInstall: true });

    expect(mockInstallPackages).not.toHaveBeenCalled();
    expect(result.didInstallPackage).toBe(false);
    expect(result.didChangeFile).toBe(true);
  });

  it("does not write or throw on a failed transform when skipTransform is set", async () => {
    mockDetectProject.mockResolvedValue({ ...baseProject });
    mockPreviewTransform.mockReturnValue({
      success: false,
      filePath: "",
      message: "Could not find entry file",
    });

    const result = await installReactGrab({ cwd: "/app", skipTransform: true });

    expect(mockInstallPackages).toHaveBeenCalledTimes(1);
    expect(mockApplyTransform).not.toHaveBeenCalled();
    expect(result.didChangeFile).toBe(false);
  });

  it("pins cwd and packageManager over installPackageOptions and passes through extras", async () => {
    mockDetectProject.mockResolvedValue({ ...baseProject });
    mockPreviewTransform.mockReturnValue(pendingTransform);

    await installReactGrab({
      cwd: "/app",
      installPackageOptions: { silent: true },
    });

    expect(mockInstallPackages).toHaveBeenCalledWith(["react-grab"], {
      silent: true,
      cwd: "/app",
      packageManager: "pnpm",
    });
  });

  it("wraps package-manager failures in an install-failed error", async () => {
    mockDetectProject.mockResolvedValue({ ...baseProject });
    mockPreviewTransform.mockReturnValue(pendingTransform);
    mockInstallPackages.mockRejectedValueOnce(new Error("network down"));

    await expect(installReactGrab({ cwd: "/app" })).rejects.toMatchObject({
      code: "install-failed",
      message: "network down",
    });
    expect(mockApplyTransform).not.toHaveBeenCalled();
  });

  it("throws when the transform fails", async () => {
    mockDetectProject.mockResolvedValue({ ...baseProject });
    mockPreviewTransform.mockReturnValue({
      success: false,
      filePath: "",
      message: "Could not find entry file",
    });

    await expect(installReactGrab({ cwd: "/app" })).rejects.toMatchObject({
      code: "transform-failed",
    });
  });

  it("throws when writing the entry file fails", async () => {
    mockDetectProject.mockResolvedValue({ ...baseProject });
    mockPreviewTransform.mockReturnValue(pendingTransform);
    mockApplyTransform.mockReturnValue({ success: false, error: "permission denied" });

    await expect(installReactGrab({ cwd: "/app" })).rejects.toMatchObject({
      code: "write-failed",
    });
  });
});
