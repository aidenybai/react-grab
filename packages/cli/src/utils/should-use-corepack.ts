import { detect } from "package-manager-detector/detect";
import { x } from "tinyexec";
import type { PackageManager } from "./detect.js";

export const shouldUseCorepack = async (
  packageManager: PackageManager,
  cwd: string,
): Promise<boolean> => {
  if (packageManager !== "pnpm" && packageManager !== "yarn") return false;

  const detectedPackageManager = await detect({
    cwd,
    strategies: ["packageManager-field"],
  });

  if (
    detectedPackageManager?.name !== packageManager ||
    detectedPackageManager.version === undefined
  ) {
    return false;
  }

  try {
    const corepackVersionResult = await x("corepack", ["--version"], {
      nodeOptions: { cwd, stdio: "ignore" },
    });
    return corepackVersionResult.exitCode === 0;
  } catch {
    return false;
  }
};
