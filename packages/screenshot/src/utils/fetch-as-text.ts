export const fetchAsText = async (url: string, timeoutMs: number): Promise<string | null> => {
  const abortController = new AbortController();
  const abortTimeoutId = setTimeout(() => abortController.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      mode: "cors",
      cache: "force-cache",
      signal: abortController.signal,
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  } finally {
    clearTimeout(abortTimeoutId);
  }
};
