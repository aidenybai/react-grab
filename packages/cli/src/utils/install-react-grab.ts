import { resolve } from "node:path";
import {
  detectNextRouterType,
  detectProject,
  type Framework,
  type NextRouterType,
  type PackageManager,
} from "./detect.js";
import { getPackagesToInstall, installPackages, type InstallPackageOptions } from "./install.js";
import { applyTransform, previewTransform, type TransformResult } from "./transform.js";

export type ReactGrabInstallErrorCode =
  | "unsupported-framework"
  | "unknown-framework"
  | "transform-failed"
  | "install-failed"
  | "write-failed";

export class ReactGrabInstallError extends Error {
  readonly code: ReactGrabInstallErrorCode;

  constructor(message: string, code: ReactGrabInstallErrorCode, options?: ErrorOptions) {
    super(message, options);
    this.name = "ReactGrabInstallError";
    this.code = code;
  }
}

export interface InstallReactGrabOptions {
  cwd?: string;
  framework?: Framework;
  nextRouterType?: NextRouterType;
  packageManager?: PackageManager;
  skipPackageInstall?: boolean;
  skipTransform?: boolean;
  dryRun?: boolean;
  installPackageOptions?: Omit<InstallPackageOptions, "cwd" | "packageManager">;
}

export interface InstallReactGrabResult {
  projectRoot: string;
  framework: Framework;
  nextRouterType: NextRouterType;
  packageManager: PackageManager;
  alreadyConfigured: boolean;
  didInstallPackage: boolean;
  didChangeFile: boolean;
  dryRun: boolean;
  transform: TransformResult;
}

export const installReactGrab = async (
  options: InstallReactGrabOptions = {},
): Promise<InstallReactGrabResult> => {
  const cwd = resolve(options.cwd ?? process.cwd());
  const project = await detectProject(cwd);

  const framework = options.framework ?? project.framework;
  const packageManager = options.packageManager ?? project.packageManager;

  if (project.unsupportedFramework && !options.framework) {
    throw new ReactGrabInstallError(
      `${project.unsupportedFramework} is not supported by automatic setup.`,
      "unsupported-framework",
    );
  }

  if (framework === "unknown") {
    throw new ReactGrabInstallError(
      "Could not detect a supported framework. Pass `framework` explicitly to override detection.",
      "unknown-framework",
    );
  }

  // Detection only resolves the router type when the *detected* framework is
  // Next.js, so derive it ourselves when the caller overrides to Next.
  const nextRouterType =
    options.nextRouterType ??
    (framework === "next" && project.nextRouterType === "unknown"
      ? detectNextRouterType(project.projectRoot)
      : project.nextRouterType);

  const alreadyConfigured = project.isReactGrabConfigured;

  const transform = previewTransform(
    project.projectRoot,
    framework,
    nextRouterType,
    alreadyConfigured,
  );

  if (!transform.success && !options.skipTransform) {
    throw new ReactGrabInstallError(transform.message, "transform-failed");
  }

  const didInstallPackage = !options.skipPackageInstall && !options.dryRun && !project.hasReactGrab;

  if (didInstallPackage) {
    try {
      await installPackages(getPackagesToInstall(), {
        ...options.installPackageOptions,
        cwd: project.projectRoot,
        packageManager,
      });
    } catch (error) {
      throw new ReactGrabInstallError(
        error instanceof Error ? error.message : "Failed to install the react-grab package.",
        "install-failed",
        { cause: error },
      );
    }
  }

  // Mirrors applyTransform's own write guard (it does not require originalContent),
  // so an empty source file still receives the injected setup.
  const hasPendingFileChange = !transform.noChanges && Boolean(transform.newContent);
  const didChangeFile = hasPendingFileChange && !options.skipTransform && !options.dryRun;

  if (didChangeFile) {
    const writeResult = applyTransform(transform);
    if (!writeResult.success) {
      throw new ReactGrabInstallError(
        writeResult.error ?? `Failed to write to ${transform.filePath}`,
        "write-failed",
      );
    }
  }

  return {
    projectRoot: project.projectRoot,
    framework,
    nextRouterType,
    packageManager,
    alreadyConfigured,
    didInstallPackage,
    didChangeFile,
    dryRun: Boolean(options.dryRun),
    transform,
  };
};
