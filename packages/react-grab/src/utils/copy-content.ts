import { VERSION } from "../constants.js";
import { escapeHtml } from "./escape-html.js";

const REACT_GRAB_MIME_TYPE = "application/x-react-grab";

interface CopyContentOptions {
  onSuccess?: () => void;
  prompt?: string;
}

export const copyContent = (
  content: string,
  options?: CopyContentOptions,
): boolean => {
  const metadata = JSON.stringify({
    version: VERSION,
    content,
    timestamp: Date.now(),
    ...(options?.prompt && { prompt: options.prompt }),
  });

  const encodedMetadata = encodeURIComponent(metadata);
  const htmlContent = `<div data-react-grab="${encodedMetadata}"><pre>${escapeHtml(content)}</pre></div>`;

  const copyHandler = (event: ClipboardEvent) => {
    event.preventDefault();
    event.clipboardData?.setData("text/plain", content);
    event.clipboardData?.setData("text/html", htmlContent);
    event.clipboardData?.setData(REACT_GRAB_MIME_TYPE, metadata);
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
