export const DEFAULT_SCALE = 1;
export const DEFAULT_RESOURCE_TIMEOUT_MS = 8000;
export const RESOURCE_CACHE_CAP = 150;
export const BASELINE_CACHE_CAP = 256;
export const RASTER_PNG_CACHE_CAP = 2;
export const MAX_CANVAS_DIMENSION_PX = 16384;
export const MIN_CAPTURE_DIMENSION_PX = 1;
export const SANDBOX_OFFSCREEN_LEFT_PX = -9999;
export const SANDBOX_SIZE_PX = 64;
export const DECODE_SETTLE_FRAME_COUNT = 2;
export const ANIMATION_FRAME_FALLBACK_MS = 100;
export const PSEUDO_PREFLIGHT_RULE_BUDGET = 1000;
export const MARGIN_ESCAPE_GEOMETRY_TOLERANCE_PX = 0.6;
export const LINEAR_TRANSFORM_IDENTITY_EPSILON = 0.0001;
export const DEFAULT_BLEED_PX = 0;
// Region culling keeps everything within this distance of the region
// unconditionally; it covers ink overflow the AABB walk cannot see cheaply
// (glyph overhang from italics/swashes, decoration/underline extent).
export const REGION_INK_OVERFLOW_MARGIN_PX = 32;
// Elements between the ink margin and this distance get a precise paint-bleed
// check (box-shadow/filter/outline/text-shadow extents); anything farther out
// is culled without style reads, so blurs reaching farther than this are
// ignored by design.
export const DEFAULT_REGION_CULL_MARGIN_PX = 256;
// box-shadow blur-radius b means a Gaussian with sigma = b/2, so 1.5b covers
// 3 sigma (>99% of the falloff); filter blur(r) sets sigma = r directly.
export const SHADOW_BLUR_EXTENT_FACTOR = 1.5;
export const FILTER_BLUR_EXTENT_SIGMA_FACTOR = 3;

export const BASE64_ENCODE_CHUNK_SIZE_BYTES = 0x8000;
export const DEFAULT_BLOB_MIME_TYPE = "application/octet-stream";

export const GENERATED_CLASS_PREFIX = "rgs-";
export const SVG_NAMESPACE_URI = "http://www.w3.org/2000/svg";
export const XHTML_NAMESPACE_URI = "http://www.w3.org/1999/xhtml";
export const XLINK_NAMESPACE_URI = "http://www.w3.org/1999/xlink";

export const TRANSPARENT_BACKGROUND_COLOR = "rgba(0, 0, 0, 0)";

// Computed transform values for scale-0: Chromium serializes scale(0) and
// scaleX(0) to their matrix forms; the keyword forms cover engines that
// return the authored function unchanged.
export const ZERO_SCALE_TRANSFORMS = new Set([
  "matrix(0, 0, 0, 1, 0, 0)",
  "matrix(0, 0, 0, 0, 0, 0)",
  "scaleX(0)",
  "scale(0)",
  "scaleY(0)",
]);

export const OVERLAY_POSITIONS = new Set(["absolute", "fixed"]);

export const ABSOLUTE_CONTAINING_BLOCK_POSITIONS = new Set([
  "relative",
  "absolute",
  "fixed",
  "sticky",
]);

// checkbox.indeterminate is a JS-only property that cannot survive XML
// serialization, so indeterminate checkboxes are swapped for a pixel replica
// of Chromium's rendering: an accent-filled 2px-rounded rect with a centered
// white dash inset 20% horizontally and 40% vertically
// (NativeThemeBase::PaintCheckbox ratios).
export const INDETERMINATE_DASH_INSET_WIDTH_RATIO = 0.2;
export const INDETERMINATE_DASH_INSET_HEIGHT_RATIO = 0.4;
export const CHECKBOX_BORDER_RADIUS_PX = 2;
export const DEFAULT_ACCENT_COLOR = "rgb(0, 117, 255)";

