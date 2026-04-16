export const copyPngToClipboard = async (pngBlob: Blob): Promise<boolean> => {
  if (typeof navigator?.clipboard?.write !== "function") {
    return false;
  }

  try {
    const clipboardItem = new ClipboardItem({ "image/png": pngBlob });
    await navigator.clipboard.write([clipboardItem]);
    return true;
  } catch {
    return false;
  }
};
