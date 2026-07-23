import { overlayColor } from "./utils/overlay-color.js";

export const VERSION = process.env.VERSION as string;

export const PANEL_BACKGROUND = "var(--rg-panel-bg)";
export const PANEL_SHADOW = "var(--rg-shadow)";

export const VIEWPORT_MARGIN_PX = 8;
export const OFFSCREEN_POSITION = -1000;

export const SELECTION_LERP_FACTOR = 0.95;

export const FEEDBACK_DURATION_MS = 1500;
export const FADE_DURATION_MS = 125;
export const FADE_COMPLETE_BUFFER_MS = 125;
export const KEYDOWN_SPAM_TIMEOUT_MS = 200;
export const BLUR_DEACTIVATION_THRESHOLD_MS = 500;
export const WINDOW_REFOCUS_GRACE_PERIOD_MS = 200;
export const INPUT_FOCUS_ACTIVATION_DELAY_MS = 400;
export const INPUT_TEXT_SELECTION_ACTIVATION_DELAY_MS = 600;
export const DEFAULT_KEY_HOLD_DURATION_MS = 100;
export const DEFAULT_MAX_CONTEXT_LINES = 3;
export const MAX_TRACE_CONTEXT_LINES = 20;
// Path segments marking app-owned reusable UI directories (shadcn's
// components/ui, a monorepo packages/ui, headless primitives). A bare `/ui/`
// is deliberately excluded: Next's App Router convention places feature code
// under `app/ui/`, so matching any `ui` segment would demote real features.
// See is-shared-ui-source-path for how these are treated.
export const SHARED_UI_SOURCE_PATH_SEGMENTS: readonly string[] = [
  "/components/ui/",
  "/packages/ui/",
  "/design-system/",
  "/design-systems/",
  "/primitives/",
];
export const SYMBOLICATION_TIMEOUT_MS = 5000;
// Upper bound on a single queued source-resolution fetch (bundle, source map,
// and symbolication together). Sits above SYMBOLICATION_TIMEOUT_MS so the
// symbolication POST degrades on its own first; this only fires when bippy's
// un-cancelable bundle fetch is stuck behind a saturated connection pool, and
// exists to free the queue slot rather than to bound normal latency.
export const SOURCE_FETCH_TIMEOUT_MS = 8000;
// Cap on react-grab's own concurrent source-resolution fetches.
//
// Resolving a grabbed element's source location fetches its JS bundle and source
// map (through bippy) and, on Next.js, POSTs to the dev symbolication endpoint.
// In development these run over HTTP/1.1, where Chrome keeps at most ~6 open
// connections per origin. A real app's data fetches routinely hold all 6 (a
// dashboard waiting on several slow API calls), so a react-grab fetch waits in
// the browser's connection queue behind them. That wait is what surfaces as the
// "Grabbing…" state never resolving.
//
// We cannot speed up the app's requests, so we avoid adding to the pressure
// instead: capping our own in-flight fetches below the pool size leaves
// connections for the page and bounds the fan-out when a drag-select hovers
// dozens of elements in a row. Without the cap each hovered element starts its
// own fetch at once, and react-grab becomes part of the saturation it is
// waiting on.
//
// This is deliberately NOT the `keepalive` request limit. `keepalive` (the
// modern navigator.sendBeacon) keeps a request alive across a page navigation,
// but the Fetch spec caps its body at 64 KB and allows only ~15 inflight
// keepalive requests for the whole page; source bundles are larger than 64 KB
// and a grab never navigates away, so keepalive does not apply here. The limit
// we work around is the ordinary per-origin connection pool, which constrains
// every fetch whether or not it sets keepalive.
export const MAX_CONCURRENT_SOURCE_FETCHES = 3;
export const MIN_HOLD_FOR_ACTIVATION_AFTER_COPY_MS = 200;
export const FINDER_TIMEOUT_MS = 200;
export const MAX_SELECTOR_COMBINATIONS = 10_000;
export const SELECTOR_ATTR_VALUE_MAX_LENGTH_CHARS = 120;
export const BROAD_SELECTOR_TARGET_DESCENDANT_RATIO = 0.5;

export const DRAG_THRESHOLD_PX = 2;

