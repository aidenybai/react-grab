import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import {
  CAPTURE_PIXEL_RATIO,
  CAPTURE_SCALE,
  DEFAULT_MAX_MEAN_CHANNEL_DELTA,
  DIST_BUNDLE_RELATIVE_PATH,
  FIREFOX_TEXT_METRICS_DENSE_REGION_MAX_DIFF_RATIO,
  FIREFOX_TEXT_METRICS_DENSE_REGION_MAX_MEAN_CHANNEL_DELTA,
  FIREFOX_TEXT_METRICS_MAX_DIFF_RATIO,
  FIREFOX_TEXT_METRICS_MAX_MEAN_CHANNEL_DELTA,
  PIXELMATCH_COLOR_THRESHOLD,
  SCORE_DECIMAL_PLACES,
  STRICT_MAX_DIFF_RATIO,
  WEBKIT_GLYPH_RASTER_MAX_DIFF_RATIO,
  WEBKIT_GLYPH_RASTER_MAX_MEAN_CHANNEL_DELTA,
} from "./constants";
import type { FixtureBrowserEngine, RegionFixtureSpec } from "./types";
import { computeMeanChannelDelta } from "./utils/mean-channel-delta";
import { stabilizePage } from "./utils/stabilize-page";

const packageRootPath = fileURLToPath(new URL("..", import.meta.url));
const distBundlePath = resolve(packageRootPath, DIST_BUNDLE_RELATIVE_PATH);

const textHeavyEngineOverrides: Pick<RegionFixtureSpec, "webkit" | "firefox"> = {
  webkit: {
    maxDiffRatio: WEBKIT_GLYPH_RASTER_MAX_DIFF_RATIO,
    maxMeanChannelDelta: WEBKIT_GLYPH_RASTER_MAX_MEAN_CHANNEL_DELTA,
  },
  firefox: {
    maxDiffRatio: FIREFOX_TEXT_METRICS_MAX_DIFF_RATIO,
    maxMeanChannelDelta: FIREFOX_TEXT_METRICS_MAX_MEAN_CHANNEL_DELTA,
  },
};

const regionManifest: RegionFixtureSpec[] = [
  {
    id: "site-analytics-dashboard-light",
    region: { x: 137, y: 93, width: 641, height: 402 },
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    ...textHeavyEngineOverrides,
  },
  {
    id: "site-news-front-dark",
    region: { x: 305, y: 51, width: 512, height: 384 },
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    ...textHeavyEngineOverrides,
    firefox: {
      maxDiffRatio: FIREFOX_TEXT_METRICS_DENSE_REGION_MAX_DIFF_RATIO,
      maxMeanChannelDelta: FIREFOX_TEXT_METRICS_DENSE_REGION_MAX_MEAN_CHANNEL_DELTA,
    },
  },
  {
    id: "site-kanban-board-midnight",
    region: { x: 63, y: 210, width: 900, height: 300 },
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    ...textHeavyEngineOverrides,
  },
  {
    id: "60-kitchen-sink",
    region: { x: 20, y: 40, width: 480, height: 360 },
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    ...textHeavyEngineOverrides,
  },
  {
    id: "site-video-grid-light",
    region: { x: 451, y: 133, width: 333, height: 257 },
    maxDiffRatio: STRICT_MAX_DIFF_RATIO,
    ...textHeavyEngineOverrides,
  },
];

const resolveBrowserEngine = (browserName: string | undefined): FixtureBrowserEngine => {
  if (browserName === "webkit" || browserName === "firefox") return browserName;
  return "chromium";
};

test.describe("region capture", () => {
  for (const fixture of regionManifest) {
    test(`region:${fixture.id}`, async ({ page }, testInfo) => {
      const browserEngine = resolveBrowserEngine(testInfo.project.use.browserName);
      const browserOverride = browserEngine === "chromium" ? undefined : fixture[browserEngine];

      await page.goto(`/${fixture.id}.html`);
      await stabilizePage(page, { preserveAnimations: false });
      await page.addScriptTag({ path: distBundlePath });

      const actualPngDataUrl = await page.evaluate(
        async ({ region, pixelRatio, scale }) => {
          const captureResult = await window.FastHtmlToImage.captureRegion(region, {
            pixelRatio,
            scale,
          });
          return captureResult.toPngDataUrl();
        },
        {
          region: fixture.region,
          pixelRatio: CAPTURE_PIXEL_RATIO,
          scale: CAPTURE_SCALE,
        },
      );

      const expectedPngBuffer = await page.screenshot({
        clip: fixture.region,
        scale: "css",
        animations: "disabled",
        caret: "hide",
      });

      const base64Payload = actualPngDataUrl.slice(actualPngDataUrl.indexOf(",") + 1);
      const actualPng = PNG.sync.read(Buffer.from(base64Payload, "base64"));
      const expectedPng = PNG.sync.read(expectedPngBuffer);

      expect(actualPng.width, "capture width matches region width").toBe(expectedPng.width);
      expect(actualPng.height, "capture height matches region height").toBe(expectedPng.height);

      const diffPng = new PNG({ width: expectedPng.width, height: expectedPng.height });
      const diffPixelCount = pixelmatch(
        expectedPng.data,
        actualPng.data,
        diffPng.data,
        expectedPng.width,
        expectedPng.height,
        { threshold: PIXELMATCH_COLOR_THRESHOLD },
      );
      const score = diffPixelCount / (expectedPng.width * expectedPng.height);
      const meanChannelDelta = computeMeanChannelDelta(expectedPng.data, actualPng.data);

      const expectedPngPath = testInfo.outputPath("expected.png");
      const actualPngPath = testInfo.outputPath("actual.png");
      const diffPngPath = testInfo.outputPath("diff.png");
      writeFileSync(expectedPngPath, PNG.sync.write(expectedPng));
      writeFileSync(actualPngPath, PNG.sync.write(actualPng));
      writeFileSync(diffPngPath, PNG.sync.write(diffPng));
      await testInfo.attach("expected", { path: expectedPngPath, contentType: "image/png" });
      await testInfo.attach("actual", { path: actualPngPath, contentType: "image/png" });
      await testInfo.attach("diff", { path: diffPngPath, contentType: "image/png" });

      const maxDiffRatio = browserOverride?.maxDiffRatio ?? fixture.maxDiffRatio;
      expect(
        score,
        `diff ratio ${score.toFixed(SCORE_DECIMAL_PLACES)} exceeds budget ${maxDiffRatio}`,
      ).toBeLessThanOrEqual(maxDiffRatio);

      const maxMeanChannelDelta =
        browserOverride?.maxMeanChannelDelta ??
        fixture.maxMeanChannelDelta ??
        DEFAULT_MAX_MEAN_CHANNEL_DELTA;
      expect(
        meanChannelDelta,
        `mean channel delta ${meanChannelDelta.toFixed(SCORE_DECIMAL_PLACES)} exceeds budget ${maxMeanChannelDelta}`,
      ).toBeLessThanOrEqual(maxMeanChannelDelta);
    });
  }
});