export const TRANSPARENT_PIXEL_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
export const IFRAME_PLACEHOLDER_BACKGROUND_COLOR = "#d9d9d9";
export const IFRAME_BRIDGE_REQUEST_MESSAGE_TYPE = "fast-html-to-image:iframe-capture-request";
export const IFRAME_BRIDGE_RESPONSE_MESSAGE_TYPE = "fast-html-to-image:iframe-capture-response";
export const IFRAME_BRIDGE_RESPONSE_TIMEOUT_MS = 2000;

// box-sizing: Chromium's border-box theming for form controls comes from
// LayoutTheme style adjustment, which does not run for foreignObject content
// rasterized through an <img>, so an omitted equal-to-baseline value regresses
// to content-box there. border-*-width: a 0px width produced by
// border-style:none matches the baseline and would be dropped, letting an
// emitted border-style resurrect the default "medium" (3px) width.
export const CONCRETE_VALUE_STYLE_PROPS = new Set([
  "width",
  "height",
  "font-size",
  "inline-size",
  "block-size",
  "transform-origin",
  "perspective-origin",
  "box-sizing",
  "border-top-width",
  "border-right-width",
  "border-bottom-width",
  "border-left-width",
]);

// On appearance:auto controls, an authored border width - even one equal to
// the UA default - counts as author styling and switches Chromium off the
// native themed painting (white select chrome since ~M143) onto legacy
// ButtonFace rendering, so equal-to-baseline widths must stay omitted there.
export const BORDER_WIDTH_STYLE_PROPS = new Set([
  "border-top-width",
  "border-right-width",
  "border-bottom-width",
  "border-left-width",
]);

export const SIZE_STYLE_PROPS = ["width", "height", "inline-size", "block-size"];

// Table box sizes come from the table layout algorithm; freezing them as hard
// values grows captioned tables by the caption height and re-wraps cells, so
// widths become min-width floors and heights stay content-driven (snapdom
// #209/#429/#434 class of bugs).
export const TABLE_BOX_TAGS = new Set([
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "td",
  "th",
  "colgroup",
  "col",
]);

export const MIN_WIDTH_FLOOR_TABLE_TAGS = new Set(["table", "td", "th"]);

export const SVG_TEMPLATE_CONTAINER_TAGS = new Set([
  "defs",
  "symbol",
  "pattern",
  "mask",
  "clipPath",
  "marker",
  "linearGradient",
  "radialGradient",
  "filter",
]);

// Presentation attributes sit below class rules in the cascade, but our diffed
// classes omit properties equal to the UA default, which would let a stale
// attribute (e.g. fill="red" overridden by CSS) win inside the capture.
export const SVG_PAINT_PRESENTATION_ATTRIBUTES = [
  "fill",
  "fill-opacity",
  "fill-rule",
  "stroke",
  "stroke-opacity",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-dasharray",
  "stroke-dashoffset",
  "color",
  "opacity",
];

// Props whose initial value is currentColor: baseline equality is meaningless
// because the sandbox baseline resolves currentColor against a different color,
// so they are emitted iff they diverge from the element's own color (and
// omitted when equal, which also dodges the Chromium quirk where an explicit
// -webkit-text-fill-color on the element suppresses ::first-letter color).
export const CURRENTCOLOR_DEFAULT_STYLE_PROPS = [
  "border-top-color",
  "border-right-color",
  "border-bottom-color",
  "border-left-color",
  "border-block-start-color",
  "border-block-end-color",
  "border-inline-start-color",
  "border-inline-end-color",
  "text-decoration-color",
  "text-emphasis-color",
  "outline-color",
  "column-rule-color",
  "-webkit-text-fill-color",
  "-webkit-text-stroke-color",
];

export const SVG_URL_REFERENCE_STYLE_PROPS = [
  "fill",
  "stroke",
  "filter",
  "clip-path",
  "mask",
  "mask-image",
  "marker-start",
  "marker-mid",
  "marker-end",
];

