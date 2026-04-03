// iOS Safari auto-zooms on any focused input with a font-size below 16px, and
// the comment/prompt inputs are smaller than that threshold. Temporarily setting
// maximum-scale=1 on the viewport meta tag prevents the zoom, at the cost of
// disabling pinch-to-zoom during grab activation.
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
