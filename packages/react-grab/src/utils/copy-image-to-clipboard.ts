export const copyImageToClipboard = async (
  imageBlob: Blob,
): Promise<boolean> => {
  try {
    const clipboardItem = new ClipboardItem({
      [imageBlob.type]: imageBlob,
    });
    await navigator.clipboard.write([clipboardItem]);
    return true;
  } catch {
    return false;
  }
};
