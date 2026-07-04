import {
  FIREFOX_BACKDROP_MISSING_MAX_DIFF_RATIO,
  FIREFOX_BACKDROP_MISSING_MAX_MEAN_CHANNEL_DELTA,
  FIREFOX_EDGE_ANTIALIAS_MAX_DIFF_RATIO,
  FIREFOX_EDGE_ANTIALIAS_MAX_MEAN_CHANNEL_DELTA,
  FIREFOX_SUBTLE_RASTER_MAX_DIFF_RATIO,
  FIREFOX_SUBTLE_RASTER_MAX_MEAN_CHANNEL_DELTA,
  FIREFOX_TEXT_METRICS_MAX_DIFF_RATIO,
  FIREFOX_TEXT_METRICS_MAX_MEAN_CHANNEL_DELTA,
  FORM_CONTROLS_MAX_DIFF_RATIO,
  FORM_CONTROLS_MAX_MEAN_CHANNEL_DELTA,
  INDETERMINATE_FORM_MAX_DIFF_RATIO,
  INDETERMINATE_FORM_MAX_MEAN_CHANNEL_DELTA,
  STRICT_MAX_DIFF_RATIO,
  TRANSFORMED_ROOT_MAX_DIFF_RATIO,
  TRANSFORMED_ROOT_MAX_MEAN_CHANNEL_DELTA,
  WEBKIT_FORM_CHROME_MAX_DIFF_RATIO,
  WEBKIT_FORM_CHROME_MAX_MEAN_CHANNEL_DELTA,
  WEBKIT_GLYPH_RASTER_MAX_DIFF_RATIO,
  WEBKIT_GLYPH_RASTER_MAX_MEAN_CHANNEL_DELTA,
  WEBKIT_MEDIA_CHROME_MAX_DIFF_RATIO,
  WEBKIT_MEDIA_CHROME_MAX_MEAN_CHANNEL_DELTA,
  WEBKIT_ROTATED_EDGE_MAX_DIFF_RATIO,
  WEBKIT_ROTATED_EDGE_MAX_MEAN_CHANNEL_DELTA,
  WEBKIT_SVG_FALLBACK_MAX_DIFF_RATIO,
  WEBKIT_SVG_FALLBACK_MAX_MEAN_CHANNEL_DELTA,
} from "./constants";
import type { FixtureBrowserOverride, FixtureSpec } from "./types";

// Firefox rasterizes foreignObject SVG images with its own line-height rounding
// and glyph antialiasing, so text-dense fixtures diverge from the native
// screenshot even though wrapping and content match (diff confined to glyph
// pixels and per-line vertical drift).
const firefoxTextMetricsOverride: FixtureBrowserOverride = {
  maxDiffRatio: FIREFOX_TEXT_METRICS_MAX_DIFF_RATIO,
  maxMeanChannelDelta: FIREFOX_TEXT_METRICS_MAX_MEAN_CHANNEL_DELTA,
};

// Headless Firefox skips backdrop-filter compositing in the native
// ground-truth screenshot (no blur/brightness under the panes), while the
// capture bakes the filtered underlay, so the panes disagree by design.
const firefoxBackdropMissingOverride: FixtureBrowserOverride = {
  maxDiffRatio: FIREFOX_BACKDROP_MISSING_MAX_DIFF_RATIO,
  maxMeanChannelDelta: FIREFOX_BACKDROP_MISSING_MAX_MEAN_CHANNEL_DELTA,
};

// Firefox-only sub-percent divergence spread across edges, gradients, and
// image resampling between the live compositor and the decoded SVG image.
const firefoxSubtleRasterOverride: FixtureBrowserOverride = {
  maxDiffRatio: FIREFOX_SUBTLE_RASTER_MAX_DIFF_RATIO,
  maxMeanChannelDelta: FIREFOX_SUBTLE_RASTER_MAX_MEAN_CHANNEL_DELTA,
};

// Firefox antialiases box edges and decoded JPEG/PNG pixels slightly
// differently inside SVG images; the diff is a thin halo around edges.
const firefoxEdgeAntialiasOverride: FixtureBrowserOverride = {
  maxDiffRatio: FIREFOX_EDGE_ANTIALIAS_MAX_DIFF_RATIO,
  maxMeanChannelDelta: FIREFOX_EDGE_ANTIALIAS_MAX_MEAN_CHANNEL_DELTA,
};

