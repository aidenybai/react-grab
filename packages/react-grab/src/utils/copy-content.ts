// both the modern Clipboard API and document.execCommand('copy') require the document to have focus.
// this function attempts to focus the window and waits for the focus event before proceeding.
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

export const copyContent = async (
  content: string | Blob | Array<string | Blob>,
): Promise<boolean> => {
  await waitForFocus();

  try {
    if (Array.isArray(content)) {
      if (!navigator?.clipboard?.write) {
        for (const contentPart of content) {
          if (typeof contentPart === "string") {
            const result = copyContentFallback(contentPart);
            if (!result) return result;
          }
        }
        return true;
      }
      const mimeTypeMap = new Map<string, Blob>();
      for (const contentPart of content) {
        if (contentPart instanceof Blob) {
          const mimeType = contentPart.type || "text/plain";
          if (!mimeTypeMap.has(mimeType)) {
            mimeTypeMap.set(mimeType, contentPart);
          }
        } else {
          if (!mimeTypeMap.has("text/plain")) {
            mimeTypeMap.set(
              "text/plain",
              new Blob([contentPart], { type: "text/plain" }),
            );
          }
        }
      }
      await navigator.clipboard.write([
        new ClipboardItem(Object.fromEntries(mimeTypeMap)),
      ]);
      return true;
    } else if (content instanceof Blob) {
      await navigator.clipboard.write([
        new ClipboardItem({ [content.type]: content }),
      ]);
      return true;
    } else {
      try {
        await navigator.clipboard.writeText(String(content));
        return true;
      } catch {
        return copyContentFallback(content);
      }
    }
  } catch {
    return false;
  }
};

const copyContentFallback = (content: string) => {
  if (!document.execCommand) return false;
  const el = document.createElement("textarea");
  el.value = String(content);
  el.style.clipPath = "inset(50%)";
  el.ariaHidden = "true";
  const doc = document.body || document.documentElement;
  doc.append(el);
  try {
    el.select();
    return document.execCommand("copy");
  } finally {
    el.remove();
  }
};
