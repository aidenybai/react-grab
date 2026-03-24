import { VERSION } from "../constants.js";
import { renderTextToImage } from "./render-text-to-image.js";

export interface ReactGrabEntry {
  tagName?: string;
  componentName?: string;
  content: string;
  commentText?: string;
}

interface CopyContentOptions {
  onSuccess?: () => void;
  componentName?: string;
  tagName?: string;
  commentText?: string;
  entries?: ReactGrabEntry[];
}

interface ReactGrabMetadata {
  version: string;
  content: string;
  entries: ReactGrabEntry[];
  timestamp: number;
}

const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const buildHtmlPayload = (content: string): string =>
  `<meta charset='utf-8'><pre><code>${escapeHtml(content)}</code></pre>`;

const buildMetadata = (
  content: string,
  options?: CopyContentOptions,
): ReactGrabMetadata => {
  const elementName = options?.componentName ?? "div";
  const entries = options?.entries ?? [
    {
      tagName: options?.tagName,
      componentName: elementName,
      content,
      commentText: options?.commentText,
    },
  ];
  return { version: VERSION, content, entries, timestamp: Date.now() };
};

const isModernClipboardAvailable = (): boolean =>
  Boolean(navigator.clipboard?.write) && typeof ClipboardItem !== "undefined";

/**
 * Modern path: writes text/plain + text/html + image/png in a single ClipboardItem.
 * Cannot carry custom MIME types like application/x-react-grab.
 */
const modernCopy = async (content: string): Promise<void> => {
  const item = new ClipboardItem({
    "text/plain": new Blob([content], { type: "text/plain" }),
    "text/html": new Blob([buildHtmlPayload(content)], { type: "text/html" }),
    "image/png": renderTextToImage(content),
  });
  await navigator.clipboard.write([item]);
};

/**
 * Legacy path: execCommand("copy") with text/plain + text/html + metadata.
 * Must run synchronously within a user gesture call stack.
 */
const legacyCopy = (content: string, metadata: ReactGrabMetadata): boolean => {
  const copyHandler = (event: ClipboardEvent) => {
    event.preventDefault();
    event.clipboardData?.setData("text/plain", content);
    event.clipboardData?.setData("text/html", buildHtmlPayload(content));
    event.clipboardData?.setData(
      "application/x-react-grab",
      JSON.stringify(metadata),
    );
  };

  document.addEventListener("copy", copyHandler);

  const textarea = document.createElement("textarea");
  textarea.value = content;
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.ariaHidden = "true";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    if (typeof document.execCommand !== "function") {
      return false;
    }
    return document.execCommand("copy");
  } finally {
    document.removeEventListener("copy", copyHandler);
    textarea.remove();
  }
};

export const copyContent = async (
  content: string,
  options?: CopyContentOptions,
): Promise<boolean> => {
  let didCopy: boolean;

  if (isModernClipboardAvailable()) {
    try {
      await modernCopy(content);
      didCopy = true;
    } catch {
      didCopy = false;
    }
  } else {
    didCopy = legacyCopy(content, buildMetadata(content, options));
  }

  if (didCopy) options?.onSuccess?.();
  return didCopy;
};
