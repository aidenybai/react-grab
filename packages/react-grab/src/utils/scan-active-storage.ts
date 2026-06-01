const SCAN_ACTIVE_STORAGE_KEY = "react-grab-scan-active";

export const loadScanActive = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(SCAN_ACTIVE_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
};

export const saveScanActive = (isActive: boolean): void => {
  if (typeof window === "undefined") return;
  try {
    if (isActive) {
      window.sessionStorage.setItem(SCAN_ACTIVE_STORAGE_KEY, "true");
    } else {
      window.sessionStorage.removeItem(SCAN_ACTIVE_STORAGE_KEY);
    }
  } catch {}
};
