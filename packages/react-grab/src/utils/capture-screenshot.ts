import {
  VIDEO_METADATA_TIMEOUT_MS,
  VIDEO_READY_POLL_INTERVAL_MS,
  VIDEO_READY_TIMEOUT_MS,
} from "../constants.js";
import type { CurrentTabDisplayMediaOptions } from "../types.js";

export interface ElementBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

const captureVideoFrame = (video: HTMLVideoElement, bounds: ElementBounds): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      reject(new Error("Failed to get canvas context"));
      return;
    }

    const scaleX = video.videoWidth / window.innerWidth;
    const scaleY = video.videoHeight / window.innerHeight;
    const scaledBounds = {
      x: bounds.x * scaleX,
      y: bounds.y * scaleY,
      width: bounds.width * scaleX,
      height: bounds.height * scaleY,
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

export const captureElementScreenshot = async (bounds: ElementBounds): Promise<Blob> => {
  const displayMediaOptions: CurrentTabDisplayMediaOptions = {
    video: { displaySurface: "browser" },
    preferCurrentTab: true,
  };
  const stream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);

  const video = document.createElement("video");
  video.srcObject = stream;
  video.autoplay = true;
  video.playsInline = true;

  // Stop the capture stream on any failure below, not just a frame-draw error -
  // otherwise a metadata/ready-state rejection leaves the tab "sharing" forever.
  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Video metadata loading timed out"));
      }, VIDEO_METADATA_TIMEOUT_MS);

      video.onerror = () => {
        clearTimeout(timeout);
        reject(new Error("Video failed to load"));
      };

      video.onloadedmetadata = () => {
        clearTimeout(timeout);
        void video.play();
        resolve();
      };
    });

    await new Promise<void>((resolve, reject) => {
      const startTime = Date.now();

      const checkReady = () => {
        if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          resolve();
          return;
        }

        if (Date.now() - startTime >= VIDEO_READY_TIMEOUT_MS) {
          reject(new Error("Video frame not ready within timeout"));
          return;
        }

        setTimeout(checkReady, VIDEO_READY_POLL_INTERVAL_MS);
      };

      checkReady();
    });

    return await captureVideoFrame(video, bounds);
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