// WebKit rasterizes glyphs inside SVG images with different antialiasing than
// the live page, so text-dense fixtures flag most glyph pixels.
const webkitGlyphRasterOverride: FixtureBrowserOverride = {
  maxDiffRatio: WEBKIT_GLYPH_RASTER_MAX_DIFF_RATIO,
  maxMeanChannelDelta: WEBKIT_GLYPH_RASTER_MAX_MEAN_CHANNEL_DELTA,
};

// WebKit renders elements with broken/foreign namespaces differently in the
// live page vs the sandboxed SVG image document.
const webkitSvgFallbackOverride: FixtureBrowserOverride = {
  maxDiffRatio: WEBKIT_SVG_FALLBACK_MAX_DIFF_RATIO,
  maxMeanChannelDelta: WEBKIT_SVG_FALLBACK_MAX_MEAN_CHANNEL_DELTA,
};

// WebKit paints native media/scrollbar chrome (poster letterboxing, custom
// scrollbar pseudo-elements) that the capture reproduces with plain CSS.
const webkitMediaChromeOverride: FixtureBrowserOverride = {
  maxDiffRatio: WEBKIT_MEDIA_CHROME_MAX_DIFF_RATIO,
  maxMeanChannelDelta: WEBKIT_MEDIA_CHROME_MAX_MEAN_CHANNEL_DELTA,
};

