export const formatContentWithSourceUrl = (content: string, url: string | undefined): string =>
  url ? `${content}\n  at ${url}` : content;
