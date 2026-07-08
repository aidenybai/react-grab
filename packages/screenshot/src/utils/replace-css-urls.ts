const CSS_URL_PATTERN =
  /url\(\s*(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|([^'"()\s][^()]*?))\s*\)/g;

const unescapeCssString = (value: string): string => value.replace(/\\(.)/g, "$1");

const escapeCssString = (value: string): string => value.replace(/(["\\])/g, "\\$1");

const extractCssUrl = (urlMatch: RegExpMatchArray): string => {
  const unquotedUrl = urlMatch[3];
  if (unquotedUrl !== undefined) return unquotedUrl;
  return unescapeCssString(urlMatch[1] ?? urlMatch[2] ?? "");
};

export const replaceCssUrls = async (
  value: string,
  replaceUrl: (url: string) => Promise<string>,
): Promise<string> => {
  const matches = [...value.matchAll(CSS_URL_PATTERN)];
  if (matches.length === 0) return value;
  const replacements = await Promise.all(
    matches.map((urlMatch) => replaceUrl(extractCssUrl(urlMatch))),
  );
  let rewrittenValue = "";
  let sliceStartIndex = 0;
  matches.forEach((urlMatch, matchIndex) => {
    const matchIndexInValue = urlMatch.index ?? 0;
    rewrittenValue += `${value.slice(sliceStartIndex, matchIndexInValue)}url("${escapeCssString(replacements[matchIndex] ?? "")}")`;
    sliceStartIndex = matchIndexInValue + urlMatch[0].length;
  });
  rewrittenValue += value.slice(sliceStartIndex);
  return rewrittenValue;
};
