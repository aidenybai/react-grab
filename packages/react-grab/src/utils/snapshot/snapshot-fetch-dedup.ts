import { fetchAsDataUrl } from "./fetch-as-data-url.js";

const inflightRequests = new Map<string, Promise<string | null>>();

export const deduplicatedFetchAsDataUrl = async (sourceUrl: string): Promise<string | null> => {
  if (!sourceUrl || sourceUrl.startsWith("data:")) return sourceUrl;

  const existingRequest = inflightRequests.get(sourceUrl);
  if (existingRequest) return existingRequest;

  const requestPromise = fetchAsDataUrl(sourceUrl).finally(() => {
    inflightRequests.delete(sourceUrl);
  });

  inflightRequests.set(sourceUrl, requestPromise);
  return requestPromise;
};

export const clearInflightRequests = (): void => {
  inflightRequests.clear();
};
