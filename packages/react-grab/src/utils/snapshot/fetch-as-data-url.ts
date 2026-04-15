import { SNAPSHOT_FETCH_TIMEOUT_MS } from "../../constants.js";

const readBlobAsDataUrl = async (blob: Blob): Promise<string | null> =>
  new Promise<string | null>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrlResult = reader.result;
      resolve(typeof dataUrlResult === "string" ? dataUrlResult : null);
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });

export const fetchAsDataUrl = async (sourceUrl: string): Promise<string | null> => {
  if (!sourceUrl || sourceUrl.startsWith("data:")) return sourceUrl;

  try {
    if (sourceUrl.startsWith("blob:")) {
      const response = await fetch(sourceUrl);
      if (!response.ok) return null;
      return await readBlobAsDataUrl(await response.blob());
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SNAPSHOT_FETCH_TIMEOUT_MS);

    const response = await fetch(sourceUrl, {
      signal: controller.signal,
      mode: "cors",
      credentials: "omit",
    });

    clearTimeout(timeoutId);

    if (!response.ok) return null;

    return await readBlobAsDataUrl(await response.blob());
  } catch {
    return null;
  }
};