export const fixtureManifest: FixtureSpec[] = [
  { id: "01-solid-box", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "02-borders-radius", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "03-gradients", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "04-transforms", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "10-typography", maxDiffRatio: STRICT_MAX_DIFF_RATIO, firefox: firefoxTextMetricsOverride },
  {
    id: "11-text-styles",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  { id: "20-flex-layout", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "21-grid-layout", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "30-box-shadows", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "31-filters-opacity", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "40-images", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "41-background-images", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "50-pseudo-elements", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  {
    id: "51-form-controls",
    maxDiffRatio: FORM_CONTROLS_MAX_DIFF_RATIO,
    maxMeanChannelDelta: FORM_CONTROLS_MAX_MEAN_CHANNEL_DELTA,
  },
  { id: "52-scrolled-container", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  {
    id: "53-shadow-dom",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxSubtleRasterOverride,
  },
  { id: "54-canvas-2d", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "55-scrolled-flex-grid", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "60-kitchen-sink", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "70-stress", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  {
    id: "hard-animation-paused",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    preserveAnimations: true,
  },
  {
    // WebKit offsets the animated box-shadow glow around the rotated cards in
    // the SVG raster relative to the live compositor; identical output with
    // memoization disabled confirms it is engine divergence, not a stale memo.
    id: "hard-animation-memo-grid",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    preserveAnimations: true,
    webkit: {
      maxDiffRatio: WEBKIT_ROTATED_EDGE_MAX_DIFF_RATIO,
      maxMeanChannelDelta: WEBKIT_ROTATED_EDGE_MAX_MEAN_CHANNEL_DELTA,
    },
  },
  {
    id: "hard-waapi-paused",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    preserveAnimations: true,
  },
  {
    id: "hard-backdrop-stacked",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxBackdropMissingOverride,
  },
  {
    // Same rotated-edge antialiasing class as lim-transformed-root-rotated;
    // measured 0.00218 / mean 1.03 with the diff confined to the rotated
    // perimeter and the glass pane's blurred edge.
    id: "hard-backdrop-in-transformed-root",
    maxDiffRatio: TRANSFORMED_ROOT_MAX_DIFF_RATIO,
    maxMeanChannelDelta: TRANSFORMED_ROOT_MAX_MEAN_CHANNEL_DELTA,
    screenshotClipTargetAabb: true,
    firefox: firefoxSubtleRasterOverride,
  },
  { id: "hard-blend-clip-mask", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "hard-writing-modes", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "hard-scroll-sticky-nested", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  {
    // WebKit rasterizes the rotated iframe's rounded border and box-shadow
    // differently between the live compositor and the SVG image; the diff is a
    // ring around the rotated card's perimeter.
    id: "hard-cross-origin-iframe-styled",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    webkit: {
      maxDiffRatio: WEBKIT_ROTATED_EDGE_MAX_DIFF_RATIO,
      maxMeanChannelDelta: WEBKIT_ROTATED_EDGE_MAX_MEAN_CHANNEL_DELTA,
    },
  },
  { id: "hard-nested-iframe", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  {
    id: "hard-stress-combo",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    preserveAnimations: true,
    firefox: firefoxEdgeAntialiasOverride,
  },
  {
    id: "dtim-anchor-underline-reset",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxEdgeAntialiasOverride,
  },
  { id: "dtim-background-clip-gloss-text", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "dtim-bare-text-node", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "dtim-bigger-repeated-strips", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "dtim-border-reset-preflight", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "dtim-canvas-text-and-zero-width", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "dtim-css-background", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "dtim-css-mask-icon", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "dtim-custom-element-slots", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "dtim-external-stylesheet", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "dtim-flex-fractional-widths", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "dtim-fontawesome-glyph", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "dtim-foreign-namespace-element", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "dtim-heading-font-size-override", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  {
    id: "dtim-html-anchor-attr-selector",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxSubtleRasterOverride,
  },
  { id: "dtim-icon-font-pseudo", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "dtim-images-nested", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  {
    // Native text-field chrome (border/caret/focus painting) is platform-rendered; same class as 51-form-controls.
    id: "dtim-input-user-value",
    maxDiffRatio: FORM_CONTROLS_MAX_DIFF_RATIO,
    maxMeanChannelDelta: FORM_CONTROLS_MAX_MEAN_CHANNEL_DELTA,
  },
  { id: "dtim-mathml", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "dtim-one-sided-border", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "dtim-pixel-grid-opacity", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "dtim-pseudo-background-image", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "dtim-pseudo-before-after", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "dtim-small-strips", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "dtim-srcset-active-candidate", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  {
    id: "dtim-svg-broken-namespace",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    webkit: webkitSvgFallbackOverride,
  },
  {
    id: "dtim-svg-image-href",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxEdgeAntialiasOverride,
  },
  { id: "dtim-svg-rect", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "dtim-svg-use-out-of-subtree", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "dtim-table-caption-height", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  {
    id: "dtim-table-zero-padding",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    webkit: webkitGlyphRasterOverride,
  },
  {
    id: "dtim-tailwind-preflight-card",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  { id: "dtim-text-nodes", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "dtim-textarea-user-value", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "dtim-visibility-hidden-child", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "hti-bigger", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "hti-border-em", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "hti-css-background", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "hti-external-stylesheet", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "hti-fontawesome-brand-icon", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "hti-hash-colors-attrs", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "hti-images", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "hti-input-user-value", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "hti-lazy-images", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "hti-pixel-grid", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "hti-pseudo-content", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  {
    id: "hti-select-options",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  { id: "hti-small-strips", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  {
    id: "hti-svg-broken-namespace",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    webkit: webkitSvgFallbackOverride,
  },
  { id: "hti-svg-css-fill", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "hti-svg-image-href", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "hti-svg-rect", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "hti-svg-use-hidden-sprite", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "hti-text-nodes", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "hti-textarea-user-value", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  {
    id: "hti-video-poster",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    webkit: webkitMediaChromeOverride,
  },
  { id: "hti-webp-image", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "lim-cross-origin-font-face", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  {
    id: "lim-content-visibility-offscreen",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    scrollTargetIntoViewBeforeScreenshot: true,
  },
  { id: "lim-fixed-in-scrolled-page", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  {
    // WebKit paints its own native checkbox chrome, so the pixel replica of
    // the indeterminate dash diverges slightly more than in Chromium.
    id: "lim-indeterminate-checkbox",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    webkit: {
      maxDiffRatio: WEBKIT_FORM_CHROME_MAX_DIFF_RATIO,
      maxMeanChannelDelta: WEBKIT_FORM_CHROME_MAX_MEAN_CHANNEL_DELTA,
    },
  },
  {
    id: "lim-lazy-image-offscreen",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    scrollTargetIntoViewBeforeScreenshot: true,
    firefox: firefoxEdgeAntialiasOverride,
  },
  {
    // bleed:"auto" resolves to 80px here (1.5 x 40px blur + 8px spread + 12px
    // y-offset), so the clip expands the element AABB by the same 80px.
    id: "lim-bleed-box-shadow",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    screenshotClipTargetAabb: true,
    screenshotClipExpandPx: 80,
    captureBleed: "auto",
  },
  { id: "lim-backdrop-filter", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "lim-cross-origin-iframe", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  {
    id: "lim-marker-lists",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    // Rotated/scaled edges and glyphs are rasterized twice (live compositor vs
    // decoded SVG image) with independently antialiased diagonals; measured
    // 0.00917 / mean 4.63 with the diff confined to the border perimeter and
    // glyph edges, so the budget ratchets just above that.
    id: "lim-transformed-root-rotated",
    maxDiffRatio: TRANSFORMED_ROOT_MAX_DIFF_RATIO,
    maxMeanChannelDelta: TRANSFORMED_ROOT_MAX_MEAN_CHANNEL_DELTA,
    screenshotClipTargetAabb: true,
  },
  {
    // Same antialiasing class as lim-transformed-root-rotated; measured
    // 0.00654 / mean 2.40 (rounded corners + text under non-uniform scale).
    id: "lim-transformed-root-scaled",
    maxDiffRatio: TRANSFORMED_ROOT_MAX_DIFF_RATIO,
    maxMeanChannelDelta: TRANSFORMED_ROOT_MAX_MEAN_CHANNEL_DELTA,
    screenshotClipTargetAabb: true,
    firefox: firefoxSubtleRasterOverride,
  },
  {
    id: "lim-transformed-root-in-scaled-ancestor",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    screenshotClipTargetAabb: true,
  },
  { id: "ms-background-clip-text", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "ms-background-color", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  {
    id: "ms-background-image-jpeg",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxEdgeAntialiasOverride,
  },
  { id: "ms-border-em-width", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "ms-border-image", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "ms-comment-node", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "ms-css-counter", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "ms-emoji-text", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "ms-font-face-cascade-layer", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "ms-font-family-fallback", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "ms-font-icon-fa", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "ms-iframe-same-origin", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "ms-illegal-xml-characters", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  {
    // The broken <img> paints Chromium's native broken-image glyph; captures render it empty — chrome divergence, not fidelity.
    id: "ms-img-formats-and-broken",
    maxDiffRatio: FORM_CONTROLS_MAX_DIFF_RATIO,
    maxMeanChannelDelta: FORM_CONTROLS_MAX_MEAN_CHANNEL_DELTA,
  },
  { id: "ms-malformed-attribute", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "ms-margin", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "ms-mask-image-svg", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "ms-max-height-important-override", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "ms-nested-shadow-dom", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "ms-pseudo-content-custom-font", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  {
    id: "ms-svg-broken-namespace",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    webkit: webkitSvgFallbackOverride,
  },
  { id: "ms-svg-css-fill-foreignobject", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "ms-svg-external-symbol", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "ms-svg-in-shadow-dom", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "ms-svg-rect", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "ms-svg-symbol-currentcolor", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "ms-text-stroke", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  {
    // Native textarea chrome (resizer grip, control painting); same class as 51-form-controls.
    id: "ms-textarea",
    maxDiffRatio: FORM_CONTROLS_MAX_DIFF_RATIO,
    maxMeanChannelDelta: FORM_CONTROLS_MAX_MEAN_CHANNEL_DELTA,
  },
  { id: "ms-video-poster", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  {
    id: "ms-webkit-scrollbar",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    webkit: webkitMediaChromeOverride,
  },
  { id: "snap-blob-urls", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "snap-content-visibility", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  {
    id: "snap-css-counters",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  { id: "snap-css-variables", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  {
    // The indeterminate dash is reproduced by a pixel replica (JS-only property,
    // no markup equivalent), so the budget ratchets to just above the remaining
    // native text-field/select/textarea chrome divergence as in 51-form-controls.
    id: "snap-form-values-indeterminate",
    maxDiffRatio: INDETERMINATE_FORM_MAX_DIFF_RATIO,
    maxMeanChannelDelta: INDETERMINATE_FORM_MAX_MEAN_CHANNEL_DELTA,
    firefox: firefoxSubtleRasterOverride,
  },
  { id: "snap-icon-font-ligature", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "snap-individual-transforms", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "snap-invalid-xml-chars", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "snap-line-clamp", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "snap-mask-longhands", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "snap-outline-no-border", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "snap-picture-srcset", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "snap-pre-margins", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  {
    id: "snap-pseudo-after-inline-position",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  { id: "snap-pseudo-border-spacer", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  {
    id: "snap-pseudo-first-letter",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  { id: "snap-shadow-css-vars", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "snap-sticky-in-scroll", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "snap-svg-defs-gradient-use", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "snap-table-cell-widths", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "snap-video-poster-fallback", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "snap-width-softening-boxes", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "snap-zero-width-borders", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "real-repo-file-browser", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  {
    id: "real-dashboard-analytics",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxSubtleRasterOverride,
  },
  {
    id: "real-landing-glass",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxSubtleRasterOverride,
  },
  {
    id: "site-github-repo-light",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-github-repo-dark",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-github-repo-sepia",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-github-repo-midnight",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-github-repo-ocean",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-github-repo-forest",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-github-repo-rose",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-github-repo-violet",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-github-repo-amber",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-github-repo-slate",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  { id: "site-social-feed-light", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-social-feed-dark", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-social-feed-sepia", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-social-feed-midnight", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-social-feed-ocean", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-social-feed-forest", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-social-feed-rose", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-social-feed-violet", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-social-feed-amber", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-social-feed-slate", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-video-grid-light", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-video-grid-dark", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-video-grid-sepia", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-video-grid-midnight", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-video-grid-ocean", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-video-grid-forest", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-video-grid-rose", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-video-grid-violet", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-video-grid-amber", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-video-grid-slate", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  {
    id: "site-product-page-light",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-product-page-dark",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-product-page-sepia",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-product-page-midnight",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-product-page-ocean",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-product-page-forest",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-product-page-rose",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-product-page-violet",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-product-page-amber",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-product-page-slate",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-pricing-tiers-light",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-pricing-tiers-dark",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-pricing-tiers-sepia",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-pricing-tiers-midnight",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-pricing-tiers-ocean",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-pricing-tiers-forest",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-pricing-tiers-rose",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-pricing-tiers-violet",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-pricing-tiers-amber",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-pricing-tiers-slate",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-wiki-article-light",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-wiki-article-dark",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-wiki-article-sepia",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-wiki-article-midnight",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-wiki-article-ocean",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-wiki-article-forest",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-wiki-article-rose",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-wiki-article-violet",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-wiki-article-amber",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-wiki-article-slate",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  { id: "site-link-aggregator-light", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-link-aggregator-dark", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-link-aggregator-sepia", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-link-aggregator-midnight", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-link-aggregator-ocean", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-link-aggregator-forest", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-link-aggregator-rose", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-link-aggregator-violet", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-link-aggregator-amber", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-link-aggregator-slate", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-comment-thread-light", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-comment-thread-dark", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-comment-thread-sepia", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-comment-thread-midnight", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-comment-thread-ocean", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-comment-thread-forest", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-comment-thread-rose", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-comment-thread-violet", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-comment-thread-amber", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-comment-thread-slate", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-email-inbox-light", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-email-inbox-dark", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-email-inbox-sepia", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-email-inbox-midnight", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-email-inbox-ocean", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-email-inbox-forest", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-email-inbox-rose", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-email-inbox-violet", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-email-inbox-amber", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-email-inbox-slate", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-team-chat-light", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-team-chat-dark", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-team-chat-sepia", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-team-chat-midnight", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-team-chat-ocean", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-team-chat-forest", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-team-chat-rose", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-team-chat-violet", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-team-chat-amber", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-team-chat-slate", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-kanban-board-light", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-kanban-board-dark", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-kanban-board-sepia", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-kanban-board-midnight", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-kanban-board-ocean", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-kanban-board-forest", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-kanban-board-rose", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-kanban-board-violet", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-kanban-board-amber", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-kanban-board-slate", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-music-player-light", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-music-player-dark", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-music-player-sepia", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-music-player-midnight", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-music-player-ocean", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-music-player-forest", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-music-player-rose", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-music-player-violet", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-music-player-amber", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-music-player-slate", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  {
    id: "site-streaming-rows-light",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-streaming-rows-dark",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-streaming-rows-sepia",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-streaming-rows-midnight",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-streaming-rows-ocean",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-streaming-rows-forest",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-streaming-rows-rose",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-streaming-rows-violet",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-streaming-rows-amber",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-streaming-rows-slate",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-search-results-light",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-search-results-dark",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-search-results-sepia",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-search-results-midnight",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-search-results-ocean",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-search-results-forest",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-search-results-rose",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-search-results-violet",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-search-results-amber",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-search-results-slate",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-blog-article-light",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-blog-article-dark",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-blog-article-sepia",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-blog-article-midnight",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-blog-article-ocean",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-blog-article-forest",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-blog-article-rose",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-blog-article-violet",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-blog-article-amber",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-blog-article-slate",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-profile-page-light",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-profile-page-dark",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-profile-page-sepia",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-profile-page-midnight",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-profile-page-ocean",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-profile-page-forest",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-profile-page-rose",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-profile-page-violet",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-profile-page-amber",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-profile-page-slate",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  { id: "site-listing-grid-light", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-listing-grid-dark", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-listing-grid-sepia", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-listing-grid-midnight", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-listing-grid-ocean", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-listing-grid-forest", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-listing-grid-rose", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-listing-grid-violet", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-listing-grid-amber", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-listing-grid-slate", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  {
    id: "site-checkout-form-light",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-checkout-form-dark",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-checkout-form-sepia",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-checkout-form-midnight",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-checkout-form-ocean",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-checkout-form-forest",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-checkout-form-rose",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-checkout-form-violet",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-checkout-form-amber",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-checkout-form-slate",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-analytics-dashboard-light",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-analytics-dashboard-dark",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-analytics-dashboard-sepia",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-analytics-dashboard-midnight",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-analytics-dashboard-ocean",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-analytics-dashboard-forest",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-analytics-dashboard-rose",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-analytics-dashboard-violet",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-analytics-dashboard-amber",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-analytics-dashboard-slate",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-docs-site-light",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-docs-site-dark",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-docs-site-sepia",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-docs-site-midnight",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-docs-site-ocean",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-docs-site-forest",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-docs-site-rose",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-docs-site-violet",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-docs-site-amber",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-docs-site-slate",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  { id: "site-calendar-week-light", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-calendar-week-dark", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-calendar-week-sepia", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-calendar-week-midnight", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-calendar-week-ocean", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-calendar-week-forest", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-calendar-week-rose", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-calendar-week-violet", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-calendar-week-amber", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  { id: "site-calendar-week-slate", maxDiffRatio: STRICT_MAX_DIFF_RATIO },
  {
    id: "site-qa-question-light",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-qa-question-dark",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-qa-question-sepia",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-qa-question-midnight",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-qa-question-ocean",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-qa-question-forest",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-qa-question-rose",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-qa-question-violet",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-qa-question-amber",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-qa-question-slate",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-news-front-light",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-news-front-dark",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-news-front-sepia",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-news-front-midnight",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-news-front-ocean",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-news-front-forest",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-news-front-rose",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-news-front-violet",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-news-front-amber",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-news-front-slate",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-settings-page-light",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-settings-page-dark",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-settings-page-sepia",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-settings-page-midnight",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-settings-page-ocean",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-settings-page-forest",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-settings-page-rose",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-settings-page-violet",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-settings-page-amber",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-settings-page-slate",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-landing-hero-light",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-landing-hero-dark",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-landing-hero-sepia",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-landing-hero-midnight",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-landing-hero-ocean",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-landing-hero-forest",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-landing-hero-rose",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-landing-hero-violet",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-landing-hero-amber",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
  {
    id: "site-landing-hero-slate",
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    firefox: firefoxTextMetricsOverride,
  },
];
