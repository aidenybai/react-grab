export const FIXTURE_SERVER_PORT = 5179;
export const FIXTURE_SERVER_ORIGIN = `http://localhost:${FIXTURE_SERVER_PORT}`;

export const VIEWPORT_WIDTH_PX = 1280;
export const VIEWPORT_HEIGHT_PX = 720;
export const DEVICE_SCALE_FACTOR = 1;

export const CAPTURE_PIXEL_RATIO = 1;
export const CAPTURE_SCALE = 1;

export const PIXELMATCH_COLOR_THRESHOLD = 0.1;
export const DEFAULT_MAX_DIMENSION_DELTA_PX = 2;

export const STRICT_MAX_DIFF_RATIO = 0.005;
export const FORM_CONTROLS_MAX_DIFF_RATIO = 0.05;
export const INDETERMINATE_FORM_MAX_DIFF_RATIO = 0.008;

export const TRANSFORMED_ROOT_MAX_DIFF_RATIO = 0.011;

export const WEBKIT_GLYPH_RASTER_MAX_DIFF_RATIO = 0.28;
export const WEBKIT_SVG_FALLBACK_MAX_DIFF_RATIO = 0.15;
export const WEBKIT_MEDIA_CHROME_MAX_DIFF_RATIO = 0.1;
export const WEBKIT_ROTATED_EDGE_MAX_DIFF_RATIO = 0.12;
export const WEBKIT_FORM_CHROME_MAX_DIFF_RATIO = 0.014;

export const FIREFOX_TEXT_METRICS_MAX_DIFF_RATIO = 0.17;
// A region cropped to headline-only content concentrates Gecko's foreignObject
// line-height rounding offset (diff PNG shows pure vertical text ghosting)
// with no non-text pixels to dilute the ratio.
export const FIREFOX_TEXT_METRICS_DENSE_REGION_MAX_DIFF_RATIO = 0.19;
export const FIREFOX_BACKDROP_MISSING_MAX_DIFF_RATIO = 0.24;
export const FIREFOX_SUBTLE_RASTER_MAX_DIFF_RATIO = 0.035;
export const FIREFOX_EDGE_ANTIALIAS_MAX_DIFF_RATIO = 0.013;

export const DEFAULT_MAX_MEAN_CHANNEL_DELTA = 1;
export const TRANSFORMED_ROOT_MAX_MEAN_CHANNEL_DELTA = 5;
export const FORM_CONTROLS_MAX_MEAN_CHANNEL_DELTA = 8;
export const INDETERMINATE_FORM_MAX_MEAN_CHANNEL_DELTA = 2;

export const WEBKIT_GLYPH_RASTER_MAX_MEAN_CHANNEL_DELTA = 37;
export const WEBKIT_SVG_FALLBACK_MAX_MEAN_CHANNEL_DELTA = 25;
export const WEBKIT_MEDIA_CHROME_MAX_MEAN_CHANNEL_DELTA = 19;
export const WEBKIT_ROTATED_EDGE_MAX_MEAN_CHANNEL_DELTA = 8;
export const WEBKIT_FORM_CHROME_MAX_MEAN_CHANNEL_DELTA = 2;

export const FIREFOX_TEXT_METRICS_MAX_MEAN_CHANNEL_DELTA = 32;
export const FIREFOX_TEXT_METRICS_DENSE_REGION_MAX_MEAN_CHANNEL_DELTA = 34;
export const FIREFOX_BACKDROP_MISSING_MAX_MEAN_CHANNEL_DELTA = 21;
export const FIREFOX_SUBTLE_RASTER_MAX_MEAN_CHANNEL_DELTA = 8.5;
export const FIREFOX_EDGE_ANTIALIAS_MAX_MEAN_CHANNEL_DELTA = 2;

export const IMAGE_DECODE_TIMEOUT_MS = 2000;

export const SCORE_DECIMAL_PLACES = 5;

export const DIST_BUNDLE_RELATIVE_PATH = "dist/index.global.js";
export const SCORES_REPORT_RELATIVE_PATH = "test-results/fidelity-scores.json";

export const STABILIZATION_STYLE_CSS =
  "*{animation:none!important;transition:none!important;caret-color:transparent!important}";
export const ANIMATION_PRESERVING_STABILIZATION_STYLE_CSS = "*{caret-color:transparent!important}";
