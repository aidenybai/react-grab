type Platform = "mac" | "windows" | "linux";

interface PlatformInfo {
  platform: Platform;
  isMac: boolean;
  isWindows: boolean;
  isLinux: boolean;
}

let cachedPlatformInfo: PlatformInfo | null = null;

export const detectPlatform = (): PlatformInfo => {
  if (cachedPlatformInfo) {
    return cachedPlatformInfo;
  }

  const userAgent = navigator.userAgent.toLowerCase();
  const platform = navigator.platform?.toLowerCase() ?? "";

  const isMac = platform.includes("mac") || userAgent.includes("mac");
  const isWindows = platform.includes("win") || userAgent.includes("win");
  const isLinux = !isMac && !isWindows;

  const detectedPlatform: Platform = isMac
    ? "mac"
    : isWindows
      ? "windows"
      : "linux";

  cachedPlatformInfo = {
    platform: detectedPlatform,
    isMac,
    isWindows,
    isLinux,
  };

  return cachedPlatformInfo;
};
