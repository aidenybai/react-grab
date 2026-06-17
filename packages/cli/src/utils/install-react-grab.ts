import {
  detectProject,
  type Framework,
  type NextRouterType,
  type PackageManager,
} from "./detect.js";
import { installPackages, type InstallPackageOptions } from "./install.js";
import { applyTransform, previewTransform, type TransformResult } from "./transform.js";

export type ReactGrabInstallErrorCode =
  | "unsupported-framework"
  | "unknown-framework"
  | "transform-failed"
  | "write-failed";

export class ReactGrabInstallError extends Error {
  readonly code: ReactGrabInstallErrorCode;

  constructor(message: string, code: ReactGrabInstallErrorCode) {
    super(message);
    this.name = "ReactGrabInstallError";
    this.code = code;
  }
}

export interface InstallReactGrabOptions {
  cwd?: string;
  framework?: Framework;
  nextRouterType?: NextRouterType;
  packageManager?: PackageManager;
  force?: boolean;
  skipPackageInstall?: boolean;
  skipTransform?: boolean;
  dryRun?: boolean;
  installPackageOptions?: InstallPackageOptions;
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
  const cwd = options.cwd ?? process.cwd();
  const project = await detectProject(cwd);

  const framework = options.framework ?? project.framework;
  const nextRouterType = options.nextRouterType ?? project.nextRouterType;
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

  const alreadyConfigured = project.isReactGrabConfigured;

  const transform = previewTransform(
    project.projectRoot,
    framework,
    nextRouterType,
    alreadyConfigured && !options.force,
  );

  if (!transform.success) {
    throw new ReactGrabInstallError(transform.message, "transform-failed");
  }

  const didInstallPackage = !options.skipPackageInstall && !options.dryRun && !project.hasReactGrab;

  if (didInstallPackage) {
    await installPackages(["react-grab"], {
      cwd: project.projectRoot,
      packageManager,
      ...options.installPackageOptions,
    });
  }

  const hasPendingFileChange = Boolean(transform.newContent) && !transform.noChanges;
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
