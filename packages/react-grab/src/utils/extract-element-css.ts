import { RELEVANT_CSS_PROPERTIES } from "../constants.js";

const BORDER_FILTER_SIDE_MAP = new Map(
  (["top", "right", "bottom", "left"] as const).flatMap((side) => [
    [`border-${side}-style`, side],
    [`border-${side}-color`, side],
  ]),
);

let baselineIframe: HTMLIFrameElement | null = null;
const defaultStylesByTag = new Map<string, Map<string, string>>();

const ensureBaselineIframe = (): HTMLIFrameElement => {
  if (baselineIframe) return baselineIframe;

  baselineIframe = document.createElement("iframe");
  baselineIframe.style.cssText =
    "position:fixed;left:-9999px;width:0;height:0;border:none;visibility:hidden;";
  document.body.appendChild(baselineIframe);
  return baselineIframe;
};

const getDefaultStylesForTag = (tagName: string): Map<string, string> => {
  const cached = defaultStylesByTag.get(tagName);
  if (cached) return cached;

  const iframe = ensureBaselineIframe();
  const iframeDocument = iframe.contentDocument!;
  const baselineElement = iframeDocument.createElement(tagName);
  iframeDocument.body.appendChild(baselineElement);

  const baselineComputed =
    iframe.contentWindow!.getComputedStyle(baselineElement);
  const defaultStyles = new Map<string, string>();

  for (const propertyName of RELEVANT_CSS_PROPERTIES) {
    const propertyValue = baselineComputed.getPropertyValue(propertyName);
    if (propertyValue) {
      defaultStyles.set(propertyName, propertyValue);
    }
  }

  baselineElement.remove();
  defaultStylesByTag.set(tagName, defaultStyles);
  return defaultStyles;
};

const isBorderPropertyWithoutWidth = (
  propertyName: string,
  computedStyle: CSSStyleDeclaration,
): boolean => {
  const side = BORDER_FILTER_SIDE_MAP.get(propertyName);
  if (!side) return false;
  const widthValue = computedStyle.getPropertyValue(`border-${side}-width`);
  return widthValue === "0px" || widthValue === "0";
};

export const extractElementCss = (element: Element): string => {
  const tagName = element.tagName.toLowerCase();
  const defaultStyles = getDefaultStylesForTag(tagName);
  const computedStyle = getComputedStyle(element);
  const declarations: string[] = [];

  for (const propertyName of RELEVANT_CSS_PROPERTIES) {
    const propertyValue = computedStyle.getPropertyValue(propertyName);
    if (!propertyValue) continue;
    if (propertyValue === defaultStyles.get(propertyName)) continue;
    if (isBorderPropertyWithoutWidth(propertyName, computedStyle)) continue;

    declarations.push(`${propertyName}: ${propertyValue};`);
  }

  const classAttribute = element.getAttribute("class")?.trim();
  const cssBlock = declarations.join("\n");
  if (!classAttribute) return cssBlock;
  if (!cssBlock) return `className: ${classAttribute}`;
  return `className: ${classAttribute}\n\n${cssBlock}`;
};

export const disposeBaselineStyles = (): void => {
  baselineIframe?.remove();
  baselineIframe = null;
  defaultStylesByTag.clear();
};
