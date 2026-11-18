import { getStyle, inlineSingleBackgroundEntry, splitBackgroundImage } from "../utils/index.js";
import type { SnapshotCaptureContext } from "../types.js";

export const inlineBackgroundImages = async (
  source: HTMLElement,
  clone: HTMLElement | undefined,
  styleCache: WeakMap<Element, CSSStyleDeclaration>,
  options: SnapshotCaptureContext = {},
): Promise<void> => {
  const queue: Array<[Element, HTMLElement | undefined]> = [[source, clone]];

  const URL_PROPS = [
    "background-image",

    "mask",
    "mask-image",
    "-webkit-mask",
    "-webkit-mask-image",

    "mask-source",
    "mask-box-image-source",
    "mask-border-source",
    "-webkit-mask-box-image-source",

    "border-image",
    "border-image-source",
  ];

  const MASK_LAYOUT_PROPS = [
    "mask-position",
    "mask-size",
    "mask-repeat",
    "mask-mode",
    "mask-composite",
    "-webkit-mask-position",
    "-webkit-mask-size",
    "-webkit-mask-repeat",
    "-webkit-mask-composite",
    "mask-origin",
    "mask-clip",
    "-webkit-mask-origin",
    "-webkit-mask-clip",
    "-webkit-mask-position-x",
    "-webkit-mask-position-y",
  ];
  const BG_LAYOUT_PROPS = [
    "background-position",
    "background-position-x",
    "background-position-y",
    "background-size",
    "background-repeat",
    "background-origin",
    "background-clip",
    "background-attachment",
    "background-blend-mode",
  ];
  const BORDER_AUX_PROPS = [
    "border-image-slice",
    "border-image-width",
    "border-image-outset",
    "border-image-repeat",
  ];

  while (queue.length) {
    const entry = queue.shift();
    if (!entry) continue;
    const [srcNode, cloneNode] = entry;

    if (!cloneNode) continue;

    const style = styleCache.get(srcNode) || getStyle(srcNode);
    if (!styleCache.has(srcNode)) styleCache.set(srcNode, style);
    const hasBorderImage = (() => {
      const bi = style.getPropertyValue("border-image");
      const bis = style.getPropertyValue("border-image-source");
      return (bi && bi !== "none") || (bis && bis !== "none");
    })();
    const bgImage = style.getPropertyValue("background-image");
    const bgColor = style.getPropertyValue("background-color");
    const hasBg =
      (bgImage && bgImage !== "none") ||
      (bgColor && bgColor !== "rgba(0, 0, 0, 0)" && bgColor !== "transparent") ||
      /url\s*\(|gradient\s*\(/i.test(style.getPropertyValue("background") || "");
    if (hasBg) {
      for (const prop of BG_LAYOUT_PROPS) {
        const v = style.getPropertyValue(prop);
        if (!v) continue;
        cloneNode.style.setProperty(prop, v);
      }
    }
    for (const prop of URL_PROPS) {
      let val = style.getPropertyValue(prop);
      if (prop === "background-image" && (!val || val === "none")) {
        const bgShorthand = style.getPropertyValue("background");
        if (bgShorthand && /url\s*\(/.test(bgShorthand)) {
          val =
            splitBackgroundImage(bgShorthand)
              .filter((p) => /url\s*\(/.test(p))
              .join(", ") || val;
        }
      }
      if (!val || val === "none") continue;

      const splits = splitBackgroundImage(val);

      const inlined = await Promise.all(
        splits.map((entry) => inlineSingleBackgroundEntry(entry, options)),
      );

      if (inlined.some((p) => p && p !== "none" && !/^url\(undefined/.test(p))) {
        cloneNode.style.setProperty(prop, inlined.join(", "));
      }
    }
    for (const prop of MASK_LAYOUT_PROPS) {
      const val = style.getPropertyValue(prop);
      if (!val || val === "initial") continue;
      cloneNode.style.setProperty(prop, val);
    }
    if (hasBorderImage) {
      for (const prop of BORDER_AUX_PROPS) {
        const val = style.getPropertyValue(prop);
        if (!val || val === "initial") continue;
        cloneNode.style.setProperty(prop, val);
      }
    }
    const sChildren = srcNode.shadowRoot
      ? Array.from(srcNode.shadowRoot.children).filter((el) => el.tagName !== "STYLE")
      : Array.from(srcNode.children);
    const cChildren = (Array.from(cloneNode.children) as HTMLElement[]).filter((el) => {
      if (el.dataset?.snapshotPseudo) return false;
      if (el.tagName === "STYLE" && el.dataset?.sd) return false;
      return true;
    });

    for (let i = 0; i < Math.min(sChildren.length, cChildren.length); i++) {
      queue.push([sChildren[i], cChildren[i]]);
    }
  }
};
