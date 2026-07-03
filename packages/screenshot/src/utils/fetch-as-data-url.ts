import { blobToDataUrl } from "./blob-to-data-url";

export const fetchAsDataUrl = async (url: string, timeoutMs: number): Promise<string | null> => {
  const abortController = new AbortController();
  const abortTimeoutId = setTimeout(() => abortController.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      mode: "cors",
      cache: "force-cache",
      signal: abortController.signal,
    });
    if (!response.ok) return null;
    const responseBlob = await response.blob();
    return await blobToDataUrl(responseBlob);
  } catch {
    return null;
  } finally {
    clearTimeout(abortTimeoutId);
  }
};
