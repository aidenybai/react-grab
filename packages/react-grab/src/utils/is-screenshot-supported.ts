export const isScreenshotSupported = (): boolean => {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  const hasGetDisplayMedia =
    typeof navigator.mediaDevices?.getDisplayMedia === "function";

  const hasClipboardWrite =
    typeof navigator.clipboard?.write === "function" &&
    typeof ClipboardItem !== "undefined";

  return hasGetDisplayMedia && hasClipboardWrite;
};
