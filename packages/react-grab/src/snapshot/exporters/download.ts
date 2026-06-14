import { toBlob } from "./to-blob.js";
import { toCanvas } from "./to-canvas.js";
import { isIOS } from "../utils/browser.js";
import type { SnapshotBlobType, SnapshotCaptureContext } from "../types.js";

const shareFile = async (blob: Blob, filename: string): Promise<boolean> => {
  const file = new File([blob], filename, { type: blob.type });
  if (!navigator.canShare?.({ files: [file] })) return false;
  try {
    await navigator.share({ files: [file], title: filename });
  } catch (error) {
    if (!(error instanceof Error) || error.name !== "AbortError") return false;
  }
  return true;
};

export const download = async (url: string, options: SnapshotCaptureContext): Promise<void> => {
  const IMAGE_FORMATS = new Set(["png", "jpeg", "jpg", "webp", "svg"]);
  const rawType = (options?.type || "").toLowerCase();
  const typeAsFormat = IMAGE_FORMATS.has(rawType) ? rawType : "";
  const format = (options?.format || typeAsFormat || "").toLowerCase();
  const normalizedFormat = (format === "jpg" ? "jpeg" : format || "png") as SnapshotBlobType;
  const filenameRaw = typeof options?.filename === "string" ? options.filename : "";
  const filename = filenameRaw || `snapshot.${normalizedFormat}`;
  const nextOptions: SnapshotCaptureContext = {
    ...(options || {}),
    format: normalizedFormat,
    type: normalizedFormat,
  };
  nextOptions.dpr = 1;
  const foundIOS = isIOS();

  if (normalizedFormat === "svg") {
    const blob = await toBlob(url, { ...nextOptions, type: "svg" });
    if (foundIOS && (await shareFile(blob, filename))) return;
    const objectURL = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectURL;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(objectURL);
    a.remove();
    return;
  }

  const canvas = await toCanvas(url, nextOptions);

  if (foundIOS) {
    const mimeType = `image/${normalizedFormat}`;
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, mimeType, options?.quality),
    );
    if (blob && (await shareFile(blob, filename))) return;
  }

  const a = document.createElement("a");
  a.href = canvas.toDataURL(`image/${normalizedFormat}`, options?.quality);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
};