export const ELEMENT_DETECTION_THROTTLE_MS = 32;
export const PENDING_DETECTION_STALENESS_MS = 200;
export const COMPONENT_NAME_DEBOUNCE_MS = 100;
export const DRAG_PREVIEW_DEBOUNCE_MS = 32;
export const BOUNDS_CACHE_TTL_MS = 16;
export const THREE_PREVIEW_ARRAY_MAX_LENGTH = 4;
export const THREE_SELECTION_FALLBACK_BOUNDS_PX = 16;
export const IFRAME_LAYOUT_METRICS_CACHE_TTL_MS = 16;
export const BORDER_RADIUS_CACHE_TTL_MS = 200;
export const BORDER_RADIUS_SCALE_PRECISION_DECIMAL_PLACES = 3;
export const BOUNDS_RECALC_INTERVAL_MS = 100;
export const ELEMENT_RELINK_GRACE_ATTEMPTS = 1;

export const AUTO_SCROLL_EDGE_THRESHOLD_PX = 25;
export const AUTO_SCROLL_SPEED_PX = 10;

export const Z_INDEX_OVERLAY = 2147483647;
export const Z_INDEX_OVERLAY_CANVAS = 2147483645;
export const DOCUMENT_NODE_TYPE = 9;

export const DRAG_LERP_FACTOR = 0.7;
export const BASELINE_FRAME_DURATION_MS = 1000 / 60;
export const MIN_FRAME_DELTA_MS = 1;
export const LERP_CONVERGENCE_THRESHOLD_PX = 0.5;
export const OPACITY_CONVERGENCE_THRESHOLD = 0.01;
export const MIN_DEVICE_PIXEL_RATIO = 2;

export const OVERLAY_BORDER_COLOR_DRAG = overlayColor(0.4);
export const OVERLAY_FILL_COLOR_DRAG = overlayColor(0.05);
export const OVERLAY_BORDER_COLOR_DEFAULT = overlayColor(0.5);
export const OVERLAY_FILL_COLOR_DEFAULT = overlayColor(0.08);
export const FROZEN_GLOW_COLOR = overlayColor(0.15);
export const FROZEN_GLOW_EDGE_PX = 50;

export const ARROW_HEIGHT_PX = 8;
export const ARROW_MIN_SIZE_PX = 4;
export const ARROW_MAX_LABEL_WIDTH_RATIO = 0.2;
export const ARROW_TIP_RADIUS_PX = 1;
export const ARROW_CENTER_PERCENT = 50;
export const ARROW_LABEL_MARGIN_PX = 16;
// The arrow base and the panel edge touch at the same fractional CSS
// coordinate. Without overlap, that shared edge anti-aliases as a hairline
// seam at certain zoom levels and devicePixelRatios. Overlapping by 1px
// hides the seam without shifting the visual tip noticeably (both fills
// are var(--rg-panel-bg) so the overlap is invisible).
export const ARROW_PANEL_OVERLAP_PX = 1;
export const LABEL_GAP_PX = 4;
export const PREVIEW_TEXT_MAX_LENGTH = 100;
export const PREVIEW_ATTR_VALUE_MAX_LENGTH = 15;
export const PREVIEW_PRIORITY_ATTRS: readonly string[] = [
  "id",
  "class",
  "aria-label",
  "data-testid",
  "role",
  "name",
  "title",
];

export const PREVIEW_IDENTIFYING_ATTRS = new Set([
  "id",
  "data-testid",
  "aria-label",
  "href",
  "src",
  "alt",
  "type",
  "name",
  "placeholder",
  "role",
  "for",
  "action",
  "method",
  "title",
  "disabled",
  "checked",
  "readonly",
  "required",
  "selected",
  "open",
]);

export const PREVIEW_DESCENDANT_TEXT_TAGS = new Set(["a", "code", "pre"]);
export const PREVIEW_SKIPPED_TEXT_TAGS = new Set(["script", "style", "template", "noscript"]);

export const MODIFIER_KEYS: readonly string[] = ["Meta", "Control", "Shift", "Alt"];

export const ARROW_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

