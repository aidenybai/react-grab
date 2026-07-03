export const resolveUrl = (url: string, baseUrl: string | null): string => {
  try {
    return new URL(url, baseUrl ?? undefined).href;
  } catch {
    return url;
  }
};
