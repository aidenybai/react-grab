import { toCanvas } from "../exporters/to-canvas.js";
import type { SnapshotCaptureContext } from "../types.js";

export const rasterize = async (
  url: string,
  options: SnapshotCaptureContext,
): Promise<HTMLImageElement> => {
  const canvas = await toCanvas(url, options);

  const img = new Image();
  img.src = canvas.toDataURL(`image/${options.format}`, options.quality);
  await img.decode();

  const dpr = options.dpr ?? 1;
  img.style.width = `${canvas.width / dpr}px`;
  img.style.height = `${canvas.height / dpr}px`;
  return img;
};
