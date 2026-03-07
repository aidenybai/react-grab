let cachedIsMac: boolean | null = null;

const getPlatformFromUserAgentData = (): string | null => {
  if (typeof navigator === "undefined") return null;
  if (!("userAgentData" in navigator)) return null;

  const userAgentData = navigator.userAgentData;
  if (typeof userAgentData !== "object" || userAgentData === null) return null;
  if (!("platform" in userAgentData)) return null;

  const platform = userAgentData.platform;
  if (typeof platform !== "string") return null;
  return platform;
};

export const isMac = (): boolean => {
  if (cachedIsMac === null) {
    if (typeof navigator === "undefined") {
      cachedIsMac = false;
      return cachedIsMac;
    }

    const platform =
      getPlatformFromUserAgentData() ??
      navigator.platform ??
      navigator.userAgent;
    cachedIsMac = /Mac|iPhone|iPad|iPod/i.test(platform);
  }
  return cachedIsMac;
};
