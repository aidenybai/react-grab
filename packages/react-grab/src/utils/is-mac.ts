let cachedIsMac: boolean | null = null;

export const isMac = (): boolean => {
  if (cachedIsMac === null) {
    cachedIsMac =
      typeof navigator !== "undefined" &&
      /Mac|iPhone|iPad/.test(navigator.platform);
  }
  return cachedIsMac;
};
