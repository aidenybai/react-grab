import type {
  InspectPropertyRow,
  InspectContrastInfo,
  InspectBoxModel,
} from "../types.js";
import { getFiberFromHostInstance, isCompositeFiber } from "bippy";
import {
  INSPECT_MAX_PROP_VALUE_LENGTH,
  INSPECT_MAX_REACT_PROPS,
  INSPECT_MAX_STRING_TRUNCATE_LENGTH,
  WCAG_AA_CONTRAST_THRESHOLD,
  WCAG_AAA_CONTRAST_THRESHOLD,
} from "../constants.js";

const NATIVELY_FOCUSABLE_TAGS = new Set([
  "a",
  "button",
  "input",
  "select",
  "textarea",
  "details",
  "summary",
]);

const IMPLICIT_ROLES: Record<string, string> = {
  a: "link",
  article: "article",
  aside: "complementary",
  button: "button",
  details: "group",
  dialog: "dialog",
  footer: "contentinfo",
  form: "form",
  h1: "heading",
  h2: "heading",
  h3: "heading",
  h4: "heading",
  h5: "heading",
  h6: "heading",
  header: "banner",
  hr: "separator",
  img: "img",
  input: "textbox",
  li: "listitem",
  main: "main",
  nav: "navigation",
  ol: "list",
  option: "option",
  p: "paragraph",
  progress: "progressbar",
  section: "region",
  select: "combobox",
  summary: "button",
  table: "table",
  td: "cell",
  textarea: "textbox",
  th: "columnheader",
  tr: "row",
  ul: "list",
};

const HIDDEN_PROP_KEYS = new Set([
  "children",
  "key",
  "ref",
  "__self",
  "__source",
  "dangerouslySetInnerHTML",
]);

const SENSITIVE_PROP_PATTERN =
  /secret|token|password|apiKey|auth|credential/i;

interface ParsedColor {
  red: number;
  green: number;
  blue: number;
  hex: string;
}

const parseRgb = (rgb: string): ParsedColor | null => {
  const match = rgb.match(
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*[\d.]+)?\s*\)/,
  );
  if (!match) return null;

  const red = Number(match[1]);
  const green = Number(match[2]);
  const blue = Number(match[3]);
  const hex = `#${((1 << 24) | (red << 16) | (green << 8) | blue).toString(16).slice(1).toUpperCase()}`;

  return { red, green, blue, hex };
};

const srgbChannelToLinear = (channel: number): number => {
  const normalized = channel / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : Math.pow((normalized + 0.055) / 1.055, 2.4);
};

const relativeLuminance = (red: number, green: number, blue: number): number =>
  0.2126 * srgbChannelToLinear(red) +
  0.7152 * srgbChannelToLinear(green) +
  0.0722 * srgbChannelToLinear(blue);

const computeContrast = (
  foreground: ParsedColor,
  background: ParsedColor,
): InspectContrastInfo => {
  const foregroundLuminance = relativeLuminance(
    foreground.red,
    foreground.green,
    foreground.blue,
  );
  const backgroundLuminance = relativeLuminance(
    background.red,
    background.green,
    background.blue,
  );
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  const ratio = (lighter + 0.05) / (darker + 0.05);

  return {
    ratio: Math.round(ratio * 100) / 100,
    aa: ratio >= WCAG_AA_CONTRAST_THRESHOLD,
    aaa: ratio >= WCAG_AAA_CONTRAST_THRESHOLD,
  };
};

const buildSpacingShorthand = (
  top: string,
  right: string,
  bottom: string,
  left: string,
): string | null => {
  if (top === "0px" && right === "0px" && bottom === "0px" && left === "0px") {
    return null;
  }

  if (top === right && right === bottom && bottom === left) return top;
  if (top === bottom && right === left) return `${top} ${right}`;
  if (right === left) return `${top} ${right} ${bottom}`;
  return `${top} ${right} ${bottom} ${left}`;
};

