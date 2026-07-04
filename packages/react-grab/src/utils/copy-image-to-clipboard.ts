import { IS_DEMO } from "./runtime-mode.js";

export const copyImageToClipboard = async (pngBlob: Blob | Promise<Blob>): Promise<boolean> => {
  // Demo mode never touches the visitor's real clipboard; report success so
  // the "Copied" feedback still plays.
  if (IS_DEMO) return true;
  if (typeof ClipboardItem === "undefined" || !navigator.clipboard) return false;

  try {
    await navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob })]);
    return true;
  } catch {
    return false;
  }
};
