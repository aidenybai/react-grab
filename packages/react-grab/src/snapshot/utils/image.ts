import { cache } from "../core/cache.js";
import { extractURL, safeEncodeURI, resolveURL } from "./helpers.js";
import { snapFetch } from "../modules/snap-fetch.js";

export const inlineSingleBackgroundEntry = async (
  entry: string,
  options: { useProxy?: string } = {},
): Promise<string> => {
  const isGradient = /^((repeating-)?(linear|radial|conic)-gradient)\(/i.test(entry);
  if (isGradient || entry.trim() === "none") {
    return entry;
  }
  const rawUrl = extractURL(entry);
  if (!rawUrl) {
    return entry;
  }
  const absoluteUrl = resolveURL(rawUrl);
  const encodedUrl = safeEncodeURI(absoluteUrl);
  const cacheKey = (options.useProxy || "") + "|" + encodedUrl;
  if (cache.background.has(cacheKey)) {
    const dataUrl = cache.background.get(cacheKey);
    return dataUrl ? `url("${dataUrl}")` : "none";
  }
  try {
    const dataUrl = await snapFetch(encodedUrl, { as: "dataURL", useProxy: options.useProxy });
    if (dataUrl.ok && typeof dataUrl.data === "string") {
      cache.background.set(cacheKey, dataUrl.data);
      return `url("${dataUrl.data}")`;
    }
    cache.background.set(cacheKey, null);
    return "none";
  } catch {
    cache.background.set(cacheKey, null);
    return "none";
  }
};
