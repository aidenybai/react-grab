export interface RequiredVariant {
  w: number;
  s: string;
  st: number;
}

export interface FontMinMax {
  min: number;
  max: number;
}

export interface StyleSpec {
  kind: "normal" | "italic" | "oblique";
}

export const normalizeUrl = (url: string, base: string): string => {
  try {
    return new URL(url, base || location.href).href;
  } catch {
    return url;
  }
};

const GENERIC_FAMILIES = new Set<string>([
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "emoji",
  "math",
  "fangsong",
  "ui-serif",
  "ui-sans-serif",
  "ui-monospace",
  "ui-rounded",
]);

export const FONT_LIBRARIES: string[] = ["katex", "mathjax", "mathml"];

export const pickPrimaryFamily = (familyList: string): string => {
  if (!familyList) return "";
  for (const raw of familyList.split(",")) {
    const f = raw.trim().replace(/^['"]+|['"]+$/g, "");
    if (!f) continue;
    if (!GENERIC_FAMILIES.has(f.toLowerCase())) return f;
  }
  return "";
};

export const pickAllFamilies = (familyList: string): string[] => {
  if (!familyList) return [];
  const out: string[] = [];
  for (const raw of familyList.split(",")) {
    const f = raw.trim().replace(/^['"]+|['"]+$/g, "");
    if (!f) continue;
    if (!GENERIC_FAMILIES.has(f.toLowerCase())) out.push(f);
  }
  return out;
};

export const normWeight = (w: string | number): number => {
  const t = String(w ?? "400")
    .trim()
    .toLowerCase();
  if (t === "normal") return 400;
  if (t === "bold") return 700;
  const n = parseInt(t, 10);
  return Number.isFinite(n) ? Math.min(900, Math.max(100, n)) : 400;
};

export const normStyle = (s: string): "normal" | "italic" | "oblique" => {
  const t = String(s ?? "normal")
    .trim()
    .toLowerCase();
  if (t.startsWith("italic")) return "italic";
  if (t.startsWith("oblique")) return "oblique";
  return "normal";
};

export const normStretchPct = (st: string): number => {
  const m = String(st ?? "100%").match(/(\d+(?:\.\d+)?)\s*%/);
  return m ? Math.max(50, Math.min(200, parseFloat(m[1]))) : 100;
};

export const parseWeightSpec = (spec: string): FontMinMax => {
  const s = String(spec || "400").trim();
  const m = s.match(/^(\d{2,3})\s+(\d{2,3})$/);
  if (m) {
    const a = normWeight(m[1]),
      b = normWeight(m[2]);
    return { min: Math.min(a, b), max: Math.max(a, b) };
  }
  const v = normWeight(s);
  return { min: v, max: v };
};

export const parseStyleSpec = (spec: string): StyleSpec => {
  const t = String(spec || "normal")
    .trim()
    .toLowerCase();
  if (t === "italic") return { kind: "italic" };
  if (t.startsWith("oblique")) return { kind: "oblique" };
  return { kind: "normal" };
};

export const parseStretchSpec = (spec: string): FontMinMax => {
  const s = String(spec || "100%").trim();
  const mm = s.match(/(\d+(?:\.\d+)?)\s*%\s+(\d+(?:\.\d+)?)\s*%/);
  if (mm) {
    const a = parseFloat(mm[1]),
      b = parseFloat(mm[2]);
    return { min: Math.min(a, b), max: Math.max(a, b) };
  }
  const m = s.match(/(\d+(?:\.\d+)?)\s*%/);
  const v = m ? parseFloat(m[1]) : 100;
  return { min: v, max: v };
};

export const baseFamilyToken = (family: string): string => {
  if (!family || typeof family !== "string") return "";
  const base = family
    .replace(/\s+(variable|vf|v[0-9]+)$/i, "")
    .trim()
    .toLowerCase();
  return base.replace(/\s+/g, "-");
};

export const familiesFromRequired = (required: Set<string>): Set<string> => {
  const out = new Set<string>();
  for (const k of required || []) {
    const fam = String(k).split("__")[0]?.trim();
    if (fam) out.add(fam);
  }
  return out;
};

export const rewriteRelativeUrls = (cssText: string, baseHref: string): string => {
  if (!cssText) return cssText;
  return cssText.replace(
    /url\(\s*(['"]?)([^)'"]+)\1\s*\)/g,
    (m: string, q: string, u: string): string => {
      const src = (u || "").trim();
      if (!src || /^data:|^blob:|^https?:|^file:|^about:/i.test(src)) return m;
      let abs = src;
      try {
        abs = new URL(src, baseHref || location.href).href;
      } catch {}
      return `url("${abs}")`;
    },
  );
};
