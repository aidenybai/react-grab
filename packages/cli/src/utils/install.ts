import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { x } from "tinyexec";
import { detectPackageManager, type PackageManager } from "./detect.js";
import { shouldUseCorepack } from "./should-use-corepack.js";

export interface InstallPackageOptions {
  cwd?: string;
  isDev?: boolean;
  silent?: boolean;
  packageManager?: PackageManager;
  preferOffline?: boolean;
  additionalArgs?: string[];
}

export const installPackages = async (
  packages: string[],
  options: InstallPackageOptions = {},
): Promise<void> => {
  if (packages.length === 0) return;

  const detectedAgent =
    options.packageManager ?? (await detectPackageManager(options.cwd ?? process.cwd()));
  const args: string[] = [];

  if (options.preferOffline) {
    args.push("--prefer-offline");
  }

  if (detectedAgent === "pnpm") {
    args.push("--prod=false");
    if (existsSync(resolve(options.cwd ?? process.cwd(), "pnpm-workspace.yaml"))) {
      args.push("-w");
    }
  }

  if (options.additionalArgs) {
    args.push(...options.additionalArgs);
  }

  const installVerb = detectedAgent === "npm" ? "install" : "add";
  const shouldInvokeCorepack = await shouldUseCorepack(detectedAgent, options.cwd ?? process.cwd());
  const packageManagerCommand = shouldInvokeCorepack ? "corepack" : detectedAgent;
  const packageManagerArgs = shouldInvokeCorepack ? [detectedAgent] : [];

  await x(
    packageManagerCommand,
    [
      ...packageManagerArgs,
      installVerb,
      ...(options.isDev !== false ? ["-D"] : []),
      ...args,
      ...packages,
    ],
    {
      nodeOptions: {
        stdio: options.silent ? "ignore" : "inherit",
        cwd: options.cwd,
        env: { ...process.env, REACT_GRAB_INIT: "1" },
      },
      throwOnError: true,
    },
  );
};

export const getPackagesToInstall = (includeReactGrab: boolean = true): string[] => {
  return includeReactGrab ? ["react-grab"] : [];
};
