import { delay } from "./delay.js";

interface ElementBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const combineBounds = (boundsList: ElementBounds[]): ElementBounds => {
  if (boundsList.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  if (boundsList.length === 1) {
    return boundsList[0];
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const bounds of boundsList) {
    minX = Math.min(minX, bounds.x);
    minY = Math.min(minY, bounds.y);
    maxX = Math.max(maxX, bounds.x + bounds.width);
    maxY = Math.max(maxY, bounds.y + bounds.height);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
};

const captureVideoFrame = (
  video: HTMLVideoElement,
  bounds: ElementBounds,
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      reject(new Error("Failed to get canvas context"));
      return;
    }

    const devicePixelRatio = window.devicePixelRatio || 1;
    const scaledBounds = {
      x: bounds.x * devicePixelRatio,
      y: bounds.y * devicePixelRatio,
      width: bounds.width * devicePixelRatio,
      height: bounds.height * devicePixelRatio,
    };

    canvas.width = scaledBounds.width;
    canvas.height = scaledBounds.height;

    context.drawImage(
      video,
      scaledBounds.x,
      scaledBounds.y,
      scaledBounds.width,
      scaledBounds.height,
      0,
      0,
      scaledBounds.width,
      scaledBounds.height,
    );

    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to create image blob"));
        }
      },
      "image/png",
      1.0,
    );
  });
};

export const captureElementScreenshot = async (
  bounds: ElementBounds,
): Promise<Blob> => {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: {
      displaySurface: "browser",
    },
    preferCurrentTab: true,
  } as DisplayMediaStreamOptions);

  const video = document.createElement("video");
  video.srcObject = stream;
  video.autoplay = true;
  video.playsInline = true;

  await new Promise<void>((resolve) => {
    video.onloadedmetadata = () => {
      void video.play();
      resolve();
    };
  });

  // HACK: Small delay to ensure video frame is ready
  await delay(100);

  try {
    const blob = await captureVideoFrame(video, bounds);
    return blob;
  } finally {
    stream.getTracks().forEach((track) => track.stop());
    video.srcObject = null;
  }
};

export const copyImageToClipboard = async (blob: Blob): Promise<boolean> => {
  try {
    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    return true;
  } catch {
    return false;
  }
};
