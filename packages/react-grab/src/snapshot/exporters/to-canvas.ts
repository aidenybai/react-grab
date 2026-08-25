import { isSafari } from "../utils/browser.js";
import type { SnapshotCaptureContext, SnapshotImageMeta } from "../types.js";

const MAX_RASTER_SIDE = 16384;
const MAX_RASTER_AREA = 16384 * 16384;

const clampSvgRasterSize = (url: string): string => {
  if (!isSvgDataURL(url)) return url;
  try {
    const svg = decodeSvgFromDataURL(url);
    const head = svg.match(/<svg\b[^>]*>/i);
    if (!head) return url;
    const tag = head[0];
    const w = parseFloat((tag.match(/\bwidth="([\d.]+)/i) || [])[1]);
    const h = parseFloat((tag.match(/\bheight="([\d.]+)/i) || [])[1]);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return url;
    const scaleFactor = Math.min(
      1,
      MAX_RASTER_SIDE / w,
      MAX_RASTER_SIDE / h,
      Math.sqrt(MAX_RASTER_AREA / (w * h)),
    );
    if (scaleFactor >= 1) return url;
    const cappedWidth = Math.max(1, Math.floor(w * scaleFactor));
    const cappedHeight = Math.max(1, Math.floor(h * scaleFactor));
    console.warn(
      `[snapshot] Capture ${Math.round(w)}×${Math.round(h)}px exceeds the browser image-decode ` +
        `limit (${MAX_RASTER_SIDE}px/side); downscaling to ${cappedWidth}×${cappedHeight}px. Lower \`scale\` or set ` +
        "`width`/`height` to control output size.",
    );
    const fixed = svg.replace(
      tag,
      tag
        .replace(/(\bwidth=")[\d.]+/i, `$1${cappedWidth}`)
        .replace(/(\bheight=")[\d.]+/i, `$1${cappedHeight}`),
    );
    return encodeSvgToDataURL(fixed);
  } catch {
    return url;
  }
};

const isSvgDataURL = (u: string): boolean =>
  typeof u === "string" && /^data:image\/svg\+xml/i.test(u);

const decodeSvgFromDataURL = (u: string): string => {
  const i = u.indexOf(",");
  return i >= 0 ? decodeURIComponent(u.slice(i + 1)) : "";
};

const encodeSvgToDataURL = (svgText: string): string =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;

const splitDecls = (s: string): string[] => {
  const parts: string[] = [];
  let buf = "";
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "(") depth++;
    if (ch === ")") depth = Math.max(0, depth - 1);
    if (ch === ";" && depth === 0) {
      parts.push(buf);
      buf = "";
    } else buf += ch;
  }
  if (buf.trim()) parts.push(buf);
  return parts.map((x) => x.trim()).filter(Boolean);
};

const boxShadowToDropShadow = (value: string): string => {
  const layers: string[] = [];
  let buf = "";
  let depth = 0;
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (ch === "(") depth++;
    if (ch === ")") depth = Math.max(0, depth - 1);
    if (ch === "," && depth === 0) {
      layers.push(buf.trim());
      buf = "";
    } else buf += ch;
  }
  if (buf.trim()) layers.push(buf.trim());

  const fns: string[] = [];
  for (const layer of layers) {
    if (/\binset\b/i.test(layer)) continue;
    const nums = layer.match(/-?\d+(?:\.\d+)?px/gi) || [];
    const [ox = "0px", oy = "0px", blur = "0px"] = nums;
    const color = layer
      .replace(/-?\d+(?:\.\d+)?px/gi, "")
      .replace(/\binset\b/gi, "")
      .trim()
      .replace(/\s{2,}/g, " ");
    const hasColor = Boolean(color) && color !== ",";
    fns.push(`drop-shadow(${ox} ${oy} ${blur}${hasColor ? ` ${color}` : ""})`);
  }
  return fns.join(" ");
};

const rewriteDeclList = (list: string): string => {
  const decls = splitDecls(list);
  let filter: string | null = null;
  let wfilter: string | null = null;
  let box: string | null = null;
  const rest: Array<[string, string]> = [];
  for (const declaration of decls) {
    const idx = declaration.indexOf(":");
    if (idx < 0) continue;
    const prop = declaration.slice(0, idx).trim().toLowerCase();
    const val = declaration.slice(idx + 1).trim();
    if (prop === "box-shadow") box = val;
    else if (prop === "filter") filter = val;
    else if (prop === "-webkit-filter") wfilter = val;
    else rest.push([prop, val]);
  }
  if (box) {
    const ds = boxShadowToDropShadow(box);
    if (ds) {
      filter = filter ? `${filter} ${ds}` : ds;
      wfilter = wfilter ? `${wfilter} ${ds}` : ds;
    }
  }
  const out: Array<[string, string]> = [...rest];
  if (filter) out.push(["filter", filter]);
  if (wfilter) out.push(["-webkit-filter", wfilter]);
  return out.map(([key, value]) => `${key}:${value}`).join(";");
};

const rewriteCssBlock = (css: string): string =>
  css.replace(
    /([^{}]+)\{([^}]*)\}/g,
    (_m: string, sel: string, body: string) => `${sel}{${rewriteDeclList(body)}}`,
  );

const rewriteSvgBoxShadowToDropShadow = (svgText: string): string => {
  let result = svgText.replace(
    /<style[^>]*>([\s\S]*?)<\/style>/gi,
    (matched: string, css: string) => matched.replace(css, rewriteCssBlock(css)),
  );
  result = result.replace(
    /style=(['"])([\s\S]*?)\1/gi,
    (_matched: string, quote: string, body: string) =>
      `style=${quote}${rewriteDeclList(body)}${quote}`,
  );
  return result;
};

const maybeConvertBoxShadowForSafari = (url: string): string => {
  if (!isSafari() || !isSvgDataURL(url)) return url;
  try {
    const svg = decodeSvgFromDataURL(url);
    const fixed = rewriteSvgBoxShadowToDropShadow(svg);
    return encodeSvgToDataURL(fixed);
  } catch {
    return url;
  }
};

export const toCanvas = async (
  url: string,
  options: SnapshotCaptureContext,
): Promise<HTMLCanvasElement> => {
  const { width: optW, height: optH, scale = 1, dpr = 1, backgroundColor } = options;
  const meta = (options.meta ?? {}) as SnapshotImageMeta;
  url = maybeConvertBoxShadowForSafari(url);
  url = clampSvgRasterSize(url);

  const img = new Image();
  img.loading = "eager";
  img.decoding = "sync";
  img.crossOrigin = "anonymous";
  img.src = url;
  await img.decode();

  if (isSafari()) {
    img.style.cssText = "position:fixed;left:-99999px;top:-99999px;pointer-events:none";
    document.body.appendChild(img);
    try {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
    } finally {
      try {
        img.remove();
      } catch {}
    }
  }

  const natW = img.naturalWidth;
  const natH = img.naturalHeight;

  const refW = Number.isFinite(meta.w0) ? meta.w0! : natW;
  const refH = Number.isFinite(meta.h0) ? meta.h0! : natH;

  let outW: number;
  let outH: number;
  const hasW = Number.isFinite(optW);
  const hasH = Number.isFinite(optH);

  if (hasW && hasH) {
    outW = Math.max(1, optW!);
    outH = Math.max(1, optH!);
  } else if (hasW) {
    const k = optW! / Math.max(1, refW);
    outW = optW!;
    outH = refH * k;
  } else if (hasH) {
    const k = optH! / Math.max(1, refH);
    outH = optH!;
    outW = refW * k;
  } else {
    outW = natW;
    outH = natH;
  }

  outW = outW * scale;
  outH = outH * scale;

  const devW = outW * dpr;
  const devH = outH * dpr;
  const over = Math.max(
    devW / MAX_RASTER_SIDE,
    devH / MAX_RASTER_SIDE,
    Math.sqrt((devW * devH) / MAX_RASTER_AREA),
  );
  if (over > 1) {
    console.warn(
      `[snapshot] Output ${Math.round(devW)}×${Math.round(devH)}px exceeds the browser canvas ` +
        `limit (${MAX_RASTER_SIDE}px/side); downscaling. Lower \`scale\`/\`dpr\` or set \`width\`/\`height\`.`,
    );
    outW /= over;
    outH /= over;
  }

  const canvas = document.createElement("canvas");
  canvas.width = outW * dpr;
  canvas.height = outH * dpr;
  canvas.style.width = `${outW}px`;
  canvas.style.height = `${outH}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("[snapshot] Could not acquire a 2D canvas context");
  if (dpr !== 1) ctx.scale(dpr, dpr);

  if (backgroundColor) {
    ctx.save();
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, outW, outH);
    ctx.restore();
  }

  ctx.drawImage(img, 0, 0, outW, outH);
  return canvas;
};