export const FROZEN_ELEMENT_ATTRIBUTE = "data-react-grab-frozen";
export const SAME_ORIGIN_FRAME_ATTRIBUTE = "data-react-grab-same-origin-frame";

// Pausing animations individually via WAAPI avoids the full-document style
// recalc that a universal `*` selector forces — profiled at ~62ms on a real
// (CSS-heavy) app even with a single animation on the page. But each WAAPI
// pause/finish has a per-animation cost, so above this many running animations
// one batched `*`-selector recalc wins. Real apps sit far below this; the
// threshold only guards pathological animation-heavy pages.
export const WAAPI_GLOBAL_FREEZE_MAX_ANIMATIONS = 200;

// Theme-detection thresholds (see detect-app-theme.ts). A background below
// this relative luminance reads as a dark theme.
export const LUMINANCE_DARK_THRESHOLD = 0.18;
// Text this light sits well above any light theme's (dark) body text, so it only
// appears when the app paints onto a dark surface - revealing a dark theme.
export const LIGHT_TEXT_LUMINANCE_THRESHOLD = 0.6;
// Faint text composites toward the backdrop, making its own color an unreliable
// theme signal, so the foreground heuristic ignores anything more translucent.
export const OPAQUE_TEXT_MIN_ALPHA = 0.5;

// Marks the overlay's comment input; queried by the demo driver and prompt-mode checks in core.
export const REACT_GRAB_INPUT_ATTRIBUTE = "data-react-grab-input";

export const USER_IGNORE_ATTRIBUTE = "data-react-grab-ignore";

export const VIEWPORT_COVERAGE_THRESHOLD = 0.9;
export const OVERLAY_Z_INDEX_THRESHOLD = 1000;
export const DEV_TOOLS_OVERLAY_Z_INDEX_THRESHOLD = 2147483600;

export const TOOLBAR_SNAP_MARGIN_PX = 16;
export const TOOLBAR_FADE_IN_DELAY_MS = 500;
export const TOOLBAR_SNAP_ANIMATION_DURATION_MS = 300;
export const TOOLBAR_DRAG_THRESHOLD_PX = 5;
export const TOOLBAR_VELOCITY_MULTIPLIER_MS = 150;
export const TOOLBAR_COLLAPSED_SHORT_PX = 16;
export const TOOLBAR_COLLAPSED_LONG_PX = 30;
// Must cover the longest expand path: size is 220ms, opacity is 80ms delay
// + 180ms fade = 260ms. If this fires before the opacity tail, shouldDim()
// can flip true mid-fade-in and start a dim transition on the outer
// container while the inner content is still materializing.
export const TOOLBAR_COLLAPSE_ANIMATION_DURATION_MS = 260;
export const TOOLBAR_DEFAULT_WIDTH_PX = 58;
export const TOOLBAR_DEFAULT_HEIGHT_PX = 28;
export const TOOLBAR_DEFAULT_POSITION_RATIO = 0.5;
export const DEFAULT_ACTION_ID = "copy";
export const COMMENT_ACTION_ID = "comment";

export const TOOLTIP_DELAY_MS = 400;
export const TOOLTIP_GRACE_PERIOD_MS = 800;

export const MENU_PANEL_CORNER_RADIUS_PX = 14;
export const MENU_HIGHLIGHT_CORNER_SHAPE = "superellipse(1.25)";

// The select icon is a paper-airplane shape whose tip points toward the
// top-right corner of its viewBox, ~45° above the +x axis. Subtracting this
// from the mouse-relative angle yields the rotation needed to aim the tip at
// the cursor.
export const SELECT_ICON_NATURAL_POINT_ANGLE_DEG = -45;
export const SELECT_ICON_ROTATION_TRANSITION_MS = 180;
export const SELECT_ICON_POINT_MIN_DISTANCE_PX = 4;

export const DRAG_SELECTION_COVERAGE_THRESHOLD = 0.75;
export const DRAG_SELECTION_SAMPLE_SPACING_PX = 32;
export const DRAG_SELECTION_MIN_SAMPLES_PER_AXIS = 3;
export const DRAG_SELECTION_MAX_SAMPLES_PER_AXIS = 20;
export const DRAG_SELECTION_MAX_TOTAL_SAMPLE_POINTS = 100;
export const DRAG_SELECTION_EDGE_INSET_PX = 1;

