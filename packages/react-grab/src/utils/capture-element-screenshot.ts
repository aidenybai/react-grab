const inlineComputedStyles = (source: Element, target: Element): void => {
  const sourceStyles = window.getComputedStyle(source);
  const targetElement = target as HTMLElement;

  for (let i = 0; i < sourceStyles.length; i++) {
    const property = sourceStyles[i];
    targetElement.style.setProperty(
      property,
      sourceStyles.getPropertyValue(property),
    );
  }

  const sourceChildren = source.children;
  const targetChildren = target.children;
  for (let i = 0; i < sourceChildren.length; i++) {
    if (sourceChildren[i] && targetChildren[i]) {
      inlineComputedStyles(sourceChildren[i], targetChildren[i]);
    }
  }
};

const convertExternalImagesToDataUrls = async (
  container: Element,
): Promise<void> => {
  const images = container.querySelectorAll("img");
  const conversionPromises = Array.from(images).map(async (image) => {
    const source = image.getAttribute("src");
    if (!source || source.startsWith("data:")) return;

    try {
      const response = await fetch(source, { mode: "cors" });
      const blob = await response.blob();
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      image.setAttribute("src", dataUrl);
    } catch {
      image.removeAttribute("src");
    }
  });

  await Promise.all(conversionPromises);
};

const SCREENSHOT_PADDING_PX = 16;

export const captureElementScreenshot = async (
  element: Element,
): Promise<Blob | null> => {
  const boundingRect = element.getBoundingClientRect();
  const canvasWidth = Math.ceil(boundingRect.width) + SCREENSHOT_PADDING_PX * 2;
  const canvasHeight =
    Math.ceil(boundingRect.height) + SCREENSHOT_PADDING_PX * 2;

  if (canvasWidth <= 0 || canvasHeight <= 0) return null;

  const clonedElement = element.cloneNode(true) as Element;
  inlineComputedStyles(element, clonedElement);
  await convertExternalImagesToDataUrls(clonedElement);

  const wrapper = document.createElement("div");
  wrapper.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  wrapper.style.padding = `${SCREENSHOT_PADDING_PX}px`;
  wrapper.style.backgroundColor = "#ffffff";
  wrapper.style.width = `${canvasWidth}px`;
  wrapper.style.height = `${canvasHeight}px`;
  wrapper.style.overflow = "hidden";
  wrapper.appendChild(clonedElement);

  const serializedHtml = new XMLSerializer().serializeToString(wrapper);

  const svgMarkup = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidth}" height="${canvasHeight}">
    <foreignObject width="100%" height="100%">${serializedHtml}</foreignObject>
  </svg>`;

  const svgBlob = new Blob([svgMarkup], {
    type: "image/svg+xml;charset=utf-8",
  });
  const svgObjectUrl = URL.createObjectURL(svgBlob);

  try {
    const image = new Image();
    image.width = canvasWidth;
    image.height = canvasHeight;

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Failed to load SVG as image"));
      image.src = svgObjectUrl;
    });

    const devicePixelRatio = Math.max(window.devicePixelRatio, 2);
    const canvas = document.createElement("canvas");
    canvas.width = canvasWidth * devicePixelRatio;
    canvas.height = canvasHeight * devicePixelRatio;

    const context = canvas.getContext("2d");
    if (!context) return null;

    context.scale(devicePixelRatio, devicePixelRatio);
    context.drawImage(image, 0, 0, canvasWidth, canvasHeight);

    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png");
    });
  } finally {
    URL.revokeObjectURL(svgObjectUrl);
  }
};