// ::marker only accepts font properties plus this restricted set
// (CSS Lists Level 3 "marker-properties"); everything else is ignored.
export const MARKER_STYLE_PROPS = new Set([
  "color",
  "content",
  "direction",
  "unicode-bidi",
  "white-space",
  "text-combine-upright",
]);

export const FIRST_LETTER_STYLE_PROP_PREFIXES = [
  "font",
  "color",
  "background",
  "margin",
  "padding",
  "border",
  "float",
  "vertical-align",
  "line-height",
  "letter-spacing",
  "word-spacing",
  "text-transform",
  "text-decoration",
  "text-shadow",
  "box-shadow",
  "opacity",
  "-webkit-text",
];

export const EXPLICIT_SNAPSHOT_PROPS = [
  "-webkit-text-stroke-color",
  "-webkit-text-stroke-width",
  "-webkit-text-fill-color",
];

export const WAAPI_KEYFRAME_META_KEYS = new Set([
  "offset",
  "computedOffset",
  "easing",
  "composite",
]);

// Properties that can diverge from the sandbox baseline without appearing in
// any author stylesheet: UA styling driven by element state or presentational
// attributes, layout values resolved by the engine (sizes, table layout,
// flex sizing), and every property the capture pipeline reads directly.
// Everything else only changes when author CSS, inline styles, or WAAPI
// animations mention it, so the snapshot can skip reading it.
export const ALWAYS_SNAPSHOT_STYLE_PROPS = [
  "display",
  "position",
  "top",
  "right",
  "bottom",
  "left",
  "float",
  "clear",
  "box-sizing",
  "width",
  "height",
  "inline-size",
  "block-size",
  "min-width",
  "min-height",
  "max-width",
  "max-height",
  "aspect-ratio",
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "overflow-x",
  "overflow-y",
  "z-index",
  "vertical-align",
  "flex-grow",
  "flex-shrink",
  "flex-basis",
  "order",
  "border-top-width",
  "border-right-width",
  "border-bottom-width",
  "border-left-width",
  "border-top-style",
  "border-right-style",
  "border-bottom-style",
  "border-left-style",
  "border-top-color",
  "border-right-color",
  "border-bottom-color",
  "border-left-color",
  "border-top-left-radius",
  "border-top-right-radius",
  "border-bottom-right-radius",
  "border-bottom-left-radius",
  "border-block-start-color",
  "border-block-end-color",
  "border-inline-start-color",
  "border-inline-end-color",
  "outline-color",
  "outline-style",
  "outline-width",
  "outline-offset",
  "color",
  "background-color",
  "background-image",
  "background-position-x",
  "background-position-y",
  "background-size",
  "background-repeat",
  "background-origin",
  "background-clip",
  "background-attachment",
  "opacity",
  "visibility",
  "box-shadow",
  "transform",
  "transform-origin",
  "transform-style",
  "rotate",
  "scale",
  "translate",
  "perspective",
  "perspective-origin",
  "filter",
  "backdrop-filter",
  "mix-blend-mode",
  "clip-path",
  "object-fit",
  "object-position",
  "appearance",
  "accent-color",
  "color-scheme",
  "content",
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "font-stretch",
  "font-variant-caps",
  "line-height",
  "letter-spacing",
  "word-spacing",
  "white-space",
  "white-space-collapse",
  "text-wrap-mode",
  "text-align",
  "text-align-last",
  "text-indent",
  "text-transform",
  "text-decoration-line",
  "text-decoration-color",
  "text-decoration-style",
  "text-decoration-thickness",
  "text-emphasis-color",
  "text-shadow",
  "text-overflow",
  "word-break",
  "overflow-wrap",
  "direction",
  "unicode-bidi",
  "writing-mode",
  "text-orientation",
  "column-rule-color",
  "list-style-type",
  "list-style-position",
  "list-style-image",
  "caption-side",
  "border-collapse",
  "border-spacing",
  "empty-cells",
  "table-layout",
  "content-visibility",
];

