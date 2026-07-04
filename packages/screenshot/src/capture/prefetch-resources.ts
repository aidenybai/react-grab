import { XLINK_NAMESPACE_URI } from "../constants";
import { isCssFontFaceRule } from "../utils/is-css-font-face-rule";
import { replaceCssUrls } from "../utils/replace-css-urls";
import { resolveUrl } from "../utils/resolve-url";
import { visitDocumentCssRules } from "../utils/visit-document-css-rules";
import { loadResourceAsDataUrl } from "./resource-loader";

const isPrefetchableUrl = (url: string): boolean =>
  url.length > 0 && !url.startsWith("data:") && !url.startsWith("#") && !url.startsWith("about:");

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
  visitDocumentCssRules(
    rootElement.ownerDocument,
    (rule, baseUrl) => {
      if (isCssFontFaceRule(rule)) {
        const ruleCssText = rule.cssText;
        if (ruleCssText.includes("url(")) {
          void replaceCssUrls(ruleCssText, (url) => {
            if (!url.startsWith("data:")) {
              const absoluteUrl = resolveUrl(url, baseUrl);
              if (isPrefetchableUrl(absoluteUrl)) {
                void loadResourceAsDataUrl(absoluteUrl, timeoutMs);
              }
            }
            return Promise.resolve(url);
          });
        }
      }
      return false;
    },
    () => false,
  );
};
