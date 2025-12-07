import { VERSION } from "../constants.js";

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

  const copyHandler = (event: ClipboardEvent) => {
    event.preventDefault();
    event.clipboardData?.setData("text/plain", content);
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
