// HACK: iOS Safari auto-zooms on inputs with font-size < 16px.
// Temporarily setting maximum-scale=1 on the viewport meta tag prevents this.
export const lockViewportZoom = (): (() => void) => {
  let meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  const originalContent = meta?.getAttribute("content") ?? null;

  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "viewport";
    document.head.appendChild(meta);
  }

  const content = originalContent ?? "";
  meta.content = /maximum-scale/.test(content)
    ? content.replace(/maximum-scale\s*=\s*[\d.]+/, "maximum-scale=1")
    : `${content}${content ? ", " : ""}maximum-scale=1`;

  return () => {
    if (originalContent !== null) {
      meta.content = originalContent;
    } else {
      meta.remove();
    }
  };
};
