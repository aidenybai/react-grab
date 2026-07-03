import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import {
  CAPTURE_PIXEL_RATIO,
  CAPTURE_SCALE,
  DEFAULT_MAX_DIMENSION_DELTA_PX,
  DEFAULT_MAX_MEAN_CHANNEL_DELTA,
  DIST_BUNDLE_RELATIVE_PATH,
  PIXELMATCH_COLOR_THRESHOLD,
  SCORE_DECIMAL_PLACES,
  SCORES_REPORT_RELATIVE_PATH,
} from "./constants";
import { fixtureManifest } from "./fixture-manifest";
import type {
  FidelityScoreEntry,
  FixtureBrowserEngine,
  HarnessCaptureOptions,
  TargetAabbClip,
} from "./types";
import { cropPng } from "./utils/crop-png";
import { decodePngDataUrl } from "./utils/decode-png-data-url";
import { computeMeanChannelDelta } from "./utils/mean-channel-delta";
import { stabilizePage } from "./utils/stabilize-page";

const packageRootPath = fileURLToPath(new URL("..", import.meta.url));
const distBundlePath = resolve(packageRootPath, DIST_BUNDLE_RELATIVE_PATH);
const scoresReportPath = resolve(packageRootPath, SCORES_REPORT_RELATIVE_PATH);

const fidelityScores: FidelityScoreEntry[] = [];

const resolveBrowserEngine = (browserName: string | undefined): FixtureBrowserEngine => {
  if (browserName === "webkit" || browserName === "firefox") return browserName;
  return "chromium";
};

