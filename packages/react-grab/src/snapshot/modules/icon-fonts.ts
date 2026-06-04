import { cache } from "../core/cache.js";
import type { SnapshotIconFontMatcher, SnapshotIconImageResult } from "../types.js";

interface IconFontPick {
  url: string;
  alias: string;
}

interface LigatureCanvasFont {
  familyForMeasure: string;
  familyForCanvas: string;
}

interface MaterialIconToImageOptions {
  family?: string;
  weight?: string | number;
  fontSize?: number;
  color?: string;
  variation?: string;
  className?: string;
}

const defaultIconFonts: RegExp[] = [
  /font\s*awesome/i,
  /material\s*icons/i,
  /ionicons/i,
  /glyphicons/i,
  /feather/i,
  /bootstrap\s*icons/i,
  /remix\s*icons/i,
  /heroicons/i,
  /layui/i,
  /lucide/i,
];

export const ICON_FONT_URLS: Record<string, string> = Object.assign(
  {
    materialIconsFilled:
      "https://fonts.gstatic.com/s/materialicons/v48/flUhRq6tzZclQEJ-Vdg-IuiaDsNcIhQ8tQ.woff2",
    materialIconsOutlined:
      "https://fonts.gstatic.com/s/materialiconsoutlined/v110/gok-H7zzDkdnRel8-DQ6KAXJ69wP1tGnf4ZGhUcel5euIg.woff2",
    materialIconsRound:
      "https://fonts.gstatic.com/s/materialiconsround/v109/LDItaoyNOAY6Uewc665JcIzCKsKc_M9flwmPq_HTTw.woff2",
    materialIconsSharp:
      "https://fonts.gstatic.com/s/materialiconssharp/v110/oPWQ_lt5nv4pWNJpghLP75WiFR4kLh3kvmvRImcycg.woff2",
  },
  (typeof window !== "undefined" &&
    (window as Window & { __SNAPSHOT_ICON_FONTS__?: Record<string, string> })
      .__SNAPSHOT_ICON_FONTS__) ||
    {},
);

const userIconFonts: RegExp[] = [];

const escapeRegExp = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

export const extendIconFonts = (
  fonts: SnapshotIconFontMatcher | SnapshotIconFontMatcher[],
): void => {
  const list = Array.isArray(fonts) ? fonts : [fonts];
  for (const f of list) {
    if (f instanceof RegExp) userIconFonts.push(f);
    else if (typeof f === "string") userIconFonts.push(new RegExp(escapeRegExp(f), "i"));
    else console.warn("[snapshot] Ignored invalid iconFont value:", f);
  }
};

export const isIconFont = (input: unknown): boolean => {
  const text = typeof input === "string" ? input : "";
  const candidates = [...defaultIconFonts, ...userIconFonts];
  for (const rx of candidates) {
    if (rx instanceof RegExp && rx.test(text)) return true;
  }
  if (
    /icon/i.test(text) ||
    /glyph/i.test(text) ||
    /symbols/i.test(text) ||
    /feather/i.test(text) ||
    /fontawesome/i.test(text)
  )
    return true;
  return false;
};

const isMaterialFamily = (family: string = ""): boolean => {
  const s = String(family).toLowerCase();
  return /\bmaterial\s*icons\b/.test(s) || /\bmaterial\s*symbols\b/.test(s);
};

const loadedCanvasFamilies = new Map<string, boolean>();

const parseAxes = (variation: string = ""): Record<string, number> => {
  const out: Record<string, number> = Object.create(null);
  const v = String(variation || "");
  const rx = /['"]?\s*([A-Za-z]{3,4})\s*['"]?\s*([+-]?\d+(?:\.\d+)?)\s*/g;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(v))) out[m[1].toUpperCase()] = Number(m[2]);
  return out;
};

const ensureLigatureCanvasFont = async (
  cssFamily: string,
  className: string,
  axes: Record<string, number>,
): Promise<LigatureCanvasFont> => {
  const fam = String(cssFamily || "");
  const lowerFam = fam.toLowerCase();
  const cls = String(className || "").toLowerCase();

  if (/\bmaterial\s*icons\b/.test(lowerFam) && !/\bsymbols\b/.test(lowerFam)) {
    return { familyForMeasure: fam, familyForCanvas: fam };
  }

  const isSymbols = /\bmaterial\s*symbols\b/.test(lowerFam);
  if (!isSymbols) {
    return { familyForMeasure: fam, familyForCanvas: fam };
  }

  const FILL = axes && (axes.FILL ?? axes.fill);
  let style = "outlined";
  if (/\brounded\b/.test(cls) || /\bround\b/.test(cls)) style = "rounded";
  else if (/\bsharp\b/.test(cls)) style = "sharp";
  else if (/\boutlined\b/.test(cls)) style = "outlined";

  const filled = FILL === 1;

  let pick: IconFontPick | null = null;
  if (filled) {
    if (style === "outlined" && ICON_FONT_URLS.materialIconsFilled) {
      pick = { url: ICON_FONT_URLS.materialIconsFilled, alias: "snapshot-mi-filled" };
    } else if (style === "rounded" && ICON_FONT_URLS.materialIconsRound) {
      pick = { url: ICON_FONT_URLS.materialIconsRound, alias: "snapshot-mi-round" };
    } else if (style === "sharp" && ICON_FONT_URLS.materialIconsSharp) {
      pick = { url: ICON_FONT_URLS.materialIconsSharp, alias: "snapshot-mi-sharp" };
    }
  }

  if (!pick) {
    return { familyForMeasure: fam, familyForCanvas: fam };
  }

  if (!loadedCanvasFamilies.has(pick.alias)) {
    try {
      const ff = new FontFace(pick.alias, `url(${pick.url})`, { style: "normal", weight: "400" });
      document.fonts.add(ff);
      await ff.load();
      loadedCanvasFamilies.set(pick.alias, true);
    } catch {
      return { familyForMeasure: fam, familyForCanvas: fam };
    }
  }

  const quoted = `"${pick.alias}"`;
  return { familyForMeasure: quoted, familyForCanvas: quoted };
};

const ensureMaterialFontsReady = async (
  family: string = "Material Icons",
  px: number = 24,
): Promise<void> => {
  try {
    await Promise.all([
      document.fonts.load(`400 ${px}px "${String(family).replace(/["']/g, "")}"`),
      document.fonts.ready,
    ]);
  } catch {}
};

const resolvePaintColor = (cs: CSSStyleDeclaration): string => {
  const fill = cs.getPropertyValue("-webkit-text-fill-color")?.trim() || "";
  const isTransparent =
    /^transparent$/i.test(fill) || /rgba?\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)/i.test(fill);
  if (fill && !isTransparent && fill.toLowerCase() !== "currentcolor") return fill;
  const c = cs.color?.trim();
  return c && c !== "inherit" ? c : "#000";
};

