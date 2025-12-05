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
  content: string,
  onSuccess?: () => void,
): Promise<boolean> => {
  await waitForFocus();

  try {
    await navigator.clipboard.writeText(content);
    onSuccess?.();
    return true;
  } catch {
    return copyContentFallback(content, onSuccess);
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