test.describe("fidelity", () => {
  for (const fixture of fixtureManifest) {
    test(fixture.id, async ({ page }, testInfo) => {
      const browserEngine = resolveBrowserEngine(testInfo.project.use.browserName);
      const browserOverride = browserEngine === "chromium" ? undefined : fixture[browserEngine];
      test.skip(
        Boolean(fixture.skip) || Boolean(browserOverride?.skip),
        "fixture disabled in manifest",
      );

      await page.goto(`/${fixture.id}.html`);
      await stabilizePage(page, { preserveAnimations: Boolean(fixture.preserveAnimations) });
      if (fixture.waitMs !== undefined) {
        await page.waitForTimeout(fixture.waitMs);
      }

      await page.addScriptTag({ path: distBundlePath });

      const captureOptions: HarnessCaptureOptions = {
        pixelRatio: CAPTURE_PIXEL_RATIO,
        scale: CAPTURE_SCALE,
      };
      if (fixture.captureBleed !== undefined) {
        captureOptions.bleed = fixture.captureBleed;
      }
      const actualPngDataUrl = await page.evaluate(async (options) => {
        const targetElement = document.querySelector("#target");
        if (!targetElement) {
          throw new Error("fixture is missing a #target element");
        }
        const captureResult = await window.ReactGrabScreenshot.captureNode(targetElement, options);
        return captureResult.toPngDataUrl();
      }, captureOptions);

      if (fixture.scrollTargetIntoViewBeforeScreenshot) {
        await page.evaluate(() => document.querySelector("#target")?.scrollIntoView());
        await page.waitForFunction(() =>
          Array.from(document.images).every((image) => image.complete && image.naturalWidth > 0),
        );
        await page.evaluate(
          () =>
            new Promise((resolveFrame) =>
              requestAnimationFrame(() => requestAnimationFrame(resolveFrame)),
            ),
        );
      }

      let expectedPngBuffer: Buffer;
      if (fixture.screenshotClipTargetAabb) {
        const targetAabbClip = await page.evaluate((clipExpandPx): TargetAabbClip => {
          const targetElement = document.querySelector("#target");
          if (!targetElement) {
            throw new Error("fixture is missing a #target element");
          }
          const targetRect = targetElement.getBoundingClientRect();
          const clipX = Math.floor(targetRect.left + window.scrollX) - clipExpandPx;
          const clipY = Math.floor(targetRect.top + window.scrollY) - clipExpandPx;
          return {
            x: clipX,
            y: clipY,
            width: Math.ceil(targetRect.right + window.scrollX) + clipExpandPx - clipX,
            height: Math.ceil(targetRect.bottom + window.scrollY) + clipExpandPx - clipY,
          };
        }, fixture.screenshotClipExpandPx ?? 0);
        expectedPngBuffer = await page.screenshot({
          clip: targetAabbClip,
          scale: "css",
          animations: fixture.preserveAnimations ? "allow" : "disabled",
          caret: "hide",
        });
      } else {
        expectedPngBuffer = await page.locator("#target").screenshot({
          scale: "css",
          animations: fixture.preserveAnimations ? "allow" : "disabled",
          caret: "hide",
        });
      }

      const actualPng = decodePngDataUrl(actualPngDataUrl);
      const expectedPng = PNG.sync.read(expectedPngBuffer);

      const maxDimensionDeltaPx =
        browserOverride?.maxDimensionDeltaPx ??
        fixture.maxDimensionDeltaPx ??
        DEFAULT_MAX_DIMENSION_DELTA_PX;
      expect(
        Math.abs(actualPng.width - expectedPng.width),
        `width delta between capture (${actualPng.width}px) and screenshot (${expectedPng.width}px)`,
      ).toBeLessThanOrEqual(maxDimensionDeltaPx);
      expect(
        Math.abs(actualPng.height - expectedPng.height),
        `height delta between capture (${actualPng.height}px) and screenshot (${expectedPng.height}px)`,
      ).toBeLessThanOrEqual(maxDimensionDeltaPx);

      const intersectionWidthPx = Math.min(actualPng.width, expectedPng.width);
      const intersectionHeightPx = Math.min(actualPng.height, expectedPng.height);
      const croppedExpectedPng = cropPng(expectedPng, intersectionWidthPx, intersectionHeightPx);
      const croppedActualPng = cropPng(actualPng, intersectionWidthPx, intersectionHeightPx);
      const diffPng = new PNG({
        width: intersectionWidthPx,
        height: intersectionHeightPx,
      });
      const diffPixelCount = pixelmatch(
        croppedExpectedPng.data,
        croppedActualPng.data,
        diffPng.data,
        intersectionWidthPx,
        intersectionHeightPx,
        { threshold: PIXELMATCH_COLOR_THRESHOLD },
      );
      const score = diffPixelCount / (intersectionWidthPx * intersectionHeightPx);
      const meanChannelDelta = computeMeanChannelDelta(
        croppedExpectedPng.data,
        croppedActualPng.data,
      );

      const expectedPngPath = testInfo.outputPath("expected.png");
      const actualPngPath = testInfo.outputPath("actual.png");
      const diffPngPath = testInfo.outputPath("diff.png");
      writeFileSync(expectedPngPath, PNG.sync.write(croppedExpectedPng));
      writeFileSync(actualPngPath, PNG.sync.write(croppedActualPng));
      writeFileSync(diffPngPath, PNG.sync.write(diffPng));
      await testInfo.attach("expected", { path: expectedPngPath, contentType: "image/png" });
      await testInfo.attach("actual", { path: actualPngPath, contentType: "image/png" });
      await testInfo.attach("diff", { path: diffPngPath, contentType: "image/png" });

      const maxDiffRatio = browserOverride?.maxDiffRatio ?? fixture.maxDiffRatio;
      const scoreEntry: FidelityScoreEntry = {
        id: fixture.id,
        browser: browserEngine,
        score,
        budget: maxDiffRatio,
        meanChannelDelta,
        widthPx: intersectionWidthPx,
        heightPx: intersectionHeightPx,
      };
      fidelityScores.push(scoreEntry);
      // A test failure restarts the worker and wipes the in-memory score list,
      // so every entry is also appended to a per-project JSONL as it is measured.
      mkdirSync(dirname(scoresReportPath), { recursive: true });
      appendFileSync(
        scoresReportPath.replace(/\.json$/, `-${testInfo.project.name}.jsonl`),
        `${JSON.stringify(scoreEntry)}\n`,
      );

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

test.afterAll(() => {
  if (fidelityScores.length === 0) {
    return;
  }
  mkdirSync(dirname(scoresReportPath), { recursive: true });
  writeFileSync(scoresReportPath, JSON.stringify(fidelityScores, null, 2));
  console.table(
    fidelityScores.map((scoreEntry) => ({
      fixture: scoreEntry.id,
      score: Number(scoreEntry.score.toFixed(SCORE_DECIMAL_PLACES)),
      budget: scoreEntry.budget,
      meanDelta: Number(scoreEntry.meanChannelDelta.toFixed(SCORE_DECIMAL_PLACES)),
      pass: scoreEntry.score <= scoreEntry.budget,
      size: `${scoreEntry.widthPx}x${scoreEntry.heightPx}`,
    })),
  );
});
