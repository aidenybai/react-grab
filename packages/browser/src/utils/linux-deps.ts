import { execSync, spawnSync } from "node:child_process";

type PackageManager = "apt-get" | "dnf" | "yum";

const APT_PACKAGES = [
  "libxcb-shm0",
  "libx11-xcb1",
  "libx11-6",
  "libxcb1",
  "libxext6",
  "libxrandr2",
  "libxcomposite1",
  "libxcursor1",
  "libxdamage1",
  "libxfixes3",
  "libxi6",
  "libgtk-3-0",
  "libpangocairo-1.0-0",
  "libpango-1.0-0",
  "libatk1.0-0",
  "libcairo-gobject2",
  "libcairo2",
  "libgdk-pixbuf-2.0-0",
  "libxrender1",
  "libasound2",
  "libfreetype6",
  "libfontconfig1",
  "libdbus-1-3",
  "libnss3",
  "libnspr4",
  "libatk-bridge2.0-0",
  "libdrm2",
  "libxkbcommon0",
  "libatspi2.0-0",
  "libcups2",
  "libxshmfence1",
  "libgbm1",
];

const DNF_PACKAGES = [
  "nss",
  "nspr",
  "atk",
  "at-spi2-atk",
  "cups-libs",
  "libdrm",
  "libXcomposite",
  "libXdamage",
  "libXrandr",
  "mesa-libgbm",
  "pango",
  "alsa-lib",
  "libxkbcommon",
  "libxcb",
  "libX11-xcb",
  "libX11",
  "libXext",
  "libXcursor",
  "libXfixes",
  "libXi",
  "gtk3",
  "cairo-gobject",
];

const YUM_PACKAGES = [
  "nss",
  "nspr",
  "atk",
  "at-spi2-atk",
  "cups-libs",
  "libdrm",
  "libXcomposite",
  "libXdamage",
  "libXrandr",
  "mesa-libgbm",
  "pango",
  "alsa-lib",
  "libxkbcommon",
];

const commandExists = (command: string): boolean => {
  const checkCommand = process.platform === "win32" ? "where" : "which";
  const result = spawnSync(checkCommand, [command], { stdio: "ignore" });
  return result.status === 0;
};

export const detectPackageManager = (): PackageManager | null => {
  if (commandExists("apt-get")) return "apt-get";
  if (commandExists("dnf")) return "dnf";
  if (commandExists("yum")) return "yum";
  return null;
};

export const getPackagesForManager = (manager: PackageManager): string[] => {
  switch (manager) {
    case "apt-get":
      return APT_PACKAGES;
    case "dnf":
      return DNF_PACKAGES;
    case "yum":
      return YUM_PACKAGES;
  }
};

export const buildInstallCommand = (manager: PackageManager): string => {
  const packages = getPackagesForManager(manager);
  if (manager === "apt-get") {
    return `sudo apt-get update && sudo apt-get install -y ${packages.join(" ")}`;
  }
  return `sudo ${manager} install -y ${packages.join(" ")}`;
};

export interface InstallDepsResult {
  success: boolean;
  message: string;
}

export const installLinuxDeps = (): InstallDepsResult => {
  if (process.platform !== "linux") {
    return {
      success: true,
      message: "System dependencies only needed on Linux",
    };
  }

  const packageManager = detectPackageManager();
  if (!packageManager) {
    return {
      success: false,
      message: "No supported package manager found (apt-get, dnf, or yum)",
    };
  }

  const installCommand = buildInstallCommand(packageManager);

  try {
    execSync(installCommand, { stdio: "inherit" });
    return {
      success: true,
      message: "System dependencies installed successfully",
    };
  } catch {
    return {
      success: false,
      message: `Failed to install dependencies. Try running manually:\n  ${installCommand}`,
    };
  }
};

export const isLinux = (): boolean => process.platform === "linux";
