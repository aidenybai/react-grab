export const URL_RE = /url\((["']?)([^"')]+)\1\)/g;
export const FACE_RE = /@font-face[^{}]*\{[^}]*\}/g;

export const parseUnicodeRange = (ur: string): Array<[number, number]> => {
  if (!ur) return [];
  const ranges: Array<[number, number]> = [];
  const parts = ur
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const p of parts) {
    const m = p.match(/^U\+([0-9A-Fa-f?]+)(?:-([0-9A-Fa-f?]+))?$/);
    if (!m) continue;
    const a = m[1],
      b = m[2];
    const expand = (hex: string): number | [number, number] => {
      if (!hex.includes("?")) return parseInt(hex, 16);
      const min = parseInt(hex.replace(/\?/g, "0"), 16);
      const max = parseInt(hex.replace(/\?/g, "F"), 16);
      return [min, max];
    };
    if (b) {
      const A = expand(a),
        B = expand(b);
      const min = Array.isArray(A) ? A[0] : A;
      const max = Array.isArray(B) ? B[1] : B;
      ranges.push([Math.min(min, max), Math.max(min, max)]);
    } else {
      const X = expand(a);
      if (Array.isArray(X)) ranges.push([X[0], X[1]]);
      else ranges.push([X, X]);
    }
  }
  return ranges;
};

export const unicodeIntersects = (used: Set<number>, ranges: Array<[number, number]>): boolean => {
  if (!ranges.length) return true;
  if (!used || used.size === 0) return true;
  for (const cp of used) {
    for (const [a, b] of ranges) if (cp >= a && cp <= b) return true;
  }
  return false;
};

export const extractSrcUrls = (srcValue: string, baseHref: string): string[] => {
  const urls: string[] = [];
  if (!srcValue) return urls;
  for (const m of srcValue.matchAll(URL_RE)) {
    let u = (m[2] || "").trim();
    if (!u || u.startsWith("data:")) continue;
    if (!/^https?:/i.test(u)) {
      try {
        u = new URL(u, baseHref || location.href).href;
      } catch {}
    }
    urls.push(u);
  }
  return urls;
};

export const subsetFromRanges = (ranges: Array<[number, number]>): string | null => {
  if (!ranges.length) return null;
  const hit = (a: number, b: number): boolean => ranges.some(([x, y]) => !(y < a || x > b));
  const latin = hit(0x0000, 0x00ff) || hit(0x0131, 0x0131);
  const latinExt = hit(0x0100, 0x024f) || hit(0x1e00, 0x1eff);
  const greek = hit(0x0370, 0x03ff);
  const cyr = hit(0x0400, 0x04ff);
  const viet =
    hit(0x1ea0, 0x1ef9) || hit(0x0102, 0x0103) || hit(0x01a0, 0x01a1) || hit(0x01af, 0x01b0);
  if (viet) return "vietnamese";
  if (cyr) return "cyrillic";
  if (greek) return "greek";
  if (latinExt) return "latin-ext";
  if (latin) return "latin";
  return null;
};
