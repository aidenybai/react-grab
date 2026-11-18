import { snapFetch } from "./snap-fetch.js";
import type { SnapshotCaptureContext } from "../types.js";

const XLINK_NS = "http://www.w3.org/1999/xlink";

const getSvgImageHref = (el: Element): string | null => {
  return (
    el.getAttribute("href") ||
    el.getAttribute("xlink:href") ||
    (typeof el.getAttributeNS === "function" ? el.getAttributeNS(XLINK_NS, "href") : null)
  );
};

const extractImageDimensions = (img: HTMLImageElement): { width: number; height: number } => {
  const dsW = parseInt(img.dataset?.snapshotWidth || "", 10) || 0;
  const dsH = parseInt(img.dataset?.snapshotHeight || "", 10) || 0;
  const attrW = parseInt(img.getAttribute("width") || "", 10) || 0;
  const attrH = parseInt(img.getAttribute("height") || "", 10) || 0;
  const styleW = parseFloat(img.style?.width || "") || 0;
  const styleH = parseFloat(img.style?.height || "") || 0;

  const w = dsW || styleW || attrW || img.width || img.naturalWidth || 100;
  const h = dsH || styleH || attrH || img.height || img.naturalHeight || 100;

  return { width: w, height: h };
};

export const inlineImages = async (
  clone: Element,
  options: SnapshotCaptureContext = {},
): Promise<void> => {
  const imgs = Array.from(clone.querySelectorAll("img"));
  const processImg = async (img: HTMLImageElement): Promise<void> => {
    if (!img.getAttribute("src")) {
      const eff = img.currentSrc || img.src || "";
      if (eff) img.setAttribute("src", eff);
    }

    img.removeAttribute("srcset");
    img.removeAttribute("sizes");

    const src = img.src || "";
    if (!src) return;

    const r = await snapFetch(src, { as: "dataURL", useProxy: options.useProxy });
    if (r.ok && typeof r.data === "string" && r.data.startsWith("data:")) {
      img.src = r.data;
      if (!img.width) img.width = img.naturalWidth || 100;
      if (!img.height) img.height = img.naturalHeight || 100;
      return;
    }
    const { width: fbW, height: fbH } = extractImageDimensions(img);
    const { fallbackURL } = options || {};
    if (fallbackURL) {
      try {
        const dimensions = { width: fbW, height: fbH, src, element: img };
        const fallbackUrl =
          typeof fallbackURL === "function" ? await fallbackURL(dimensions) : fallbackURL;

        if (fallbackUrl) {
          const fallbackData = await snapFetch(fallbackUrl, {
            as: "dataURL",
            useProxy: options.useProxy,
          });
          if (fallbackData?.ok && typeof fallbackData.data === "string") {
            img.src = fallbackData.data;
            if (!img.width) img.width = fbW;
            if (!img.height) img.height = fbH;
            return;
          }
        }
      } catch {}
    }

    if (options.placeholders !== false) {
      const fallback = document.createElement("div");
      fallback.style.cssText = [
        `width:${fbW}px`,
        `height:${fbH}px`,
        "background:#ccc",
        "display:inline-block",
        "text-align:center",
        `line-height:${fbH}px`,
        "color:#666",
        "font-size:12px",
        "overflow:hidden",
      ].join(";");
      fallback.textContent = "img";
      img.replaceWith(fallback);
    } else {
      const spacer = document.createElement("div");
      spacer.style.cssText = `display:inline-block;width:${fbW}px;height:${fbH}px;visibility:hidden;`;
      img.replaceWith(spacer);
    }
  };

  const BATCH = 6;
  for (let i = 0; i < imgs.length; i += BATCH) {
    const group = imgs.slice(i, i + BATCH).map(processImg);
    await Promise.allSettled(group);
  }

  const svgImages = Array.from(clone.querySelectorAll("image"));
  const processSvgImage = async (el: SVGImageElement): Promise<void> => {
    const href = getSvgImageHref(el);
    if (!href || href.startsWith("data:") || href.startsWith("blob:")) return;

    const r = await snapFetch(href, { as: "dataURL", useProxy: options.useProxy });
    if (r.ok && typeof r.data === "string" && r.data.startsWith("data:")) {
      el.setAttribute("href", r.data);
      el.removeAttribute("xlink:href");
      if (typeof el.removeAttributeNS === "function") el.removeAttributeNS(XLINK_NS, "href");
    }
  };
  for (let i = 0; i < svgImages.length; i += BATCH) {
    const group = svgImages.slice(i, i + BATCH).map(processSvgImage);
    await Promise.allSettled(group);
  }
};
