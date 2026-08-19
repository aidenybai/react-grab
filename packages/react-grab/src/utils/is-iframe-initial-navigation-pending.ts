export const isIframeInitialNavigationPending = (
  iframeElement: HTMLIFrameElement,
  frameDocument: Document | null,
): boolean => {
  if (!frameDocument || frameDocument.URL !== "about:blank") return false;
  if (iframeElement.hasAttribute("srcdoc")) return true;

  const source = iframeElement.getAttribute("src")?.trim();
  return Boolean(source && source.toLowerCase() !== "about:blank");
};
