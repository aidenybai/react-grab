import { isExtensionContext } from "./is-extension-context.js";

const isNewerSemver = (latest: string, current: string): boolean => {
  const latestParts = latest.split(".").map(Number);
  const currentParts = current.split(".").map(Number);
  for (let index = 0; index < 3; index++) {
    const latestPart = latestParts[index] ?? 0;
    const currentPart = currentParts[index] ?? 0;
    if (latestPart > currentPart) return true;
    if (latestPart < currentPart) return false;
  }
  return false;
};

export const fetchLatestVersion = async (): Promise<string | null> => {
  const currentVersion = process.env.VERSION;
  if (!currentVersion || !navigator.onLine || isExtensionContext()) {
    return null;
  }

  try {
    const response = await fetch(
      `https://www.react-grab.com/api/version?source=browser&t=${Date.now()}`,
      {
        referrerPolicy: "origin",
        keepalive: true,
        priority: "low",
        cache: "no-store",
      } as RequestInit,
    );
    const latestVersion = await response.text();
    if (
      !latestVersion ||
      latestVersion === currentVersion ||
      !isNewerSemver(latestVersion, currentVersion)
    ) {
      return null;
    }
    return latestVersion;
  } catch {
    return null;
  }
};