const getAccessibleName = (element: Element): string => {
  const ariaLabel = element.getAttribute("aria-label");
  if (ariaLabel) return ariaLabel;

  const labelledBy = element.getAttribute("aria-labelledby");
  if (labelledBy) {
    const labelParts = labelledBy
      .split(/\s+/)
      .map((labelId) => document.getElementById(labelId)?.textContent?.trim())
      .filter(Boolean);
    if (labelParts.length > 0) return labelParts.join(" ");
  }

  if (element instanceof HTMLImageElement) {
    return element.alt || "";
  }

  return "";
};

const formatPropValue = (value: unknown): string => {
  if (value === null || value === undefined) return String(value);
  if (typeof value === "string") return `"${value}"`;
  if (typeof value === "boolean" || typeof value === "number") {
    return String(value);
  }
  if (typeof value === "function") return "fn()";
  if (Array.isArray(value)) return `[${value.length}]`;
  if (typeof value === "object") {
    const keys = Object.keys(value);
    return `{${keys.length}}`;
  }
  return String(value);
};

const getReactProps = (element: Element): InspectPropertyRow[] => {
  const fiber = getFiberFromHostInstance(element);
  if (!fiber) return [];

  let compositeFiber = fiber.return;
  while (compositeFiber) {
    if (isCompositeFiber(compositeFiber)) break;
    compositeFiber = compositeFiber.return;
  }
  if (!compositeFiber) return [];

  const fiberProps = compositeFiber.memoizedProps;
  if (!fiberProps || typeof fiberProps !== "object") return [];

  const propEntries = Object.entries(fiberProps);
  const rows: InspectPropertyRow[] = [];

  for (const [propKey, propValue] of propEntries) {
    if (HIDDEN_PROP_KEYS.has(propKey)) continue;
    if (propKey.startsWith("__")) continue;
    if (SENSITIVE_PROP_PATTERN.test(propKey)) continue;

    let formatted = formatPropValue(propValue);
    if (formatted.length > INSPECT_MAX_PROP_VALUE_LENGTH) {
      formatted = `${formatted.slice(0, INSPECT_MAX_PROP_VALUE_LENGTH - 1)}…`;
    }
    rows.push({ label: propKey, value: formatted });

    if (rows.length >= INSPECT_MAX_REACT_PROPS) break;
  }

  return rows;
};

const parsePx = (value: string): number => parseFloat(value) || 0;

interface ElementInspectProperties {
  className: string;
  properties: InspectPropertyRow[];
  reactProps: InspectPropertyRow[];
  accessibility: InspectPropertyRow[];
  contrast?: InspectContrastInfo;
  boxModel: InspectBoxModel;
}

