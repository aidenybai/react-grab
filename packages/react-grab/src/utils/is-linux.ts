let cachedIsLinux: boolean | null = null;

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

export const isLinux = (): boolean => {
  if (cachedIsLinux === null) {
    if (typeof navigator === "undefined") {
      cachedIsLinux = false;
      return cachedIsLinux;
    }

    const platform = navigator.platform ?? getPlatformFromUserAgentData() ?? navigator.userAgent;
    const userAgent = navigator.userAgent ?? "";
    const isAndroid = /Android/i.test(platform) || /Android/i.test(userAgent);
    cachedIsLinux = /Linux|X11|CrOS/i.test(platform) && !isAndroid;
  }
  return cachedIsLinux;
};
