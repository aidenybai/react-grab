import { overlayColor } from "./utils/overlay-color.js";

export const VERSION = process.env.VERSION as string;

export const VIEWPORT_MARGIN_PX = 8;
export const OFFSCREEN_POSITION = -1000;

export const SELECTION_LERP_FACTOR = 0.95;

export const FEEDBACK_DURATION_MS = 1500;
export const FADE_DURATION_MS = 100;
export const FADE_COMPLETE_BUFFER_MS = 150;
export const DISMISS_ANIMATION_BUFFER_MS = 50;
export const KEYDOWN_SPAM_TIMEOUT_MS = 200;
export const BLUR_DEACTIVATION_THRESHOLD_MS = 500;
export const WINDOW_REFOCUS_GRACE_PERIOD_MS = 200;
export const INPUT_FOCUS_ACTIVATION_DELAY_MS = 400;
export const INPUT_TEXT_SELECTION_ACTIVATION_DELAY_MS = 600;
export const DEFAULT_KEY_HOLD_DURATION_MS = 100;
export const DEFAULT_MAX_CONTEXT_LINES = 3;
export const MIN_HOLD_FOR_ACTIVATION_AFTER_COPY_MS = 200;
export const RECENT_THRESHOLD_MS = 10_000;
export const FINDER_TIMEOUT_MS = 200;
export const SELECTOR_ATTR_VALUE_MAX_LENGTH_CHARS = 120;

export const ACTION_CYCLE_IDLE_TRIGGER_MS = 600;

export const DRAG_THRESHOLD_PX = 2;

export const ELEMENT_DETECTION_THROTTLE_MS = 32;
export const PENDING_DETECTION_STALENESS_MS = 200;
export const COMPONENT_NAME_DEBOUNCE_MS = 100;
export const DRAG_PREVIEW_DEBOUNCE_MS = 32;
export const BOUNDS_CACHE_TTL_MS = 16;
export const BOUNDS_RECALC_INTERVAL_MS = 100;

export const AUTO_SCROLL_EDGE_THRESHOLD_PX = 25;
export const AUTO_SCROLL_SPEED_PX = 10;

export const Z_INDEX_HOST = 2147483647;
export const Z_INDEX_LABEL = 2147483647;
export const Z_INDEX_OVERLAY_CANVAS = 2147483645;

export const DRAG_LERP_FACTOR = 0.7;
export const LERP_CONVERGENCE_THRESHOLD_PX = 0.5;
export const OPACITY_CONVERGENCE_THRESHOLD = 0.01;
export const FADE_OUT_BUFFER_MS = 100;
export const MIN_DEVICE_PIXEL_RATIO = 2;

export const OVERLAY_BORDER_COLOR_DRAG = overlayColor(0.4);
export const OVERLAY_FILL_COLOR_DRAG = overlayColor(0.05);
export const OVERLAY_BORDER_COLOR_DEFAULT = overlayColor(0.5);
export const OVERLAY_FILL_COLOR_DEFAULT = overlayColor(0.08);
export const OVERLAY_FILL_COLOR_MARGIN = overlayColor(0.06);
export const OVERLAY_FILL_COLOR_PADDING = overlayColor(0.12);
export const FROZEN_GLOW_COLOR = overlayColor(0.15);
export const FROZEN_GLOW_EDGE_PX = 50;

export const ARROW_HEIGHT_PX = 8;
export const ARROW_MIN_SIZE_PX = 4;
export const ARROW_MAX_LABEL_WIDTH_RATIO = 0.2;
export const ARROW_CENTER_PERCENT = 50;
export const ARROW_LABEL_MARGIN_PX = 16;
export const LABEL_GAP_PX = 4;
export const PREVIEW_TEXT_MAX_LENGTH = 100;
export const PREVIEW_ATTR_VALUE_MAX_LENGTH = 15;
export const PREVIEW_MAX_ATTRS = 3;
export const PREVIEW_PRIORITY_ATTRS: readonly string[] = [
  "id",
  "class",
  "aria-label",
  "data-testid",
  "role",
  "name",
  "title",
];

export const MODIFIER_KEYS: readonly string[] = [
  "Meta",
  "Control",
  "Shift",
  "Alt",
];

export const ARROW_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
]);

export const FROZEN_ELEMENT_ATTRIBUTE = "data-react-grab-frozen";

export const USER_IGNORE_ATTRIBUTE = "data-react-grab-ignore";

