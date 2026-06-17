import { vi, describe, expect, it, beforeEach } from "vite-plus/test";

vi.mock("../src/utils/detect.js", () => ({
  detectProject: vi.fn(),
}));

vi.mock("../src/utils/install.js", () => ({
  installPackages: vi.fn(),
}));

vi.mock("../src/utils/transform.js", () => ({
  previewTransform: vi.fn(),
  applyTransform: vi.fn(),
}));

import { detectProject } from "../src/utils/detect.js";
import { installPackages } from "../src/utils/install.js";
import { applyTransform, previewTransform } from "../src/utils/transform.js";
import { installReactGrab, ReactGrabInstallError } from "../src/utils/install-react-grab.js";

const mockDetectProject = vi.mocked(detectProject);
const mockInstallPackages = vi.mocked(installPackages);
const mockPreviewTransform = vi.mocked(previewTransform);
const mockApplyTransform = vi.mocked(applyTransform);

const baseProject = {
  packageManager: "pnpm" as const,
  framework: "vite" as const,
  nextRouterType: "unknown" as const,
  isMonorepo: false,
  projectRoot: "/app",
  hasReactGrab: false,
  isReactGrabConfigured: false,
  reactGrabVersion: null,
  unsupportedFramework: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockApplyTransform.mockReturnValue({ success: true });
});

describe("installReactGrab", () => {
  it("installs the package and writes the entry file for a fresh project", async () => {
    mockDetectProject.mockResolvedValue({ ...baseProject });
    mockPreviewTransform.mockReturnValue({
      success: true,
      filePath: "/app/src/main.tsx",
      message: "Add React Grab",
      originalContent: "render()",
      newContent: 'import("react-grab");\n\nrender()',
    });

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
    mockPreviewTransform.mockReturnValue({
      success: true,
      filePath: "/app/src/main.tsx",
      message: "Add React Grab",
      originalContent: "render()",
      newContent: 'import("react-grab");\n\nrender()',
    });

    const result = await installReactGrab({ cwd: "/app" });

    expect(mockInstallPackages).not.toHaveBeenCalled();
    expect(result.didInstallPackage).toBe(false);
    expect(result.didChangeFile).toBe(true);
  });

  it("never installs or writes during a dry run", async () => {
    mockDetectProject.mockResolvedValue({ ...baseProject });
    mockPreviewTransform.mockReturnValue({
      success: true,
      filePath: "/app/src/main.tsx",
      message: "Add React Grab",
      originalContent: "render()",
      newContent: 'import("react-grab");\n\nrender()',
    });

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

  it("throws when no framework can be resolved", async () => {
    mockDetectProject.mockResolvedValue({ ...baseProject, framework: "unknown" });

    await expect(installReactGrab({ cwd: "/app" })).rejects.toBeInstanceOf(ReactGrabInstallError);
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
    mockPreviewTransform.mockReturnValue({
      success: true,
      filePath: "/app/src/main.tsx",
      message: "Add React Grab",
      originalContent: "render()",
      newContent: 'import("react-grab");\n\nrender()',
    });
    mockApplyTransform.mockReturnValue({ success: false, error: "permission denied" });

    await expect(installReactGrab({ cwd: "/app" })).rejects.toMatchObject({
      code: "write-failed",
    });
  });
});
