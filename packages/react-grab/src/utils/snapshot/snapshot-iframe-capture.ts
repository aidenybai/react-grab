export const captureIframeContent = async (
  iframeElement: HTMLIFrameElement,
): Promise<string | null> => {
  let isSameOrigin = false;
  try {
    isSameOrigin = Boolean(iframeElement.contentDocument || iframeElement.contentWindow?.document);
  } catch {
    return null;
  }

  if (!isSameOrigin) return null;

  try {
    const iframeDocument = iframeElement.contentDocument;
    if (!iframeDocument?.body) return null;

    const iframeCanvas = document.createElement("canvas");
    const iframeWidth = iframeElement.offsetWidth || iframeElement.clientWidth || 300;
    const iframeHeight = iframeElement.offsetHeight || iframeElement.clientHeight || 150;
    iframeCanvas.width = iframeWidth;
    iframeCanvas.height = iframeHeight;

    const canvasContext = iframeCanvas.getContext("2d");
    if (!canvasContext) return null;

    const svgNamespace = "http://www.w3.org/2000/svg";
    const svgElement = document.createElementNS(svgNamespace, "svg");
    svgElement.setAttribute("width", String(iframeWidth));
    svgElement.setAttribute("height", String(iframeHeight));

    const foreignObject = document.createElementNS(svgNamespace, "foreignObject");
    foreignObject.setAttribute("width", "100%");
    foreignObject.setAttribute("height", "100%");

    const clonedBody = iframeDocument.body.cloneNode(true) as HTMLElement;
    clonedBody.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
    foreignObject.appendChild(clonedBody);
    svgElement.appendChild(foreignObject);

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgElement);
    const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;

    return await new Promise<string | null>((resolve) => {
      const image = new Image();
      image.onload = () => {
        canvasContext.drawImage(image, 0, 0);
        try {
          resolve(iframeCanvas.toDataURL("image/png"));
        } catch {
          resolve(null);
        }
      };
      image.onerror = () => resolve(null);
      image.src = svgDataUrl;
    });
  } catch {
    return null;
  }
};

export const createIframePlaceholder = (
  iframeElement: HTMLIFrameElement,
): string => {
  const iframeWidth = iframeElement.offsetWidth || iframeElement.clientWidth || 300;
  const iframeHeight = iframeElement.offsetHeight || iframeElement.clientHeight || 150;

  return `<div style="width:${iframeWidth}px;height:${iframeHeight}px;background:#f0f0f0;display:flex;align-items:center;justify-content:center;font-size:12px;color:#999;border:1px solid #ddd;">iframe</div>`;
};
