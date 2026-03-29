import { VERSION } from "../constants.js";

const REACT_GRAB_MIME_TYPE = "application/x-react-grab";

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
  url?: string;
}

interface ReactGrabMetadata {
  version: string;
  url: string;
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

export const buildClipboardText = (
  content: string,
  url?: string,
): string => (url != null ? `${content}\n\nURL: ${url}` : content);

export const copyContent = (
  content: string,
  options?: CopyContentOptions,
): boolean => {
  const elementName = options?.componentName ?? "div";
  const entries = options?.entries ?? [
    {
      tagName: options?.tagName,
      componentName: elementName,
      content,
      commentText: options?.commentText,
    },
  ];
  const url = options?.url ?? window.location.href;
  const clipboardText = buildClipboardText(content, options?.url != null ? url : undefined);
  const reactGrabMetadata: ReactGrabMetadata = {
    version: VERSION,
    url,
    content,
    entries,
    timestamp: Date.now(),
  };

  const copyHandler = (event: ClipboardEvent) => {
    event.preventDefault();
    event.clipboardData?.setData("text/plain", clipboardText);
    event.clipboardData?.setData(
      "text/html",
      `<meta charset='utf-8'><pre><code>${escapeHtml(clipboardText)}</code></pre>`,
    );
    event.clipboardData?.setData(
      REACT_GRAB_MIME_TYPE,
      JSON.stringify(reactGrabMetadata),
    );
  };

  document.addEventListener("copy", copyHandler);

  const textarea = document.createElement("textarea");
  textarea.value = clipboardText;
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.ariaHidden = "true";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    if (typeof document.execCommand !== "function") {
      return false;
    }
    const didCopySucceed = document.execCommand("copy");
    if (didCopySucceed) {
      options?.onSuccess?.();
    }
    return didCopySucceed;
  } finally {
    document.removeEventListener("copy", copyHandler);
    textarea.remove();
  }
};
