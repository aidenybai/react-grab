import html2canvas from "html2canvas";

interface ScreenshotOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

const DEFAULT_OPTIONS: ScreenshotOptions = {
  maxWidth: 400,
  maxHeight: 300,
  quality: 0.8,
};

export const captureElementScreenshot = async (
  element: Element,
  options: ScreenshotOptions = {},
): Promise<string | null> => {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    const canvas = await html2canvas(element as HTMLElement, {
      allowTaint: true,
      backgroundColor: null,
      logging: false,
      scale: window.devicePixelRatio || 1,
      useCORS: true,
      width: element.getBoundingClientRect().width,
      height: element.getBoundingClientRect().height,
    });

    let finalCanvas = canvas;

    if (
      opts.maxWidth &&
      opts.maxHeight &&
      (canvas.width > opts.maxWidth || canvas.height > opts.maxHeight)
    ) {
      const scale = Math.min(
        opts.maxWidth / canvas.width,
        opts.maxHeight / canvas.height,
      );

      const resizedCanvas = document.createElement("canvas");
      resizedCanvas.width = canvas.width * scale;
      resizedCanvas.height = canvas.height * scale;

      const ctx = resizedCanvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(canvas, 0, 0, resizedCanvas.width, resizedCanvas.height);
        finalCanvas = resizedCanvas;
      }
    }

    return finalCanvas.toDataURL("image/png", opts.quality);
  } catch (error) {
    console.error("[react-grab] Failed to capture screenshot:", error);
    return null;
  }
};

export const generateElementSelector = (element: Element): string => {
  const tagName = element.tagName.toLowerCase();
  const id = element.id ? `#${element.id}` : "";
  const className = element.className
    ? `.${element.className.toString().trim().split(/\s+/).join(".")}`
    : "";

  let selector = tagName + id + className;

  if (!id && !className) {
    const parent = element.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children);
      const index = siblings.indexOf(element);
      if (index >= 0) {
        selector += `:nth-child(${index + 1})`;
      }
    }
  }

  return selector;
};