const materialIconToImage = async (
  ligatureText: string,
  {
    family = "Material Icons",
    weight = "normal",
    fontSize = 32,
    color = "#000",
    variation = "",
    className = "",
  }: MaterialIconToImageOptions = {},
): Promise<SnapshotIconImageResult> => {
  const fam = String(family || "").replace(/^['"]+|['"]+$/g, "");
  const dpr = window.devicePixelRatio || 1;
  const axes = parseAxes(variation);

  const { familyForMeasure, familyForCanvas } = await ensureLigatureCanvasFont(
    fam,
    className,
    axes,
  );

  await ensureMaterialFontsReady(familyForCanvas.replace(/^["']+|["']+$/g, ""), fontSize);

  const span = document.createElement("span");
  span.textContent = ligatureText;
  span.style.position = "absolute";
  span.style.visibility = "hidden";
  span.style.left = "-99999px";
  span.style.whiteSpace = "nowrap";
  span.style.fontFamily = familyForMeasure;
  span.style.fontWeight = String(weight || "normal");
  span.style.fontSize = `${fontSize}px`;
  span.style.lineHeight = "1";
  span.style.margin = "0";
  span.style.padding = "0";
  span.style.fontFeatureSettings = "'liga' 1";
  span.style.fontVariantLigatures = "normal";
  span.style.color = color;

  document.body.appendChild(span);
  const rect = span.getBoundingClientRect();
  const width = Math.max(1, Math.ceil(rect.width));
  const height = Math.max(1, Math.ceil(rect.height));
  document.body.removeChild(span);

  const canvas = document.createElement("canvas");
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("[snapshot] Failed to acquire 2D canvas context");
  ctx.scale(dpr, dpr);
  ctx.font = `${weight ? `${weight} ` : ""}${fontSize}px ${familyForCanvas}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = color;
  try {
    ctx.fontKerning = "normal";
  } catch {}
  ctx.fillText(ligatureText, 0, 0);

  return {
    dataUrl: canvas.toDataURL(),
    width,
    height,
  };
};

export const ligatureIconToImage = async (
  cloneRoot: Element,
  sourceRoot: Element,
): Promise<number> => {
  if (!(cloneRoot instanceof Element)) return 0;

  const selector = '.material-icons, [class*="material-symbols"]';

  const cloneNodes = Array.from(cloneRoot.querySelectorAll(selector)).filter(
    (n) => n && n.textContent && n.textContent.trim(),
  );

  if (cloneNodes.length === 0) return 0;

  const nodeMap = cache.session.nodeMap;
  const sourceNodes =
    sourceRoot instanceof Element
      ? Array.from(sourceRoot.querySelectorAll(selector)).filter(
          (n) => n && n.textContent && n.textContent.trim(),
        )
      : [];

  let replaced = 0;

  for (let i = 0; i < cloneNodes.length; i++) {
    const el = cloneNodes[i];
    const src = ((nodeMap && nodeMap.get(el)) || sourceNodes[i] || null) as Element | null;

    try {
      const cs = src ? getComputedStyle(src) : getComputedStyle(el);
      const family = cs.fontFamily || "Material Icons";
      if (!isMaterialFamily(family)) continue;

      const text = (src || el).textContent?.trim();
      if (!text) continue;

      const size = parseInt(cs.fontSize, 10) || 24;
      const weight = cs.fontWeight && cs.fontWeight !== "normal" ? cs.fontWeight : "normal";
      const color = resolvePaintColor(cs);
      const variation =
        cs.fontVariationSettings && cs.fontVariationSettings !== "normal"
          ? cs.fontVariationSettings
          : "";
      const className = ((src || el) as HTMLElement).className || "";

      const { dataUrl, width, height } = await materialIconToImage(text, {
        family,
        weight,
        fontSize: size,
        color,
        variation,
        className,
      });

      el.textContent = "";
      const img = el.ownerDocument.createElement("img");
      img.src = dataUrl;
      img.alt = text;
      img.style.height = `${size}px`;
      img.style.width = `${Math.max(1, Math.round((width / height) * size))}px`;
      img.style.objectFit = "contain";
      img.style.verticalAlign = getComputedStyle(el).verticalAlign || "baseline";
      el.appendChild(img);

      replaced++;
    } catch {}
  }

  return replaced;
};
