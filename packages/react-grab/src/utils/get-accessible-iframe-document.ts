export const getAccessibleIframeDocument = (iframeElement: HTMLIFrameElement): Document | null => {
  try {
    return iframeElement.contentDocument;
  } catch {
    return null;
  }
};
