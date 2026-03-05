import {
  SKIPPED_TAGS,
  TAG_LABELS,
  INLINE_DISPLAY_VALUES,
  UTILITY_CLASS_PATTERN,
  SHORT_TEXT_THRESHOLD_CHARS,
  DEFAULT_MAX_DEPTH,
  UNIQUE_ID_LENGTH,
} from "./constants";

interface OklchValue {
  mode: "oklch";
  l: number;
  c: number;
  h: number;
  alpha?: number;
}

interface PaperColor {
  gamut: string;
  mode: string;
  value: OklchValue;
}

interface PaperSolidFill {
  type: "solid";
  color: PaperColor;
  isVisible: boolean;
}

interface PaperGradientStop {
  position: number;
  color: PaperColor;
  midpoint: number;
}

interface PaperGradientFill {
  type: "gradient";
  stops: PaperGradientStop[];
  interpolation: string;
  shape: string;
  angle: number;
  length: number;
  isVisible: boolean;
  center: { x: number; y: number };
}

type PaperFill = PaperSolidFill | PaperGradientFill;

interface PaperBorder {
  type: "color";
  color: PaperColor;
  width: string;
  style: string;
  isVisible: boolean;
}

interface PaperShadow {
  color: PaperColor;
  offsetX: string;
  offsetY: string;
  blur: string;
  spread: string;
  isVisible: boolean;
}

interface PaperFont {
  family: string;
  style: string;
  weight: number;
  isItalic: boolean;
}

interface PaperStyleMeta {
  fill?: PaperFill[];
  borders?: Record<string, PaperBorder>;
  outerShadow?: PaperShadow[];
  font?: PaperFont;
}

interface PaperNode {
  id: string;
  label: string;
  textValue: string;
  component: "Frame" | "Text" | "Rectangle" | "SVG" | "SVGVisualElement";
  styles: Record<string, string | number>;
  "~": false;
  labelIsModified?: boolean;
  tag?: string;
  styleMeta?: PaperStyleMeta;
  props?: Record<string, unknown>;
  tempX?: number;
  tempY?: number;
}

interface PaperEmbedData {
  id: string;
  fileId: string;
  topLevelNodeIds: string[];
  nodes: Record<string, PaperNode>;
  images: Record<string, unknown>;
  parentToChildrenIndex: Record<string, string[]>;
  oldIdToNewIdMap: Record<string, string>;
}

interface DomToPaperOptions {
  maxDepth?: number;
  getComponentName?: (element: Element) => string | null;
}

// ---------------------------------------------------------------------------
// Color parsing — handles rgb, hex, lab, oklab, oklch, color(srgb)
// ---------------------------------------------------------------------------

// HACK: Modern Chromium returns computed colors in lab()/oklch()/oklab()
// formats when the CSS source uses them. We parse all formats directly.

interface ParsedColor {
  red: number;
  green: number;
  blue: number;
  alpha: number;
}

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const delinearize = (channel: number): number =>
  channel <= 0.0031308
    ? 12.92 * channel
    : 1.055 * Math.pow(channel, 1 / 2.4) - 0.055;

const linearize = (channel: number): number =>
  channel <= 0.04045
    ? channel / 12.92
    : Math.pow((channel + 0.055) / 1.055, 2.4);

const oklabToSrgb = (
  oklabL: number,
  oklabA: number,
  oklabB: number,
): { red: number; green: number; blue: number } => {
  const lPrime = oklabL + 0.3963377774 * oklabA + 0.2158037573 * oklabB;
  const mPrime = oklabL - 0.1055613458 * oklabA - 0.0638541728 * oklabB;
  const sPrime = oklabL - 0.0894841775 * oklabA - 1.291485548 * oklabB;

  const lmsL = lPrime * lPrime * lPrime;
  const lmsM = mPrime * mPrime * mPrime;
  const lmsS = sPrime * sPrime * sPrime;

  return {
    red: clamp01(delinearize(4.0767416621 * lmsL - 3.3077115913 * lmsM + 0.2309699292 * lmsS)),
    green: clamp01(delinearize(-1.2684380046 * lmsL + 2.6097574011 * lmsM - 0.3413193965 * lmsS)),
    blue: clamp01(delinearize(-0.0041960863 * lmsL - 0.7034186147 * lmsM + 1.707614701 * lmsS)),
  };
};

const cieLabToSrgb = (
  labL: number,
  labA: number,
  labB: number,
): { red: number; green: number; blue: number } => {
  const fy = (labL + 16) / 116;
  const fx = labA / 500 + fy;
  const fz = fy - labB / 200;

  const EPSILON = 6 / 29;
  const inverseFn = (fValue: number): number =>
    fValue > EPSILON
      ? fValue * fValue * fValue
      : 3 * EPSILON * EPSILON * (fValue - 4 / 29);

  const xyzX = 0.95047 * inverseFn(fx);
  const xyzY = 1.0 * inverseFn(fy);
  const xyzZ = 1.08883 * inverseFn(fz);

  return {
    red: clamp01(delinearize(3.2404542 * xyzX - 1.5371385 * xyzY - 0.4985314 * xyzZ)),
    green: clamp01(delinearize(-0.969266 * xyzX + 1.8760108 * xyzY + 0.041556 * xyzZ)),
    blue: clamp01(delinearize(0.0556434 * xyzX - 0.2040259 * xyzY + 1.0572252 * xyzZ)),
  };
};