// Properties whose getComputedStyle resolved value depends on the element's
// own layout (used sizes, resolved percentages, matrix-serialized transforms,
// grid track sizing), so they can differ between elements that match the exact
// same style rules and must be re-read per element even on a memo hit.
export const PER_ELEMENT_SNAPSHOT_STYLE_PROPS = [
  "width",
  "height",
  "inline-size",
  "block-size",
  "top",
  "right",
  "bottom",
  "left",
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "transform",
  "transform-origin",
  "perspective-origin",
  "grid-template-columns",
  "grid-template-rows",
];

export const INSET_STYLE_PROPS = ["top", "right", "bottom", "left"];

// Per-element props whose resolved value is pinned by the matched rules as
// long as every declaration reaching them stays in this set's units.
export const CLASS_STABLE_CANDIDATE_STYLE_PROPS = new Set([
  ...INSET_STYLE_PROPS,
  "transform",
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
]);

// Values whose resolution cannot depend on the element's own layout: absolute
// lengths, font-relative lengths (font-size is pinned by the memo key), and
// viewport-relative lengths (constant page-wide). Percentages, auto, calc(),
// var(), and anything unrecognized stay per-element.
export const BOX_RELATIVE_VALUE_PATTERN = /%|calc\(|var\(|min\(|max\(|clamp\(/;

export const STABLE_DECLARED_VALUE_PATTERN =
  /^(0|-?\d*\.?\d+(px|em|rem|ch|ex|pt|pc|cm|mm|in|vw|vh|vmin|vmax))( (0|-?\d*\.?\d+(px|em|rem|ch|ex|pt|pc|cm|mm|in|vw|vh|vmin|vmax)))*$/;

export const FULL_SNAPSHOT_TAGS = new Set([
  "input",
  "select",
  "textarea",
  "button",
  "option",
  "optgroup",
  "progress",
  "meter",
  "details",
  "summary",
  "dialog",
  "video",
  "audio",
]);

export const NON_PAINTING_STYLE_PROPS = new Set([
  "cursor",
  "pointer-events",
  "touch-action",
  "user-select",
  "-webkit-user-select",
  "-webkit-user-drag",
  "-webkit-tap-highlight-color",
  "will-change",
  "zoom",
  "caret-color",
  "-webkit-locale",
  "speak",
  "page",
  "app-region",
  "d",
]);

export const SKIPPED_CLONE_TAGS = new Set([
  "script",
  "style",
  "link",
  "meta",
  "noscript",
  "template",
  "title",
  "base",
  "head",
  "slot",
]);

export const UNRECURSED_CLONE_TAGS = new Set(["img", "video", "canvas", "iframe", "textarea"]);

export const REPLACED_ELEMENT_TAGS = new Set([
  "img",
  "video",
  "canvas",
  "iframe",
  "embed",
  "object",
  "input",
  "select",
  "textarea",
  "audio",
  "progress",
  "meter",
  "svg",
]);

export const GENERIC_FONT_FAMILIES = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-serif",
  "ui-sans-serif",
  "ui-monospace",
  "ui-rounded",
  "emoji",
  "math",
  "fangsong",
]);

export const INHERITED_STYLE_PROPS = new Set([
  "color",
  "-webkit-text-fill-color",
  "-webkit-text-stroke-color",
  "direction",
  "visibility",
  "line-height",
  "letter-spacing",
  "word-spacing",
  "white-space",
  "white-space-collapse",
  "word-break",
  "overflow-wrap",
  "text-align",
  "text-align-last",
  "text-indent",
  "text-transform",
  "text-shadow",
  "text-rendering",
  "text-wrap",
  "text-wrap-mode",
  "text-wrap-style",
  "tab-size",
  "hyphens",
  "quotes",
  "border-collapse",
  "border-spacing",
  "caption-side",
  "empty-cells",
  "color-scheme",
  "accent-color",
  "writing-mode",
  "text-orientation",
  "paint-order",
  "image-rendering",
  "color-interpolation",
  "fill",
  "fill-opacity",
  "fill-rule",
  "stroke",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-opacity",
  "stroke-width",
]);
