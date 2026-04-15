import { SNAPSHOT_LARGE_ELEMENT_THRESHOLD_PX, SNAPSHOT_INLINE_SIZED_TAGS } from "../../constants.js";

let baselineIframe: HTMLIFrameElement | null = null;
const defaultStylesByTag = new Map<string, Map<string, string>>();

const getOrCreateBaselineIframe = (): HTMLIFrameElement => {
  if (baselineIframe) return baselineIframe;

  baselineIframe = document.createElement("iframe");
  baselineIframe.style.cssText =
    "position:fixed;left:-9999px;width:0;height:0;border:none;visibility:hidden;pointer-events:none;";
  document.body.appendChild(baselineIframe);
  return baselineIframe;
};

const computeDefaultStylesForTagName = (tagName: string): Map<string, string> => {
  const cached = defaultStylesByTag.get(tagName);
  if (cached) return cached;

  const iframe = getOrCreateBaselineIframe();
  const iframeDocument = iframe.contentDocument;
  const iframeWindow = iframe.contentWindow;
  if (!iframeDocument || !iframeWindow) return new Map();

  const baselineElement = iframeDocument.createElement(tagName);
  iframeDocument.body.appendChild(baselineElement);

  const baselineComputed = iframeWindow.getComputedStyle(baselineElement);
  const defaults = new Map<string, string>();

  for (let index = 0; index < baselineComputed.length; index++) {
    const propertyName = baselineComputed[index];
    defaults.set(propertyName, baselineComputed.getPropertyValue(propertyName));
  }

  baselineElement.remove();
  defaultStylesByTag.set(tagName, defaults);
  return defaults;
};

interface StyleDiffOptions {
  isRoot?: boolean;
}

const ANIMATION_TRANSITION_TOKEN = /(?:^|-)(animation|transition)(?:-|$)/i;

const NON_VISUAL_PROPERTY_PREFIX =
  /^(--.+|view-timeline|scroll-timeline|animation-trigger|offset-|position-try|app-region|interactivity|overlay|view-transition|-webkit-locale|-webkit-user-(?:drag|modify)|-webkit-tap-highlight-color|-webkit-text-security)$/i;

const NON_VISUAL_EXACT_PROPERTIES = new Set([
  "cursor", "pointer-events", "touch-action", "user-select",
  "-webkit-user-select", "resize", "caret-color",
  "print-color-adjust", "speak", "reading-flow", "reading-order",
  "anchor-name", "anchor-scope", "container-name", "container-type", "timeline-scope",
  "zoom", "will-change",
  "scroll-behavior", "scroll-snap-type", "scroll-snap-align", "scroll-snap-stop",
  "scroll-padding", "scroll-margin",
  "overscroll-behavior", "overscroll-behavior-x", "overscroll-behavior-y",
]);

const shouldSkipProperty = (propertyName: string): boolean => {
  if (propertyName.startsWith("--")) return true;
  if (NON_VISUAL_EXACT_PROPERTIES.has(propertyName)) return true;
  if (NON_VISUAL_PROPERTY_PREFIX.test(propertyName)) return true;
  if (ANIMATION_TRANSITION_TOKEN.test(propertyName)) return true;
  if (propertyName.startsWith("-webkit-") && !propertyName.startsWith("-webkit-text") && !propertyName.startsWith("-webkit-background-clip") && !propertyName.startsWith("-webkit-mask")) return true;
  return false;
};

