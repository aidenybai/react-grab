import { expandStylePropLonghands } from "./expand-style-prop-longhands";
import { hasInlineStyleDeclaration } from "./has-inline-style-declaration";
import { parseInlineStyleDeclarations } from "./parse-inline-style-declarations";

// First-capture counterpart of the persisted-scan registry replay: every
// style attribute under the root is pre-ingested before the registry derives
// its per-element lane and relevant-prop count, so inline declarations never
// surface as mid-walk additions (which would disable memoization for the
// rest of the walk and block memo-store persistence).
export const collectInlineStyleFeed = (
  rootElement: Element,
): readonly (readonly [string, string])[] => {
  const seenFeedKeys = new Set<string>();
  const inlineFeed: (readonly [string, string])[] = [];
  const addFeedEntry = (propertyName: string, declaredValue: string): void => {
    const feedKey = `${propertyName}|${declaredValue}`;
    if (seenFeedKeys.has(feedKey)) return;
    seenFeedKeys.add(feedKey);
    inlineFeed.push([propertyName, declaredValue]);
  };
  const seenStyleTexts = new Set<string>();
  const ingestElement = (element: Element): void => {
    const styleText = element.getAttribute("style");
    if (styleText === null || seenStyleTexts.has(styleText)) return;
    seenStyleTexts.add(styleText);
    const parsedDeclarations = parseInlineStyleDeclarations(styleText);
    if (parsedDeclarations !== null) {
      for (const declaration of parsedDeclarations) {
        for (const longhandName of expandStylePropLonghands(declaration.propertyName)) {
          addFeedEntry(longhandName, declaration.propertyValue);
        }
      }
      return;
    }
    if (!hasInlineStyleDeclaration(element)) return;
    const inlineStyle = element.style;
    for (let propertyIndex = 0; propertyIndex < inlineStyle.length; propertyIndex++) {
      const propertyName = inlineStyle.item(propertyIndex);
      addFeedEntry(propertyName, inlineStyle.getPropertyValue(propertyName));
    }
  };
  ingestElement(rootElement);
  for (const styledElement of rootElement.querySelectorAll("[style]")) {
    ingestElement(styledElement);
  }
  return inlineFeed;
};
