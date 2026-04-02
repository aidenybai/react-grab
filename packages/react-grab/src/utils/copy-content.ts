import { VERSION } from "../constants.js";

const REACT_GRAB_MIME_TYPE = "application/x-react-grab";

export interface ReactGrabEntry {
  tagName?: string;
  componentName?: string;
  content: string;
  commentText?: string;
}

interface CopyContentOptions {
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
  const reactGrabMetadata: ReactGrabMetadata = {
    version: VERSION,
    content,
    entries,
    timestamp: Date.now(),
  };

  const copyHandler = (event: ClipboardEvent) => {
    event.preventDefault();
    event.clipboardData?.setData("text/plain", content);
    event.clipboardData?.setData(
      "text/html",
      `<meta charset='utf-8'><pre><code>${escapeHtml(content)}</code></pre>`,
    );
    event.clipboardData?.setData(
      REACT_GRAB_MIME_TYPE,
      JSON.stringify(reactGrabMetadata),
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
