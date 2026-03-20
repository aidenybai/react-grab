import { VERSION } from "../constants.js";

interface CopyContentWithImageOptions {
  content: string;
  imageBlob: Blob;
  componentName?: string;
  onSuccess?: () => void;
}

const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

export const copyContentWithImage = async (
  options: CopyContentWithImageOptions,
): Promise<boolean> => {
  const { content, imageBlob, componentName, onSuccess } = options;

  if (typeof navigator?.clipboard?.write !== "function") {
    return false;
  }

  const imageDataUrl = await blobToDataUrl(imageBlob);

  const htmlContent = [
    `<meta charset='utf-8'>`,
    `<div data-react-grab-version="${VERSION}"${componentName ? ` data-component="${escapeHtml(componentName)}"` : ""}>`,
    `<img src="${imageDataUrl}" alt="Element screenshot" style="max-width:100%;border:1px solid #e0e0e0;border-radius:4px;margin-bottom:8px;" />`,
    `<pre><code>${escapeHtml(content)}</code></pre>`,
    `</div>`,
  ].join("");

  try {
    const clipboardItem = new ClipboardItem({
      "text/plain": new Blob([content], { type: "text/plain" }),
      "text/html": new Blob([htmlContent], { type: "text/html" }),
      "image/png": imageBlob,
    });

    await navigator.clipboard.write([clipboardItem]);
    onSuccess?.();
    return true;
  } catch {
    try {
      const clipboardItemWithoutImage = new ClipboardItem({
        "text/plain": new Blob([content], { type: "text/plain" }),
        "text/html": new Blob([htmlContent], { type: "text/html" }),
      });

      await navigator.clipboard.write([clipboardItemWithoutImage]);
      onSuccess?.();
      return true;
    } catch {
      return false;
    }
  }
};