const parseAlpha = (raw: string | undefined): number =>
  raw !== undefined ? parseFloat(raw) : 1;

const parseRgbColor = (cssColor: string): ParsedColor | null => {
  const rgbMatch = cssColor.match(
    /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)/,
  );
  if (rgbMatch) {
    return {
      red: parseFloat(rgbMatch[1]) / 255,
      green: parseFloat(rgbMatch[2]) / 255,
      blue: parseFloat(rgbMatch[3]) / 255,
      alpha: parseAlpha(rgbMatch[4]),
    };
  }

  const hexMatch = cssColor.match(
    /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})?$/i,
  );
  if (hexMatch) {
    return {
      red: parseInt(hexMatch[1], 16) / 255,
      green: parseInt(hexMatch[2], 16) / 255,
      blue: parseInt(hexMatch[3], 16) / 255,
      alpha: hexMatch[4] !== undefined ? parseInt(hexMatch[4], 16) / 255 : 1,
    };
  }

  const oklabMatch = cssColor.match(
    /oklab\(\s*([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)(?:\s*\/\s*([\d.]+))?\s*\)/,
  );
  if (oklabMatch) {
    return {
      ...oklabToSrgb(parseFloat(oklabMatch[1]), parseFloat(oklabMatch[2]), parseFloat(oklabMatch[3])),
      alpha: parseAlpha(oklabMatch[4]),
    };
  }

  const oklchMatch = cssColor.match(
    /oklch\(\s*([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)(?:\s*\/\s*([\d.]+))?\s*\)/,
  );
  if (oklchMatch) {
    const hueRad = (parseFloat(oklchMatch[3]) * Math.PI) / 180;
    const chroma = parseFloat(oklchMatch[2]);
    return {
      ...oklabToSrgb(parseFloat(oklchMatch[1]), chroma * Math.cos(hueRad), chroma * Math.sin(hueRad)),
      alpha: parseAlpha(oklchMatch[4]),
    };
  }

  // HACK: must come AFTER oklab/oklch — "lab(" substring matches inside "oklab("
  const labMatch = cssColor.match(
    /^lab\(\s*([\d.]+)\s+([-\d.]+)\s+([-\d.]+)(?:\s*\/\s*([\d.]+))?\s*\)/,
  );
  if (labMatch) {
    return {
      ...cieLabToSrgb(parseFloat(labMatch[1]), parseFloat(labMatch[2]), parseFloat(labMatch[3])),
      alpha: parseAlpha(labMatch[4]),
    };
  }

  const colorSrgbMatch = cssColor.match(
    /color\(\s*srgb\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)(?:\s*\/\s*([\d.]+))?\s*\)/,
  );
  if (colorSrgbMatch) {
    return {
      red: clamp01(parseFloat(colorSrgbMatch[1])),
      green: clamp01(parseFloat(colorSrgbMatch[2])),
      blue: clamp01(parseFloat(colorSrgbMatch[3])),
      alpha: parseAlpha(colorSrgbMatch[4]),
    };
  }

  return null;
};

const channelToHex = (value: number): string =>
  Math.round(value * 255).toString(16).padStart(2, "0");

const cssColorToHex = (cssColor: string): string => {
  const parsed = parseRgbColor(cssColor);
  if (!parsed) return cssColor;
  const hex = `#${channelToHex(parsed.red)}${channelToHex(parsed.green)}${channelToHex(parsed.blue)}`;
  return parsed.alpha < 1 ? `${hex}${channelToHex(parsed.alpha)}` : hex;
};

const srgbToOklch = (
  red: number,
  green: number,
  blue: number,
): { lightness: number; chroma: number; hue: number } => {
  const linearRed = linearize(red);
  const linearGreen = linearize(green);
  const linearBlue = linearize(blue);

  const cubeRootL = Math.cbrt(0.4122214708 * linearRed + 0.5363325363 * linearGreen + 0.0514459929 * linearBlue);
  const cubeRootM = Math.cbrt(0.2119034982 * linearRed + 0.6806995451 * linearGreen + 0.1073969566 * linearBlue);
  const cubeRootS = Math.cbrt(0.0883024619 * linearRed + 0.2817188376 * linearGreen + 0.6299787005 * linearBlue);

  const oklabL = 0.2104542553 * cubeRootL + 0.793617785 * cubeRootM - 0.0040720468 * cubeRootS;
  const oklabA = 1.9779984951 * cubeRootL - 2.428592205 * cubeRootM + 0.4505937099 * cubeRootS;
  const oklabB = 0.0259040371 * cubeRootL + 0.7827717662 * cubeRootM - 0.808675766 * cubeRootS;

  const chroma = Math.sqrt(oklabA * oklabA + oklabB * oklabB);
  let hue = Math.atan2(oklabB, oklabA) * (180 / Math.PI);
  if (hue < 0) hue += 360;

  return { lightness: oklabL, chroma, hue };
};

const cssColorToPaper = (cssColor: string): PaperColor | null => {
  const parsed = parseRgbColor(cssColor);
  if (!parsed) return null;
  const oklch = srgbToOklch(parsed.red, parsed.green, parsed.blue);
  const value: OklchValue = { mode: "oklch", l: oklch.lightness, c: oklch.chroma, h: oklch.hue };
  if (parsed.alpha !== 1) value.alpha = parsed.alpha;
  return { gamut: "rgb", mode: "hex", value };
};

