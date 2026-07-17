import { VERSION } from "../constants.js";
import type { ReactGrabEntry } from "../types.js";
import { IS_DEMO } from "./runtime-mode.js";

const REACT_GRAB_MIME_TYPE = "application/x-react-grab";

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
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const copyContent = (content: string, options?: CopyContentOptions): boolean => {
  // Demo mode never touches the visitor's real clipboard (and synthetic events
  // lack the user gesture execCommand needs), so report success to play the
  // "Copied" feedback without writing.
  if (IS_DEMO) return true;

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

  // The clipboard receives three formats: plain text for terminals and editors,
  // HTML-escaped content for rich text fields like Notion or Google Docs, and a
  // custom MIME type carrying full metadata for paste targets that understand it.
  const copyHandler = (event: ClipboardEvent) => {
    event.preventDefault();
    event.clipboardData?.setData("text/plain", content);
    event.clipboardData?.setData(
      "text/html",
      `<meta charset='utf-8'><pre><code>${escapeHtml(content)}</code></pre>`,
    );
    event.clipboardData?.setData(REACT_GRAB_MIME_TYPE, JSON.stringify(reactGrabMetadata));
  };

  // We use the deprecated but universally supported execCommand("copy") because
  // it runs synchronously in the user's key event call stack, unlike the async
  // Clipboard API. The hidden textarea provides the selection context that
  // execCommand requires, and the copy handler installed above intercepts the
  // browser's default behavior to set our custom clipboard data.
  const textarea = document.createElement("textarea");
  document.addEventListener("copy", copyHandler);

  try {
    textarea.value = content;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.ariaHidden = "true";
    document.body.appendChild(textarea);
    textarea.select();

    if (typeof document.execCommand !== "function") {
      return false;
    }
    return document.execCommand("copy");
  } finally {
    document.removeEventListener("copy", copyHandler);
    textarea.remove();
  }
};