export const computeNonDefaultStyles = (
  element: Element,
  options: StyleDiffOptions = {},
): Record<string, string> => {
  const tagName = element.tagName.toLowerCase();
  const defaults = computeDefaultStylesForTagName(tagName);
  const computed = getComputedStyle(element);
  const nonDefaultStyles: Record<string, string> = {};

  const displayValue = computed.getPropertyValue("display").toLowerCase();
  const isInlineDisplay = displayValue === "inline";
  const shouldSkipWidthProperties = isInlineDisplay || SNAPSHOT_INLINE_SIZED_TAGS.has(tagName);

  for (let index = 0; index < computed.length; index++) {
    const propertyName = computed[index];
    if (shouldSkipProperty(propertyName)) continue;

    if (shouldSkipWidthProperties && (propertyName === "width" || propertyName === "min-width" || propertyName === "max-width")) continue;

    const propertyValue = computed.getPropertyValue(propertyName);
    const defaultValue = defaults.get(propertyName);

    const isDisplayProperty = propertyName === "display";
    if (propertyValue !== defaultValue || isDisplayProperty) {
      nonDefaultStyles[propertyName] = propertyValue;
    }
  }

  if (options.isRoot) {
    const rect = element.getBoundingClientRect();
    const isLargeElement =
      rect.width > SNAPSHOT_LARGE_ELEMENT_THRESHOLD_PX ||
      rect.height > SNAPSHOT_LARGE_ELEMENT_THRESHOLD_PX;
    const hasPercentageDimensions =
      nonDefaultStyles.width?.includes("%") || nonDefaultStyles.height?.includes("%");

    if (isLargeElement || hasPercentageDimensions) {
      nonDefaultStyles.width = `${Math.ceil(rect.width)}px`;
      nonDefaultStyles.height = `${Math.ceil(rect.height)}px`;
    }
  }

  const extraTextProperties = [
    "text-decoration-line",
    "text-decoration-color",
    "text-decoration-style",
    "text-decoration-thickness",
    "text-underline-offset",
    "text-decoration-skip-ink",
    "-webkit-text-stroke",
    "-webkit-text-stroke-width",
    "-webkit-text-stroke-color",
    "paint-order",
  ];

  for (const extraProperty of extraTextProperties) {
    if (nonDefaultStyles[extraProperty]) continue;
    const extraValue = computed.getPropertyValue(extraProperty);
    if (extraValue) {
      nonDefaultStyles[extraProperty] = extraValue;
    }
  }

  if (!nonDefaultStyles["font-kerning"]) {
    nonDefaultStyles["font-kerning"] = "normal";
  }

  const borderTopWidth = parseFloat(computed.getPropertyValue("border-top-width")) || 0;
  const borderRightWidth = parseFloat(computed.getPropertyValue("border-right-width")) || 0;
  const borderBottomWidth = parseFloat(computed.getPropertyValue("border-bottom-width")) || 0;
  const borderLeftWidth = parseFloat(computed.getPropertyValue("border-left-width")) || 0;
  const hasZeroBorderWidths =
    borderTopWidth === 0 && borderRightWidth === 0 && borderBottomWidth === 0 && borderLeftWidth === 0;

  if (hasZeroBorderWidths) {
    const borderImageSource = (computed.getPropertyValue("border-image-source") || "").trim();
    const hasBorderImage = borderImageSource !== "" && borderImageSource !== "none";
    const borderProperties = [
      "border", "border-top", "border-right", "border-bottom", "border-left",
      "border-width", "border-style", "border-color",
      "border-top-width", "border-top-style", "border-top-color",
      "border-right-width", "border-right-style", "border-right-color",
      "border-bottom-width", "border-bottom-style", "border-bottom-color",
      "border-left-width", "border-left-style", "border-left-color",
      "border-block", "border-block-width", "border-block-style", "border-block-color",
      "border-inline", "border-inline-width", "border-inline-style", "border-inline-color",
    ];
    for (const borderProperty of borderProperties) {
      delete nonDefaultStyles[borderProperty];
    }
    if (!hasBorderImage) {
      nonDefaultStyles.border = "none";
    }
  }

  const backgroundClip = computed.getPropertyValue("background-clip") ||
    computed.getPropertyValue("-webkit-background-clip");
  if (backgroundClip === "text") {
    nonDefaultStyles["background-clip"] = "text";
    nonDefaultStyles["-webkit-background-clip"] = "text";
  }

  return nonDefaultStyles;
};

export const stylesToInlineString = (styles: Record<string, string>): string =>
  Object.entries(styles)
    .map(([property, value]) => `${property}: ${value.replaceAll('"', "'")};`)
    .join(" ");

export const precacheCommonTagDefaults = (): void => {
  const commonTags = [
    "div", "span", "p", "a", "img", "button", "input", "textarea", "select",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li", "dl", "dt", "dd",
    "table", "tr", "td", "th", "thead", "tbody",
    "form", "label", "fieldset", "legend",
    "section", "article", "aside", "nav", "main", "header", "footer",
    "figure", "figcaption", "blockquote", "pre", "code",
    "strong", "em", "small", "mark", "sub", "sup",
    "details", "summary", "dialog",
  ];

  for (const tagName of commonTags) {
    computeDefaultStylesForTagName(tagName);
  }
};

export const disposeSnapshotBaseline = (): void => {
  baselineIframe?.remove();
  baselineIframe = null;
  defaultStylesByTag.clear();
};