export const getElementInspectProperties = (
  element: Element,
): ElementInspectProperties => {
  const computedStyle = getComputedStyle(element);
  const properties: InspectPropertyRow[] = [];

  const foregroundColor = parseRgb(computedStyle.color);
  if (foregroundColor) {
    properties.push({
      label: "Color",
      value: foregroundColor.hex,
      colorHex: foregroundColor.hex,
    });
  }

  const rawBackgroundColor = computedStyle.backgroundColor;
  const isTransparentBackground =
    rawBackgroundColor === "rgba(0, 0, 0, 0)" ||
    rawBackgroundColor === "transparent";
  const backgroundColorParsed = isTransparentBackground
    ? null
    : parseRgb(rawBackgroundColor);
  if (backgroundColorParsed) {
    properties.push({
      label: "Background",
      value: backgroundColorParsed.hex,
      colorHex: backgroundColorParsed.hex,
    });
  }

  const fontSize = computedStyle.fontSize;
  const fontFamily = computedStyle.fontFamily;
  if (fontSize && fontFamily) {
    const truncatedFamily =
      fontFamily.length > INSPECT_MAX_STRING_TRUNCATE_LENGTH
        ? `${fontFamily.slice(0, INSPECT_MAX_STRING_TRUNCATE_LENGTH)}…`
        : fontFamily;
    properties.push({ label: "Font", value: `${fontSize} ${truncatedFamily}` });
  }

  const marginShorthand = buildSpacingShorthand(
    computedStyle.marginTop,
    computedStyle.marginRight,
    computedStyle.marginBottom,
    computedStyle.marginLeft,
  );
  if (marginShorthand) {
    properties.push({ label: "Margin", value: marginShorthand });
  }

  const paddingShorthand = buildSpacingShorthand(
    computedStyle.paddingTop,
    computedStyle.paddingRight,
    computedStyle.paddingBottom,
    computedStyle.paddingLeft,
  );
  if (paddingShorthand) {
    properties.push({ label: "Padding", value: paddingShorthand });
  }

  const display = computedStyle.display;
  if (display && display !== "block" && display !== "inline") {
    properties.push({ label: "Display", value: display });
  }

  if (display === "flex" || display === "inline-flex") {
    const flexDirection = computedStyle.flexDirection;
    if (flexDirection && flexDirection !== "row") {
      properties.push({ label: "Direction", value: flexDirection });
    }
    const gap = computedStyle.gap;
    if (gap && gap !== "normal") {
      properties.push({ label: "Gap", value: gap });
    }
  }

  if (display === "grid" || display === "inline-grid") {
    const gridCols = computedStyle.gridTemplateColumns;
    if (gridCols && gridCols !== "none") {
      const truncatedCols =
        gridCols.length > INSPECT_MAX_STRING_TRUNCATE_LENGTH
          ? `${gridCols.slice(0, INSPECT_MAX_STRING_TRUNCATE_LENGTH)}…`
          : gridCols;
      properties.push({ label: "Columns", value: truncatedCols });
    }
  }

  const position = computedStyle.position;
  if (position && position !== "static") {
    properties.push({ label: "Position", value: position });
  }

  const overflow = computedStyle.overflow;
  if (overflow && overflow !== "visible" && overflow !== "visible visible") {
    properties.push({ label: "Overflow", value: overflow });
  }

  const className = element.getAttribute("class")?.trim() || "";

  const tagName = element.tagName.toLowerCase();
  const accessibility: InspectPropertyRow[] = [];

  const accessibleName = getAccessibleName(element);
  accessibility.push({ label: "Name", value: accessibleName });

  const explicitRole = element.getAttribute("role");
  const implicitRole = IMPLICIT_ROLES[tagName];
  accessibility.push({
    label: "Role",
    value: explicitRole || implicitRole || "",
  });

  const htmlElement = element as HTMLElement;
  const isDisabled =
    "disabled" in htmlElement && Boolean(htmlElement.disabled);
  const isNativelyFocusable =
    NATIVELY_FOCUSABLE_TAGS.has(tagName) && !isDisabled;
  const isKeyboardFocusable = isNativelyFocusable || htmlElement.tabIndex >= 0;
  accessibility.push({
    label: "Keyboard-focusable",
    value: isKeyboardFocusable ? "Yes" : "No",
  });

  const reactProps = getReactProps(element);

  let contrast: InspectContrastInfo | undefined;
  if (foregroundColor && backgroundColorParsed) {
    contrast = computeContrast(foregroundColor, backgroundColorParsed);
  }

  const boxModel: InspectBoxModel = {
    paddingTop: parsePx(computedStyle.paddingTop),
    paddingRight: parsePx(computedStyle.paddingRight),
    paddingBottom: parsePx(computedStyle.paddingBottom),
    paddingLeft: parsePx(computedStyle.paddingLeft),
    marginTop: parsePx(computedStyle.marginTop),
    marginRight: parsePx(computedStyle.marginRight),
    marginBottom: parsePx(computedStyle.marginBottom),
    marginLeft: parsePx(computedStyle.marginLeft),
  };

  return { className, properties, reactProps, accessibility, contrast, boxModel };
};
