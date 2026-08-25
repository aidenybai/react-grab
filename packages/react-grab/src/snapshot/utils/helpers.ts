export const extractURL = (value: string): string | null => {
  const match = value.match(/url\((['"]?)(.*?)(\1)\)/);
  if (!match) return null;

  const url = match[2].trim();
  if (url.startsWith("#")) return null;
  return url;
};

export const stripTranslate = (transform: string): string => {
  if (!transform || transform === "none") return "";

  let cleaned = transform.replace(/translate[XY]?\([^)]*\)/g, "");

  cleaned = cleaned.replace(/matrix\(([^)]+)\)/g, (_: string, values: string) => {
    const parts = values.split(",").map((s) => s.trim());
    if (parts.length !== 6) return `matrix(${values})`;
    parts[4] = "0";
    parts[5] = "0";
    return `matrix(${parts.join(", ")})`;
  });

  cleaned = cleaned.replace(/matrix3d\(([^)]+)\)/g, (_: string, values: string) => {
    const parts = values.split(",").map((s) => s.trim());
    if (parts.length !== 16) return `matrix3d(${values})`;
    parts[12] = "0";
    parts[13] = "0";
    return `matrix3d(${parts.join(", ")})`;
  });

  return cleaned.trim().replace(/\s{2,}/g, " ");
};

export const safeEncodeURI = (uri: string): string => {
  if (/%[0-9A-Fa-f]{2}/.test(uri)) return uri;
  try {
    return encodeURI(uri);
  } catch {
    return uri;
  }
};

export const resolveURL = (url: string, base?: string): string => {
  if (!url || /^(data|blob|about|#)/i.test(url.trim())) return url;
  try {
    const b =
      base ||
      (typeof document !== "undefined" && (document.baseURI || document.location?.href)) ||
      "http://localhost/";
    return new URL(url, b).href;
  } catch {
    return url;
  }
};
