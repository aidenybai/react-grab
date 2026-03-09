export function buildQueryString(
  params: Record<string, string | number | boolean | undefined>,
): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  }
  const qs = searchParams.toString();
  return qs ? `?${qs}` : "";
}

export function parseQueryString(search: string): Record<string, string> {
  const params = new URLSearchParams(search);
  const result: Record<string, string> = {};
  params.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

export function updateQueryParam(
  url: string,
  key: string,
  value: string | null,
): string {
  const urlObj = new URL(url, "https://placeholder.com");
  if (value === null) {
    urlObj.searchParams.delete(key);
  } else {
    urlObj.searchParams.set(key, value);
  }
  return `${urlObj.pathname}${urlObj.search}`;
}

export function isExternalUrl(url: string): boolean {
  return /^https?:\/\//.test(url);
}

export function getPathSegments(pathname: string): string[] {
  return pathname.split("/").filter(Boolean);
}

export function joinPath(...segments: string[]): string {
  return (
    "/" +
    segments
      .map((s) => s.replace(/^\/|\/$/g, ""))
      .filter(Boolean)
      .join("/")
  );
}

export function getBasePath(pathname: string): string {
  const segments = getPathSegments(pathname);
  return segments.length > 0 ? `/${segments[0]}` : "/";
}

export function matchRoute(pattern: string, pathname: string): boolean {
  const patternParts = pattern.split("/").filter(Boolean);
  const pathParts = pathname.split("/").filter(Boolean);
  if (patternParts.length !== pathParts.length) return false;
  return patternParts.every((part, i) =>
    part.startsWith("[") && part.endsWith("]") ? true : part === pathParts[i],
  );
}
