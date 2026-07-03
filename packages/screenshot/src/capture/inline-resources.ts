import { TRANSPARENT_PIXEL_DATA_URL, XLINK_NAMESPACE_URI } from "../constants";
import type { StyleRuleRecord } from "../types";
import { replaceCssUrls } from "../utils/replace-css-urls";
import { loadResourceAsDataUrl } from "./resource-loader";

const isInlinableUrl = (url: string): boolean =>
  url.length > 0 && !url.startsWith("data:") && !url.startsWith("#") && !url.startsWith("about:");

const collectMatchingElements = (clone: Element, selector: string): Element[] => {
  const matches: Element[] = clone.matches(selector) ? [clone] : [];
  matches.push(...clone.querySelectorAll(selector));
  return matches;
};

export const inlineExternalResources = async (
  clone: Element,
  rules: StyleRuleRecord[],
  timeoutMs: number,
): Promise<void> => {
  const inliningTasks: Promise<void>[] = [];

  for (const imageElement of collectMatchingElements(clone, "img")) {
    const sourceUrl = imageElement.getAttribute("src");
    if (!sourceUrl || !isInlinableUrl(sourceUrl)) continue;
    inliningTasks.push(
      loadResourceAsDataUrl(sourceUrl, timeoutMs).then((dataUrl) => {
        imageElement.setAttribute("src", dataUrl ?? TRANSPARENT_PIXEL_DATA_URL);
      }),
    );
  }

  for (const svgImageElement of collectMatchingElements(clone, "image")) {
    const hrefUrl =
      svgImageElement.getAttribute("href") ??
      svgImageElement.getAttributeNS(XLINK_NAMESPACE_URI, "href");
    if (!hrefUrl || !isInlinableUrl(hrefUrl)) continue;
    inliningTasks.push(
      loadResourceAsDataUrl(hrefUrl, timeoutMs).then((dataUrl) => {
        const inlinedUrl = dataUrl ?? TRANSPARENT_PIXEL_DATA_URL;
        svgImageElement.setAttribute("href", inlinedUrl);
        if (svgImageElement.hasAttributeNS(XLINK_NAMESPACE_URI, "href")) {
          svgImageElement.setAttributeNS(XLINK_NAMESPACE_URI, "xlink:href", inlinedUrl);
        }
      }),
    );
  }

  for (const rule of rules) {
    for (const styles of [
      rule.baseStyles,
      rule.beforeStyles,
      rule.afterStyles,
      rule.firstLetterStyles,
      rule.markerStyles,
    ]) {
      if (!styles) continue;
      for (const propertyName in styles) {
        const propertyValue = styles[propertyName];
        if (propertyValue === undefined || !propertyValue.includes("url(")) continue;
        inliningTasks.push(
          replaceCssUrls(propertyValue, async (url) => {
            if (!isInlinableUrl(url)) return url;
            return (await loadResourceAsDataUrl(url, timeoutMs)) ?? TRANSPARENT_PIXEL_DATA_URL;
          }).then((rewrittenValue) => {
            styles[propertyName] = rewrittenValue;
          }),
        );
      }
    }
  }

  await Promise.allSettled(inliningTasks);
};