export const VIEWPORT_COVERAGE_THRESHOLD = 0.9;
export const OVERLAY_Z_INDEX_THRESHOLD = 1000;
export const DEV_TOOLS_OVERLAY_Z_INDEX_THRESHOLD = 2147483600;

export const TOOLTIP_DELAY_MS = 400;
export const TOOLTIP_GRACE_PERIOD_MS = 100;

export const TOOLBAR_SNAP_MARGIN_PX = 16;
export const TOOLBAR_FADE_IN_DELAY_MS = 500;
export const TOOLBAR_SNAP_ANIMATION_DURATION_MS = 300;
export const TOOLBAR_DRAG_THRESHOLD_PX = 5;
export const TOOLBAR_VELOCITY_MULTIPLIER_MS = 150;
export const TOOLBAR_COLLAPSED_SHORT_PX = 14;
export const TOOLBAR_COLLAPSED_LONG_PX = 28;
export const TOOLBAR_COLLAPSE_ANIMATION_DURATION_MS = 150;
export const TOGGLE_ANIMATION_BUFFER_MS = 50;
export const TOOLBAR_DEFAULT_WIDTH_PX = 78;
export const TOOLBAR_DEFAULT_HEIGHT_PX = 28;
export const TOOLBAR_DEFAULT_POSITION_RATIO = 0.5;
export const DEFAULT_ACTION_ID = "comment";
export const TOOLBAR_SHAKE_TOOLTIP_DURATION_MS = 1500;
export const TOOLBAR_HINT_CENTER_OFFSET_PX = 0;
export const SELECTION_HINT_CYCLE_INTERVAL_MS = 3000;
export const SELECTION_HINT_COUNT = 3;

export const TOOLTIP_BASE_CLASS =
  "absolute whitespace-nowrap px-1.5 py-0.5 rounded-[10px] text-[10px] text-black/60 pointer-events-none [corner-shape:superellipse(1.25)] filter-[drop-shadow(0px_1px_2px_#51515140)]";

export const HINT_FLIP_IN_ANIMATION =
  "animate-[hint-flip-in_var(--transition-normal)_ease-out]";

export const DRAG_SELECTION_COVERAGE_THRESHOLD = 0.75;
export const DRAG_SELECTION_SAMPLE_SPACING_PX = 32;
export const DRAG_SELECTION_MIN_SAMPLES_PER_AXIS = 3;
export const DRAG_SELECTION_MAX_SAMPLES_PER_AXIS = 20;
export const DRAG_SELECTION_MAX_TOTAL_SAMPLE_POINTS = 100;
export const DRAG_SELECTION_EDGE_INSET_PX = 1;

export const MAX_ARROW_NAVIGATION_HISTORY = 50;
export const MAX_MEMORY_SESSIONS = 50;

export const MAX_TRANSFORM_ANCESTOR_DEPTH = 6;
export const TRANSFORM_EARLY_BAIL_DEPTH = 3;

export const ELEMENT_POSITION_CACHE_DISTANCE_THRESHOLD_PX = 2;
export const ELEMENT_POSITION_THROTTLE_MS = 16;
export const POINTER_EVENTS_RESUME_DEBOUNCE_MS = 100;
export const VISIBILITY_CACHE_TTL_MS = 50;

export const ZOOM_DETECTION_THRESHOLD = 0.01;

export const MOUNT_ROOT_RECHECK_DELAY_MS = 1000;

export const MAX_COMMENT_ITEMS = 20;
export const MAX_SESSION_STORAGE_SIZE_BYTES = 2 * 1024 * 1024;
export const DROPDOWN_ANIMATION_DURATION_MS = 100;
export const DROPDOWN_HOVER_OPEN_DELAY_MS = 200;
export const DROPDOWN_VIEWPORT_PADDING_PX = 8;
export const DROPDOWN_ANCHOR_GAP_PX = 8;
export const SAFE_POLYGON_BUFFER_PX = 8;
export const DROPDOWN_ICON_SIZE_PX = 11;
export const DROPDOWN_MIN_WIDTH_PX = 180;
export const DROPDOWN_MAX_WIDTH_PX = 280;
export const TOOLBAR_MENU_MIN_WIDTH_PX = 100;
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

export const INSPECT_MAX_PROP_VALUE_LENGTH = 40;
export const INSPECT_MAX_REACT_PROPS = 6;
export const INSPECT_MAX_STRING_TRUNCATE_LENGTH = 30;
export const WCAG_AA_CONTRAST_THRESHOLD = 4.5;
export const WCAG_AAA_CONTRAST_THRESHOLD = 7;

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
