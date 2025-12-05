import { VERSION } from "../constants.js";

const waitForFocus = (): Promise<void> => {
  if (document.hasFocus()) {
    return new Promise((resolve) => setTimeout(resolve, 50));
  }
  return new Promise((resolve) => {
    const onFocus = () => {
      window.removeEventListener("focus", onFocus);
      setTimeout(resolve, 50);
    };
    window.addEventListener("focus", onFocus);
    window.focus();
  });
};

const REACT_GRAB_MIME_TYPE = "application/x-react-grab";

const supportsClipboardItem = (): boolean =>
  typeof ClipboardItem !== "undefined" &&
  typeof navigator?.clipboard?.write === "function";

export const copyContent = async (
  content: string,
  onSuccess?: () => void,
): Promise<boolean> => {
  await waitForFocus();

  try {
    if (supportsClipboardItem()) {
      try {
        const metadata = JSON.stringify({ version: VERSION, content });
        const clipboardItems: Record<string, Blob> = {
          "text/plain": new Blob([content], { type: "text/plain" }),
          [REACT_GRAB_MIME_TYPE]: new Blob([metadata], {
            type: REACT_GRAB_MIME_TYPE,
          }),
        };

        await navigator.clipboard.write([new ClipboardItem(clipboardItems)]);
        onSuccess?.();
        return true;
      } catch {
        const result = copyContentFallback(content, onSuccess);
        return result;
      }
    }

    await navigator.clipboard.writeText(content);
    onSuccess?.();
    return true;
  } catch {
    return copyContentFallback(content, onSuccess);
  }
};

const copyContentFallback = (content: string, onSuccess?: () => void) => {
  if (!document.execCommand) return false;
  const el = document.createElement("textarea");
  el.value = String(content);
  el.style.clipPath = "inset(50%)";
  el.ariaHidden = "true";
  const doc = document.body || document.documentElement;
  doc.append(el);
  try {
    el.select();
    const result = document.execCommand("copy");
    if (result) onSuccess?.();
    return result;
  } finally {
    el.remove();
  }
};
