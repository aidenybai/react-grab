export const copyImageToClipboard = async (
  imageBlob: Blob,
  fileName: string,
): Promise<boolean> => {
  try {
    const namedFile = new File([imageBlob], `${fileName}.png`, {
      type: imageBlob.type,
    });
    const clipboardItem = new ClipboardItem({
      [namedFile.type]: namedFile,
    });
    await navigator.clipboard.write([clipboardItem]);
    return true;
  } catch {
    return false;
  }
};
