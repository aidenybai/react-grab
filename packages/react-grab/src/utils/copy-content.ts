export const copyContent = async (
  content: string | Blob | Array<string | Blob>,
): Promise<boolean> => {
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
      await navigator.clipboard.write([
        new ClipboardItem(
          Object.fromEntries(
            content.map((contentPart) => {
              if (contentPart instanceof Blob) {
                return [contentPart.type ?? "text/plain", contentPart];
              } else {
                return [
                  "text/plain",
                  new Blob([contentPart], { type: "text/plain" }),
                ];
              }
            }),
          ),
        ),
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

export const copyContentFallback = (content: string) => {
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
