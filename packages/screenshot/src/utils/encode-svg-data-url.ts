const DATA_URL_ESCAPES: Record<string, string> = {
  "%": "%25",
  "#": "%23",
  "\r": "%0D",
  "\n": "%0A",
  "\t": "%09",
};

// encodeURIComponent escapes every reserved and non-ASCII character, inflating
// multi-megabyte SVG markup ~60% and slowing both the string build and the
// URL decode before rasterization. Only characters the URL parser would
// misinterpret ('%', '#') or strip (tab, CR, LF) actually need escaping; the
// parser percent-encodes remaining non-ASCII code points itself.
export const encodeSvgDataUrl = (svgMarkup: string): string =>
  `data:image/svg+xml;charset=utf-8,${svgMarkup.replace(
    /[%#\r\n\t]/g,
    (matchedChar) => DATA_URL_ESCAPES[matchedChar],
  )}`;
