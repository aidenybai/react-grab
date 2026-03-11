let cachedNextBasePath: string | undefined;

// Next.js does not expose basePath at runtime (it is a build-time define via
// process.env.__NEXT_ROUTER_BASEPATH that only compiled app code can access).
// We detect it the same way Next.js's own asset-prefix.ts does: find a script
// whose src contains "/_next/" and extract the path prefix before that marker.
// When basePath is "/app", scripts load from "/app/_next/…", so the prefix is
// "/app". When unset, scripts load from "/_next/…" (index 0) → empty string.
export const getNextBasePath = (): string => {
  if (cachedNextBasePath !== undefined) return cachedNextBasePath;
  const source = document.querySelector<HTMLScriptElement>(
    'script[src*="/_next/"]',
  )?.src;
  const pathname = source ? new URL(source).pathname : "";
  const assetPathIndex = pathname.indexOf("/_next/");
  cachedNextBasePath =
    assetPathIndex > 0 ? pathname.slice(0, assetPathIndex) : "";
  return cachedNextBasePath;
};
