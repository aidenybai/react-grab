import { toCanvas } from "./to-canvas.js";
import type { SnapshotCaptureContext } from "../types.js";

export const toBlob = async (url: string, options: SnapshotCaptureContext): Promise<Blob> => {
  const type = options.type;
  if (type === "svg") {
    const svgText = decodeURIComponent(url.split(",")[1] ?? "");
    return new Blob([svgText], { type: "image/svg+xml" });
  }

  const canvas = await toCanvas(url, options);
  return new Promise<Blob>((resolve) =>
    canvas.toBlob(
      (blob) => resolve(blob ?? new Blob([], { type: `image/${type}` })),
      `image/${type}`,
      options.quality,
    ),
  );
};
