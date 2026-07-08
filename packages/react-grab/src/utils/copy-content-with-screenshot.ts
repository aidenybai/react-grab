import { REACT_GRAB_MIME_TYPE, WEB_REACT_GRAB_MIME_TYPE } from "../constants.js";
import type { ReactGrabEntry } from "../types.js";
import { buildReactGrabMetadata } from "./build-react-grab-metadata.js";
import { escapeHtml } from "./escape-html.js";
import { IS_DEMO } from "./runtime-mode.js";

const buildClipboardItemData = (
  content: string,
  entries: ReactGrabEntry[],
  pngBlob: Promise<Blob> | null,
  withCustomFormat: boolean,
): Record<string, Blob | Promise<Blob>> => {
  const clipboardItemData: Record<string, Blob | Promise<Blob>> = {
    "text/plain": new Blob([content], { type: "text/plain" }),
    "text/html": new Blob(
      [`<meta charset='utf-8'><pre><code>${escapeHtml(content)}</code></pre>`],
      { type: "text/html" },
    ),
  };
  if (pngBlob) {
    clipboardItemData["image/png"] = pngBlob;
  }
  if (withCustomFormat) {
    clipboardItemData[WEB_REACT_GRAB_MIME_TYPE] = new Blob(
      [JSON.stringify(buildReactGrabMetadata(content, entries))],
      { type: REACT_GRAB_MIME_TYPE },
    );
  }
  return clipboardItemData;
};

export const copyContentWithScreenshot = async (
  content: string,
  entries: ReactGrabEntry[],
  createPngBlob: () => Promise<Blob>,
): Promise<boolean> => {
  if (IS_DEMO) return true;
  if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) return false;

  // The ClipboardItem is constructed before any await so the clipboard write
  // stays inside the user activation window while the capture pipeline runs.
  const pngBlob = createPngBlob();
  pngBlob.catch(() => undefined);

  // Retries drop the parts that engines can individually reject: the "web "
  // custom format first, then a failed screenshot capture, so text always lands.
  const attempts: Array<[Promise<Blob> | null, boolean]> = [
    [pngBlob, true],
    [pngBlob, false],
    [null, true],
    [null, false],
  ];
  for (const [attemptPngBlob, withCustomFormat] of attempts) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem(
          buildClipboardItemData(content, entries, attemptPngBlob, withCustomFormat),
        ),
      ]);
      return true;
    } catch {}
  }
  return false;
};
