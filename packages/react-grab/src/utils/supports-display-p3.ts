let cachedResult: boolean | null = null;

export const supportsDisplayP3 = (): boolean => {
  if (cachedResult !== null) return cachedResult;

  try {
    cachedResult = window.matchMedia("(color-gamut: p3)").matches;
  } catch {
    cachedResult = false;
  }

  return cachedResult;
};