const isTransparentColor = (cssColor: string): boolean => {
  if (cssColor === "transparent") return true;
  const parsed = parseRgbColor(cssColor);
  return parsed !== null && parsed.alpha === 0;
};

// ---------------------------------------------------------------------------
// Gradient, font, shadow parsing
// ---------------------------------------------------------------------------

const DIRECTION_TO_ANGLE: Record<string, number> = {
  "to top": 0, "to right": 90, "to bottom": 180, "to left": 270,
  "to top right": 45, "to bottom right": 135,
  "to bottom left": 225, "to top left": 315,
};

const parseLinearGradient = (cssValue: string): PaperGradientFill | null => {
  const gradientMatch = cssValue.match(/^linear-gradient\((.+)\)$/);
  if (!gradientMatch) return null;
  const body = gradientMatch[1];

  let angle = 180;
  let colorPart = body;

  const degreeMatch = body.match(/^([\d.]+)deg\s*,\s*/);
  if (degreeMatch) {
    angle = parseFloat(degreeMatch[1]);
    colorPart = body.slice(degreeMatch[0].length);
  } else {
    for (const [direction, directionAngle] of Object.entries(DIRECTION_TO_ANGLE)) {
      if (body.startsWith(direction + ",") || body.startsWith(direction + " ")) {
        angle = directionAngle;
        colorPart = body.slice(direction.length + 1).trim();
        break;
      }
    }
  }

  const stops: PaperGradientStop[] = [];
  const stopRegex = /(rgba?\([^)]+\))\s*([\d.]+%)?/g;
  let stopMatch;
  while ((stopMatch = stopRegex.exec(colorPart))) {
    const color = cssColorToPaper(stopMatch[1]);
    if (!color) continue;
    stops.push({ position: stopMatch[2] ? parseFloat(stopMatch[2]) / 100 : -1, color, midpoint: 0.5 });
  }

  if (stops.length < 2) return null;

  if (stops.some((stop) => stop.position < 0)) {
    stops.forEach((stop, stopIndex) => {
      if (stop.position < 0) stop.position = stopIndex / (stops.length - 1);
    });
  }

  return {
    type: "gradient", stops, interpolation: "oklab", shape: "linear",
    angle, length: 1, isVisible: true, center: { x: 0.5, y: 0.5 },
  };
};

const MONOSPACE_INDICATORS = [
  "monospace", "courier", "menlo", "monaco", "consolas",
  "fira code", "jetbrains", "source code", "ui-monospace",
];

const detectPaperFontFamily = (cssFontFamily: string): string => {
  const lowerFont = cssFontFamily.toLowerCase();
  for (const indicator of MONOSPACE_INDICATORS) {
    if (lowerFont.includes(indicator)) return "System Monospace";
  }
  return "System Sans-Serif";
};

const detectFontStyleName = (weight: number): string => {
  if (weight >= 700) return "Bold";
  if (weight >= 500) return "Medium";
  if (weight >= 300) return "Regular";
  return "Light";
};

const parseBoxShadows = (boxShadow: string): PaperShadow[] => {
  if (boxShadow === "none") return [];
  const shadows: PaperShadow[] = [];

  for (const rawShadow of boxShadow.split(/,(?![^(]*\))/)) {
    const trimmed = rawShadow.trim();
    if (trimmed.startsWith("inset")) continue;
    const match = trimmed.match(
      /(rgba?\([^)]+\))\s+([-\d.]+px)\s+([-\d.]+px)\s+([-\d.]+px)(?:\s+([-\d.]+px))?/,
    );
    if (!match) continue;
    const shadowColor = cssColorToPaper(match[1]);
    if (!shadowColor) continue;
    shadows.push({
      color: shadowColor,
      offsetX: match[2], offsetY: match[3], blur: match[4],
      spread: match[5] ?? "0px", isVisible: true,
    });
  }

  return shadows;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatDimension = (cssValue: string): string | number => {
  if (cssValue === "auto") return "fit-content";
  const pixelValue = parseFloat(cssValue);
  if (isNaN(pixelValue)) return cssValue;
  if (pixelValue === 0) return 0;
  return cssValue;
};

const normalizeFlexValue = (rawValue: string): string => {
  if (rawValue === "normal" || rawValue === "flex-start") return "start";
  if (rawValue === "flex-end") return "end";
  return rawValue;
};

const resolveBackgroundColor = (element: Element): string => {
  let current: Element | null = element;
  while (current) {
    const backgroundColor = getComputedStyle(current).backgroundColor;
    if (!isTransparentColor(backgroundColor)) return backgroundColor;
    current = current.parentElement;
  }
  return "rgb(255, 255, 255)";
};

const hasVisibleBoxDecoration = (element: Element): boolean => {
  const computed = getComputedStyle(element);
  return (
    !isTransparentColor(computed.backgroundColor) ||
    parseFloat(computed.borderTopWidth) > 0 ||
    parseFloat(computed.paddingTop) > 0 ||
    parseFloat(computed.paddingLeft) > 0 ||
    computed.backgroundImage !== "none"
  );
};

