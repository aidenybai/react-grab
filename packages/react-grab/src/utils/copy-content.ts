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
  onSuccess?: () => void,
): Promise<boolean> => {
  await waitForFocus();

  try {
    if (Array.isArray(content)) {
      if (!navigator?.clipboard?.write) {
        for (const contentPart of content) {
          if (typeof contentPart === "string") {
            const result = copyContentFallback(contentPart, onSuccess);
            if (!result) return result;
          }
        }
        onSuccess?.();
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

      if (mimeTypeMap.size === 0) {
        const plainTextFallback = content.find(
          (contentPart) => typeof contentPart === "string",
        );
        if (typeof plainTextFallback === "string") {
          return copyContentFallback(plainTextFallback, onSuccess);
        }
        return false;
      }

      try {
        await navigator.clipboard.write([
          new ClipboardItem(Object.fromEntries(mimeTypeMap)),
        ]);
        onSuccess?.();
        return true;
      } catch {
        const plainTextParts = content.filter(
          (contentPart): contentPart is string => typeof contentPart === "string",
        );
        if (plainTextParts.length > 0) {
          const combinedText = plainTextParts.join("\n\n");
          return copyContentFallback(combinedText, onSuccess);
        }
        return false;
      }
    } else if (content instanceof Blob) {
      await navigator.clipboard.write([
        new ClipboardItem({ [content.type]: content }),
      ]);
      onSuccess?.();
      return true;
    } else {
      try {
        await navigator.clipboard.writeText(String(content));
        onSuccess?.();
        return true;
      } catch {
        const result = copyContentFallback(content, onSuccess);
        return result;
      }
    }
  } catch {
    return false;
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