export const MAX_ARROW_NAVIGATION_HISTORY = 50;
export const MIN_HORIZONTAL_NAV_SIZE_PX = 16;

export const MAX_HIERARCHY_ANCESTORS = 6;
export const MAX_HIERARCHY_SIBLINGS = 8;
export const MAX_HIERARCHY_CHILDREN = 6;
export const MAX_HIERARCHY_SCAN_STEPS = 100;
export const HIERARCHY_INDENT_PX = 12;

export const ELEMENT_POSITION_CACHE_DISTANCE_THRESHOLD_PX = 2;
export const ELEMENT_POSITION_THROTTLE_MS = 16;
export const POINTER_EVENTS_RESUME_DEBOUNCE_MS = 100;
export const VISIBILITY_CACHE_TTL_MS = 50;

export const ZOOM_DETECTION_THRESHOLD = 0.01;

export const MOUNT_ROOT_RECHECK_DELAY_MS = 1000;

// Must match the CSS exit transition on dropdown components or the DOM
// unmounts mid-animation.
export const DROPDOWN_ANIMATION_DURATION_MS = 120;
export const DROPDOWN_VIEWPORT_PADDING_PX = 8;
export const DROPDOWN_ANCHOR_GAP_PX = 8;
export const TOOLBAR_MENU_MIN_WIDTH_PX = 100;
export const HIERARCHY_MENU_MIN_WIDTH_PX = 160;
export const DROPDOWN_OFFSCREEN_POSITION = { left: -9999, top: -9999 };

export const DROPDOWN_EDGE_TRANSFORM_ORIGIN = {
  left: "left center",
  right: "right center",
  top: "center top",
  bottom: "center bottom",
};

export const NEXTJS_REVALIDATION_DELAY_MS = 1000;

export const TEXTAREA_MAX_HEIGHT_PX = 95;

export const IME_COMPOSING_KEY_CODE = 229;
export const SELECTION_LABEL_OFFSCREEN_PX = -9999;
export const SHIFT_SELECTION_LABEL_MIN_ANCHOR_RATIO = 0;
export const SHIFT_SELECTION_LABEL_MAX_ANCHOR_RATIO = 1;
export const SHIFT_SELECTION_LABEL_FALLBACK_ANCHOR_RATIO = 0;

// Demo driver (react-grab/demo). The pointer artwork is 19×26 with its tip near
// the top-left, so the cursor element is offset by these so the tip — not the
// bounding box — lands on the animation target.
export const DEMO_CURSOR_TIP_X_PX = 5;
export const DEMO_CURSOR_TIP_Y_PX = 4;
export const DEMO_CURSOR_FADE_MS = 300;
export const DEMO_CLICK_PULSE_MS = 220;
export const DEMO_CLICK_PULSE_MIN_SCALE = 0.8;
export const DEMO_TYPE_CHAR_MS = 55;

export const RELEVANT_CSS_PROPERTIES = new Set([
  "display",
  "position",
  "top",
  "right",
  "bottom",
  "left",
  "z-index",
  "overflow",
  "overflow-x",
  "overflow-y",
  "width",
  "height",
  "min-width",
  "min-height",
  "max-width",
  "max-height",
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "flex-direction",
  "flex-wrap",
  "justify-content",
  "align-items",
  "align-self",
  "align-content",
  "flex-grow",
  "flex-shrink",
  "flex-basis",
  "order",
  "gap",
  "row-gap",
  "column-gap",
  "grid-template-columns",
  "grid-template-rows",
  "grid-template-areas",
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "line-height",
  "letter-spacing",
  "text-align",
  "text-decoration-line",
  "text-decoration-style",
  "text-transform",
  "text-overflow",
  "text-shadow",
  "white-space",
  "word-break",
  "overflow-wrap",
  "vertical-align",
  "color",
  "background-color",
  "background-image",
  "background-position",
  "background-size",
  "background-repeat",
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
  "border-bottom-left-radius",
  "border-bottom-right-radius",
  "box-shadow",
  "opacity",
  "transform",
  "filter",
  "backdrop-filter",
  "object-fit",
  "object-position",
]);
