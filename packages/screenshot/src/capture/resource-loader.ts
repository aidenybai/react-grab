import { RESOURCE_CACHE_CAP } from "../constants";
import { createFifoCache } from "../utils/create-fifo-cache";
import { fetchAsDataUrl } from "../utils/fetch-as-data-url";

const resolvedDataUrlCache = createFifoCache<string>(RESOURCE_CACHE_CAP);
const inflightRequests = new Map<string, Promise<string | null>>();

export const loadResourceAsDataUrl = (url: string, timeoutMs: number): Promise<string | null> => {
  const cachedDataUrl = resolvedDataUrlCache.get(url);
  if (cachedDataUrl !== undefined) return Promise.resolve(cachedDataUrl);
  const inflightRequestKey = `${timeoutMs}:${url}`;
  const inflightRequest = inflightRequests.get(inflightRequestKey);
  if (inflightRequest) return inflightRequest;
  const request = fetchAsDataUrl(url, timeoutMs).then((dataUrl) => {
    inflightRequests.delete(inflightRequestKey);
    if (dataUrl !== null) resolvedDataUrlCache.set(url, dataUrl);
    return dataUrl;
  });
  inflightRequests.set(inflightRequestKey, request);
  return request;
};
