import { XLINK_NAMESPACE_URI } from "../constants";
import { isCssFontFaceRule } from "../utils/is-css-font-face-rule";
import { isCssStyleRule } from "../utils/is-css-style-rule";
import { replaceCssUrls } from "../utils/replace-css-urls";
import { resolveUrl } from "../utils/resolve-url";
import { visitDocumentCssRules } from "../utils/visit-document-css-rules";
import { loadResourceAsDataUrl } from "./resource-loader";

const isPrefetchableUrl = (url: string): boolean =>
  url.length > 0 && !url.startsWith("data:") && !url.startsWith("#") && !url.startsWith("about:");

const prefetchCssTextUrls = (cssText: string, baseUrl: string | null, timeoutMs: number): void => {
  if (!cssText.includes("url(")) return;
  void replaceCssUrls(cssText, (url) => {
    if (!url.startsWith("data:")) {
      const absoluteUrl = resolveUrl(url, baseUrl);
      if (isPrefetchableUrl(absoluteUrl)) {
        void loadResourceAsDataUrl(absoluteUrl, timeoutMs);
      }
    }
    return Promise.resolve(url);
  });
};

// Fire-and-forget loads into the resource cache so network fetches overlap the
// style read and clone phases instead of serializing after them; the inline
// pass later awaits the same cached in-flight promises.
export const prefetchExternalResources = (rootElement: Element, timeoutMs: number): void => {
  for (const imageElement of rootElement.querySelectorAll("img")) {
    const sourceUrl = imageElement.getAttribute("src");
    if (sourceUrl && isPrefetchableUrl(sourceUrl)) {
      void loadResourceAsDataUrl(sourceUrl, timeoutMs);
    }
  }
  for (const svgImageElement of rootElement.querySelectorAll("image")) {
    const hrefUrl =
      svgImageElement.getAttribute("href") ??
      svgImageElement.getAttributeNS(XLINK_NAMESPACE_URI, "href");
    if (hrefUrl && isPrefetchableUrl(hrefUrl)) {
      void loadResourceAsDataUrl(hrefUrl, timeoutMs);
    }
  }
  for (const styledElement of rootElement.querySelectorAll('[style*="url("]')) {
    prefetchCssTextUrls(styledElement.getAttribute("style") ?? "", null, timeoutMs);
  }
  visitDocumentCssRules(
    rootElement.ownerDocument,
    (rule, baseUrl) => {
      if (isCssFontFaceRule(rule) || isCssStyleRule(rule)) {
        prefetchCssTextUrls(rule.cssText, baseUrl, timeoutMs);
      }
      return false;
    },
    () => false,
  );
};