const formatLayerName = (raw: string): string =>
  raw
    .replace(/[-_]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
    .trim()
    .slice(0, 50);

const getLayerName = (element: Element): string | null => {
  if (element.id) return formatLayerName(element.id);
  const ariaLabel = element.getAttribute("aria-label");
  if (ariaLabel) return ariaLabel.slice(0, 50);
  const tagLabel = TAG_LABELS[element.tagName];
  if (tagLabel) return tagLabel;
  const meaningfulClass = Array.from(element.classList).find(
    (className) => className.length > 3 && !UTILITY_CLASS_PATTERN.test(className),
  );
  if (meaningfulClass) return formatLayerName(meaningfulClass);
  return null;
};

const CROCKFORD_BASE32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

const generateUniqueId = (): string => {
  let generated = "";
  for (let index = 0; index < UNIQUE_ID_LENGTH; index++) {
    generated += CROCKFORD_BASE32[Math.floor(Math.random() * CROCKFORD_BASE32.length)];
  }
  return generated;
};

const BORDER_SIDES = ["Top", "Right", "Bottom", "Left"] as const;
const REPLACED_ELEMENT_TAGS = new Set(["img", "svg", "canvas", "video", "iframe"]);

const SVG_VISUAL_TAGS = new Set([
  "path", "circle", "ellipse", "rect", "line", "polyline", "polygon", "use",
]);

const BLOCK_DESCENDANT_SELECTOR =
  "div, p, section, article, header, footer, main, nav, ul, ol, li, " +
  "h1, h2, h3, h4, h5, h6, pre, blockquote, table, form, details, " +
  "figure, button, input, select, textarea";

const isElementVisible = (computed: CSSStyleDeclaration): boolean =>
  computed.display !== "none" &&
  !(computed.visibility === "hidden" && computed.overflow === "hidden");

const extractFills = (
  computed: CSSStyleDeclaration,
  domElement: Element,
  isRootElement: boolean,
): PaperFill[] => {
  const fills: PaperFill[] = [];

  const resolvedBackground = isRootElement
    ? resolveBackgroundColor(domElement)
    : computed.backgroundColor;

  if (!isTransparentColor(resolvedBackground)) {
    const bgColor = cssColorToPaper(resolvedBackground);
    if (bgColor) fills.push({ type: "solid", color: bgColor, isVisible: true });
  }

  const backgroundImage = computed.backgroundImage;
  if (backgroundImage && backgroundImage !== "none") {
    for (const segment of backgroundImage.split(/,(?![^(]*\))/)) {
      const trimmed = segment.trim();
      if (trimmed.startsWith("linear-gradient")) {
        const gradientFill = parseLinearGradient(trimmed);
        if (gradientFill) fills.push(gradientFill);
      }
    }
  }

  return fills;
};

// ---------------------------------------------------------------------------
// Main converter
// ---------------------------------------------------------------------------

export const domToPaper = (
  rootElementOrElements: Node | Node[],
  options: DomToPaperOptions = {},
): string => {
  const rootElements = Array.isArray(rootElementOrElements)
    ? rootElementOrElements.filter((node): node is Element => node instanceof Element)
    : rootElementOrElements instanceof Element
      ? [rootElementOrElements]
      : [];
  if (rootElements.length === 0) return "";

  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const getComponentName = options.getComponentName;

  let nodeSequenceCounter = 0;
  const nodes: Record<string, PaperNode> = {};
  const parentToChildrenIndex: Record<string, string[]> = {};

  const allocateNodeId = (): string => {
    nodeSequenceCounter++;
    return `${nodeSequenceCounter.toString(36).toUpperCase()}-0`;
  };

  const resolveLabel = (domElement: Element, fallback: string): { label: string; labelIsModified: boolean } => {
    const customLabel = getComponentName?.(domElement) ?? getLayerName(domElement);
    return { label: customLabel ?? fallback, labelIsModified: Boolean(customLabel) };
  };

  const createTextNode = (textContent: string, contextElement: Element): string => {
    const textNodeId = allocateNodeId();
    const computed = getComputedStyle(contextElement);
    const styleMeta: PaperStyleMeta = {};

    const colorHex = cssColorToHex(computed.color);
    const textColor = cssColorToPaper(computed.color);
    if (textColor) {
      styleMeta.fill = [{ type: "solid", color: textColor, isVisible: true }];
    }

    const fontWeight = parseInt(computed.fontWeight) || 400;
    const paperFontFamily = detectPaperFontFamily(computed.fontFamily);
    styleMeta.font = {
      family: paperFontFamily,
      style: detectFontStyleName(fontWeight),
      weight: fontWeight,
      isItalic: computed.fontStyle === "italic",
    };

    const fontSizePx = parseFloat(computed.fontSize) || 16;
    const rawLetterSpacing = parseFloat(computed.letterSpacing);
    const lineHeightPx = parseFloat(computed.lineHeight);

    const shouldPreventWrap =
      computed.whiteSpace === "nowrap" ||
      computed.whiteSpace === "pre" ||
      textContent.length < SHORT_TEXT_THRESHOLD_CHARS;

    const parentRect = contextElement.getBoundingClientRect();

    const textStyles: Record<string, string | number> = {
      color: colorHex,
      fontFamily: paperFontFamily,
      fontSize: `${fontSizePx}px`,
      fontWeight: `${fontWeight}`,
      lineHeight: isNaN(lineHeightPx) ? "150%" : `${Math.round((lineHeightPx / fontSizePx) * 100)}%`,
      whiteSpace: shouldPreventWrap ? "pre" : "pre-wrap",
      width: shouldPreventWrap || parentRect.width <= 0 ? "fit-content" : `${Math.round(parentRect.width)}px`,
      height: "fit-content",
      flexShrink: "0",
      letterSpacing: isNaN(rawLetterSpacing) ? "0em" : `${(rawLetterSpacing / fontSizePx).toFixed(2)}em`,
    };

    if (computed.fontStyle === "italic") textStyles.fontStyle = "italic";

    const textAlign = computed.textAlign;
    if (textAlign && textAlign !== "start" && textAlign !== "left") {
      textStyles.textAlign = textAlign;
    }

    nodes[textNodeId] = {
      id: textNodeId, label: "Text", textValue: textContent,
      component: "Text", styles: textStyles, "~": false,
      labelIsModified: false, styleMeta,
    };

    return textNodeId;
  };

  const svgFillToPaperProp = (
    fillAttr: string | null,
    contextElement: Element,
  ): { color: PaperColor; isVisible: boolean } => {
    if (!fillAttr || fillAttr === "none") {
      return { color: cssColorToPaper("rgb(0, 0, 0)")!, isVisible: false };
    }

    const resolvedColor = fillAttr === "currentColor"
      ? getComputedStyle(contextElement).color
      : fillAttr;

    const paperColor = cssColorToPaper(resolvedColor)
      ?? cssColorToPaper(getComputedStyle(contextElement).fill)
      ?? cssColorToPaper("rgb(0, 0, 0)")!;

    return { color: paperColor, isVisible: true };
  };

  const convertSvgChild = (svgChild: Element): string | null => {
    const childTag = svgChild.tagName.toLowerCase();

    if (childTag === "g") {
      const groupId = allocateNodeId();
      const groupChildIds: string[] = [];
      for (const grandchild of svgChild.children) {
        const grandchildId = convertSvgChild(grandchild);
        if (grandchildId) groupChildIds.push(grandchildId);
      }

      const groupStyles: Record<string, string | number> = {};
      const groupComputed = getComputedStyle(svgChild);
      if (groupComputed.opacity !== "1") groupStyles.opacity = groupComputed.opacity;

      nodes[groupId] = {
        id: groupId, label: "Shape", textValue: "",
        component: "SVGVisualElement", tag: "g",
        styles: groupStyles, "~": false, labelIsModified: false, props: {},
      };

      if (groupChildIds.length > 0) parentToChildrenIndex[groupId] = groupChildIds;
      return groupId;
    }

    if (!SVG_VISUAL_TAGS.has(childTag)) return null;

    const childId = allocateNodeId();
    const childProps: Record<string, unknown> = {};
    const childStyles: Record<string, string | number> = {};

    for (const attr of svgChild.attributes) {
      if (attr.name === "fill") {
        childProps.fill = svgFillToPaperProp(attr.value, svgChild);
      } else if (attr.name === "stroke") {
        const strokeColor = cssColorToPaper(
          attr.value === "currentColor" ? getComputedStyle(svgChild).color : attr.value,
        );
        if (strokeColor) {
          childProps.stroke = { color: strokeColor, isVisible: attr.value !== "none" };
        }
      } else if (attr.name !== "style" && attr.name !== "class") {
        childProps[attr.name] = attr.value;
      }
    }

    const childComputed = getComputedStyle(svgChild);

    if (!childProps.fill) childProps.fill = svgFillToPaperProp(childComputed.fill, svgChild);

    if (!childProps.stroke && childComputed.stroke && childComputed.stroke !== "none") {
      const strokeColor = cssColorToPaper(childComputed.stroke);
      if (strokeColor) childProps.stroke = { color: strokeColor, isVisible: true };
    }

    if (!childProps["stroke-width"] && childComputed.strokeWidth && childComputed.strokeWidth !== "0") {
      childProps["stroke-width"] = childComputed.strokeWidth;
    }
    if (!childProps["stroke-linecap"] && childComputed.strokeLinecap && childComputed.strokeLinecap !== "butt") {
      childProps["stroke-linecap"] = childComputed.strokeLinecap;
    }
    if (!childProps["stroke-linejoin"] && childComputed.strokeLinejoin && childComputed.strokeLinejoin !== "miter") {
      childProps["stroke-linejoin"] = childComputed.strokeLinejoin;
    }

    if (childComputed.opacity !== "1") childStyles.opacity = childComputed.opacity;

    const SVG_LABEL_MAP: Record<string, string> = {
      path: "Path", circle: "Circle", ellipse: "Ellipse",
      rect: "Rect", line: "Line", polyline: "Polyline",
      polygon: "Polygon", use: "Use",
    };

    nodes[childId] = {
      id: childId, label: SVG_LABEL_MAP[childTag] ?? "Shape", textValue: "",
      component: "SVGVisualElement", tag: childTag,
      styles: childStyles, "~": false, labelIsModified: false, props: childProps,
    };

    return childId;
  };

  const convertSvgRoot = (svgElement: SVGSVGElement, nodeId: string): string => {
    const svgProps: Record<string, unknown> = {};
    const widthAttr = svgElement.getAttribute("width");
    const heightAttr = svgElement.getAttribute("height");
    const viewBox = svgElement.getAttribute("viewBox");

    if (widthAttr) svgProps.width = widthAttr;
    if (heightAttr) svgProps.height = heightAttr;
    if (viewBox) svgProps.viewBox = viewBox;
    svgProps.xmlns = "http://www.w3.org/2000/svg";
    svgProps.preserveAspectRatio = svgElement.getAttribute("preserveAspectRatio") ?? "none";
    svgProps.fill = svgFillToPaperProp(svgElement.getAttribute("fill"), svgElement);

    const svgStyles: Record<string, string | number> = {};
    const svgComputed = getComputedStyle(svgElement);
    if (svgComputed.opacity !== "1") svgStyles.opacity = svgComputed.opacity;

    nodes[nodeId] = {
      id: nodeId, label: "SVG", textValue: "",
      component: "SVG", styles: svgStyles, "~": false,
      labelIsModified: false, props: svgProps,
    };

    const childIds: string[] = [];
    for (const child of svgElement.children) {
      const childId = convertSvgChild(child);
      if (childId) childIds.push(childId);
    }
    if (childIds.length > 0) parentToChildrenIndex[nodeId] = childIds;

    return nodeId;
  };

  const convertElement = (
    domElement: Element,
    isRootElement = false,
    depth = 0,
  ): string => {
    if (depth > maxDepth) return "";
    const nodeId = allocateNodeId();
    const computed = getComputedStyle(domElement);
    const elementTag = domElement.tagName.toLowerCase();
    const isReplacedElement = REPLACED_ELEMENT_TAGS.has(elementTag);

    const paperStyles: Record<string, string | number> = {};
    const styleMeta: PaperStyleMeta = {};

    if (domElement instanceof SVGSVGElement) return convertSvgRoot(domElement, nodeId);

    if (isReplacedElement) {
      const replacedRect = domElement.getBoundingClientRect();
      paperStyles.width = replacedRect.width;
      paperStyles.height = replacedRect.height;
      paperStyles.flexShrink = "0";
      if (computed.opacity !== "1") paperStyles.opacity = computed.opacity;

      const elementColor = computed.color;
      if (elementColor && !isTransparentColor(elementColor)) {
        paperStyles.backgroundColor = cssColorToHex(elementColor);
      }
      if (!isTransparentColor(computed.backgroundColor)) {
        paperStyles.backgroundColor = cssColorToHex(computed.backgroundColor);
      }

      const replacedFillColor = cssColorToPaper(
        paperStyles.backgroundColor ? String(paperStyles.backgroundColor) : elementColor,
      );
      const replacedStyleMeta: PaperStyleMeta = {};
      if (replacedFillColor) {
        replacedStyleMeta.fill = [{ type: "solid", color: replacedFillColor, isVisible: true }];
      }

      const { label, labelIsModified } = resolveLabel(domElement, "Rectangle");
      nodes[nodeId] = {
        id: nodeId, label, textValue: "", component: "Rectangle",
        styles: paperStyles, "~": false, labelIsModified, props: {},
        ...(Object.keys(replacedStyleMeta).length > 0 && { styleMeta: replacedStyleMeta }),
      };
      return nodeId;
    }

    // Layout
    paperStyles.display = "flex";
    const cssDisplay = computed.display;

    if (cssDisplay.includes("flex")) {
      paperStyles.flexDirection = computed.flexDirection;
      paperStyles.justifyContent = normalizeFlexValue(computed.justifyContent);
      paperStyles.alignItems = normalizeFlexValue(computed.alignItems);
      if (computed.flexWrap === "wrap" || computed.flexWrap === "wrap-reverse") {
        paperStyles.flexWrap = "wrap";
      }
    } else if (cssDisplay === "inline" || cssDisplay === "inline-block") {
      paperStyles.flexDirection = "row";
      paperStyles.flexWrap = "wrap";
      paperStyles.justifyContent = "start";
      paperStyles.alignItems = "center";
    } else {
      const visibleChildren = Array.from(domElement.children).filter((childEl) => {
        const childComputed = getComputedStyle(childEl);
        return childComputed.display !== "none" && childComputed.visibility !== "hidden";
      });
      const hasAnyBlockChild = visibleChildren.some((childEl) => {
        const childDisp = getComputedStyle(childEl).display;
        return !INLINE_DISPLAY_VALUES.has(childDisp) && childDisp !== "contents";
      });

      if (hasAnyBlockChild) {
        paperStyles.flexDirection = "column";
        paperStyles.justifyContent = "start";
        paperStyles.alignItems = "start";
      } else {
        paperStyles.flexDirection = "row";
        paperStyles.flexWrap = "wrap";
        paperStyles.justifyContent = "start";
        paperStyles.alignItems = "center";
      }
    }

    const cssGap = computed.gap;
    paperStyles.gap = cssGap && cssGap !== "normal" && cssGap !== "0px" ? cssGap : 0;

    // Sizing
    const boundingRect = domElement.getBoundingClientRect();
    paperStyles.width = `${boundingRect.width}px`;
    paperStyles.height = isRootElement ? `${boundingRect.height}px` : "fit-content";

    if (computed.minWidth !== "0px" && computed.minWidth !== "auto") paperStyles.minWidth = formatDimension(computed.minWidth);
    if (computed.maxWidth !== "none") paperStyles.maxWidth = formatDimension(computed.maxWidth);
    if (computed.minHeight !== "0px" && computed.minHeight !== "auto") paperStyles.minHeight = formatDimension(computed.minHeight);
    if (computed.maxHeight !== "none") paperStyles.maxHeight = formatDimension(computed.maxHeight);

    // Border radius
    const corners = [computed.borderTopLeftRadius, computed.borderTopRightRadius, computed.borderBottomRightRadius, computed.borderBottomLeftRadius];
    if (corners.some((corner) => corner !== "0px")) {
      const allEqual = corners.every((corner) => corner === corners[0]);
      paperStyles.borderRadius = allEqual ? corners[0] : corners.join(" ");
    }

    // Padding
    const padding = [computed.paddingTop, computed.paddingRight, computed.paddingBottom, computed.paddingLeft];
    if (padding[0] === padding[2] && padding[1] === padding[3]) {
      paperStyles.paddingBlock = formatDimension(padding[0]);
      paperStyles.paddingInline = formatDimension(padding[1]);
    } else {
      paperStyles.paddingTop = formatDimension(padding[0]);
      paperStyles.paddingRight = formatDimension(padding[1]);
      paperStyles.paddingBottom = formatDimension(padding[2]);
      paperStyles.paddingLeft = formatDimension(padding[3]);
    }

    // Flex child
    if (!isRootElement) paperStyles.flexShrink = "0";
    if (computed.flexGrow !== "0") paperStyles.flexGrow = computed.flexGrow;
    if (computed.flexBasis !== "auto" && computed.flexBasis !== "0px") paperStyles.flexBasis = computed.flexBasis;
    const alignSelf = computed.alignSelf;
    if (alignSelf && alignSelf !== "auto" && alignSelf !== "normal") paperStyles.alignSelf = normalizeFlexValue(alignSelf);

    // Overflow
    if (["hidden", "clip", "scroll", "auto"].includes(computed.overflow)) {
      paperStyles.overflow = "clip";
    }

    // Position
    if (computed.position === "absolute" || computed.position === "fixed") {
      paperStyles.position = "absolute";
      const absoluteLeft = parseFloat(computed.left);
      const absoluteTop = parseFloat(computed.top);
      if (!isNaN(absoluteLeft)) paperStyles.left = absoluteLeft;
      if (!isNaN(absoluteTop)) paperStyles.top = absoluteTop;
    }

    // Opacity
    if (computed.opacity !== "1") paperStyles.opacity = computed.opacity;

    // Background
    const resolvedBackground = isRootElement ? resolveBackgroundColor(domElement) : computed.backgroundColor;
    if (!isTransparentColor(resolvedBackground)) {
      paperStyles.backgroundColor = cssColorToHex(resolvedBackground);
    }

    // Style meta (OKLCH fills, borders, shadows)
    const fills = extractFills(computed, domElement, isRootElement);
    if (fills.length > 0) styleMeta.fill = fills;

    const borderWidthValues = BORDER_SIDES.map((side) =>
      computed.getPropertyValue(`border-${side.toLowerCase()}-width`),
    );

    if (borderWidthValues.some((widthValue) => parseFloat(widthValue) > 0)) {
      const allBordersIdentical =
        borderWidthValues.every((widthValue) => widthValue === borderWidthValues[0]) &&
        BORDER_SIDES.every((side) =>
          computed.getPropertyValue(`border-${side.toLowerCase()}-color`) === computed.getPropertyValue("border-top-color"),
        );

      if (allBordersIdentical && parseFloat(borderWidthValues[0]) > 0) {
        paperStyles.borderWidth = computed.getPropertyValue("border-top-width");
        paperStyles.borderStyle = computed.getPropertyValue("border-top-style");
        paperStyles.borderColor = cssColorToHex(computed.getPropertyValue("border-top-color"));
        const borderColor = cssColorToPaper(computed.getPropertyValue("border-top-color"));
        if (borderColor) {
          styleMeta.borders = {
            all: { type: "color", color: borderColor, width: paperStyles.borderWidth as string, style: paperStyles.borderStyle as string, isVisible: true },
          };
        }
      } else {
        const perSideBorders: Record<string, PaperBorder> = {};
        for (const side of BORDER_SIDES) {
          const sideKey = side.toLowerCase();
          const sideWidth = computed.getPropertyValue(`border-${sideKey}-width`);
          if (parseFloat(sideWidth) <= 0) continue;
          paperStyles[`border${side}Width`] = sideWidth;
          paperStyles[`border${side}Style`] = computed.getPropertyValue(`border-${sideKey}-style`);
          paperStyles[`border${side}Color`] = cssColorToHex(computed.getPropertyValue(`border-${sideKey}-color`));
          const sideColor = cssColorToPaper(computed.getPropertyValue(`border-${sideKey}-color`));
          if (sideColor) {
            perSideBorders[sideKey] = { type: "color", color: sideColor, width: sideWidth, style: computed.getPropertyValue(`border-${sideKey}-style`), isVisible: true };
          }
        }
        if (Object.keys(perSideBorders).length > 0) styleMeta.borders = perSideBorders;
      }
    }

    if (computed.boxShadow && computed.boxShadow !== "none") {
      paperStyles.boxShadow = computed.boxShadow;
      const parsedShadows = parseBoxShadows(computed.boxShadow);
      if (parsedShadows.length > 0) styleMeta.outerShadow = parsedShadows;
    }

    // Text-only elements without visual styling → promote to Text node
    const hasElementChildren = Array.from(domElement.childNodes).some((childDomNode) => {
      if (childDomNode.nodeType !== Node.ELEMENT_NODE) return false;
      const childEl = childDomNode as Element;
      if (SKIPPED_TAGS.has(childEl.tagName)) return false;
      if (childEl.namespaceURI === "http://www.w3.org/2000/svg" && childEl.tagName !== "svg") return false;
      return isElementVisible(getComputedStyle(childEl));
    });

    const fullTextContent = (domElement.textContent ?? "").replace(/\s+/g, " ").trim();
    const hasVisualStyling = Object.keys(styleMeta).length > 0 || hasVisibleBoxDecoration(domElement);

    if (!hasElementChildren && fullTextContent && !hasVisualStyling) {
      const textNodeId = createTextNode(fullTextContent, domElement);
      const textNode = nodes[textNodeId];
      const { label, labelIsModified } = resolveLabel(domElement, "Text");
      if (label !== "Text") {
        textNode.label = label;
        textNode.labelIsModified = labelIsModified;
      }
      textNode.id = nodeId;
      nodes[nodeId] = textNode;
      delete nodes[textNodeId];
      return nodeId;
    }

    // HACK: Skip trivial wrapper frames — single visible child, no visual styling,
    // no padding/gap, no text content. Reduces nesting without losing information.
    const visibleChildElements = Array.from(domElement.children).filter((childEl) => {
      if (SKIPPED_TAGS.has(childEl.tagName)) return false;
      return isElementVisible(getComputedStyle(childEl));
    });

    const directTextContent = Array.from(domElement.childNodes)
      .filter((childNode) => childNode.nodeType === Node.TEXT_NODE)
      .map((childNode) => (childNode.textContent ?? "").trim())
      .join("");

    const hasPaddingOrGap =
      computed.paddingTop !== "0px" || computed.paddingRight !== "0px" ||
      computed.paddingBottom !== "0px" || computed.paddingLeft !== "0px" ||
      (computed.gap && computed.gap !== "normal" && computed.gap !== "0px");

    if (
      visibleChildElements.length === 1 &&
      !hasVisualStyling &&
      !directTextContent &&
      !hasPaddingOrGap &&
      !cssDisplay.includes("flex") &&
      !isRootElement
    ) {
      return convertElement(visibleChildElements[0], false, depth);
    }

    // Children
    const childNodeIds: string[] = [];
    let inlineTextBuffer = "";

    const flushInlineTextBuffer = () => {
      const normalizedText = inlineTextBuffer.replace(/\s+/g, " ").trim();
      if (normalizedText) {
        childNodeIds.push(createTextNode(normalizedText, domElement));
      }
      inlineTextBuffer = "";
    };

    for (const childDomNode of domElement.childNodes) {
      if (childDomNode.nodeType === Node.TEXT_NODE) {
        inlineTextBuffer += childDomNode.textContent ?? "";
        continue;
      }
      if (childDomNode.nodeType !== Node.ELEMENT_NODE) continue;

      const childElement = childDomNode as Element;
      if (SKIPPED_TAGS.has(childElement.tagName)) continue;

      const childComputed = getComputedStyle(childElement);
      if (!isElementVisible(childComputed)) continue;

      if (childElement instanceof SVGElement && childElement.tagName === "svg") {
        flushInlineTextBuffer();
        const childId = convertElement(childElement, false, depth + 1);
        if (childId) childNodeIds.push(childId);
        continue;
      }

      if (childElement.namespaceURI === "http://www.w3.org/2000/svg") continue;

      const childDisplay = childComputed.display;
      const isInlineChild = INLINE_DISPLAY_VALUES.has(childDisplay);
      const isSimpleInline =
        isInlineChild &&
        !hasVisibleBoxDecoration(childElement) &&
        !childElement.querySelector("svg") &&
        !childElement.querySelector("img") &&
        !childElement.querySelector(BLOCK_DESCENDANT_SELECTOR);

      if (isSimpleInline) {
        flushInlineTextBuffer();
        const inlineText = (childElement.textContent ?? "").replace(/\s+/g, " ").trim();
        if (inlineText) childNodeIds.push(createTextNode(inlineText, childElement));
      } else {
        flushInlineTextBuffer();
        const childId = convertElement(childElement, false, depth + 1);
        if (childId) childNodeIds.push(childId);
      }
    }

    flushInlineTextBuffer();

    if (childNodeIds.length > 0) parentToChildrenIndex[nodeId] = childNodeIds;

    const { label: frameLabel, labelIsModified } = resolveLabel(domElement, "Frame");
    const paperNode: PaperNode = {
      id: nodeId, label: frameLabel, textValue: "",
      component: "Frame", styles: paperStyles, "~": false, labelIsModified,
    };

    if (Object.keys(styleMeta).length > 0) paperNode.styleMeta = styleMeta;

    nodes[nodeId] = paperNode;
    return nodeId;
  };

  const topLevelNodeIds: string[] = [];
  const oldIdToNewIdMap: Record<string, string> = {};

  for (const rootElement of rootElements) {
    const rootNodeId = convertElement(rootElement, true);
    if (!rootNodeId) continue;
    topLevelNodeIds.push(rootNodeId);
    oldIdToNewIdMap[generateUniqueId()] = rootNodeId;

    const rootNode = nodes[rootNodeId];
    if (rootNode) {
      const rootRect = rootElement.getBoundingClientRect();
      rootNode.tempX = Math.round(rootRect.left);
      rootNode.tempY = Math.round(rootRect.top);
      rootNode.styles.left = Math.round(rootRect.left);
      rootNode.styles.top = Math.round(rootRect.top);
    }
  }

  if (topLevelNodeIds.length === 0) return "";

  const embedData: PaperEmbedData = {
    id: generateUniqueId(),
    fileId: generateUniqueId(),
    topLevelNodeIds,
    nodes,
    images: {},
    parentToChildrenIndex,
    oldIdToNewIdMap,
  };

  return `<!--<paper-paste-start data-embed="${JSON.stringify(embedData)}"></paper-paste-start>-->`;
};

export type { DomToPaperOptions };
