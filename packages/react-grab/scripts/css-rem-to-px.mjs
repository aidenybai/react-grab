/**
 * Converts all `rem` units in the built Tailwind CSS to `px`.
 *
 * The toolbar renders inside a shadow DOM for style isolation, but `rem` is
 * always relative to the document root (`<html>`) font-size — not the shadow
 * host. Pages like YouTube set `html { font-size: 10px }`, which shrinks every
 * rem-based value (spacing, radii, text sizes) and breaks the toolbar layout.
 *
 * Running this after Tailwind makes all values absolute, so the toolbar renders
 * identically regardless of the host page's root font-size.
 */
import { readFileSync, writeFileSync } from "node:fs";

const BROWSER_DEFAULT_FONT_SIZE_PX = 16;
const CSS_OUTPUT_PATH = "./dist/styles.css";

const cssContent = readFileSync(CSS_OUTPUT_PATH, "utf8");
const transformedCss = cssContent.replace(
  /(\d*\.?\d+)rem\b/g,
  (_, remValue) => `${parseFloat(remValue) * BROWSER_DEFAULT_FONT_SIZE_PX}px`,
);
writeFileSync(CSS_OUTPUT_PATH, transformedCss);
