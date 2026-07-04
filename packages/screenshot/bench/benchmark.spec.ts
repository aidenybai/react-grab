import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import type { BrowserContext, Page, TestInfo } from "@playwright/test";
import { PNG } from "pngjs";
import { CAPTURE_PIXEL_RATIO, CAPTURE_SCALE, SCORE_DECIMAL_PLACES } from "../e2e/constants";
import { decodePngDataUrl } from "../e2e/utils/decode-png-data-url";
import { stabilizePage } from "../e2e/utils/stabilize-page";
import { OUR_LIBRARY_ID, benchFixtureIds, benchLibraries } from "./bench-manifest";
import {
  BENCH_MAX_DIMENSION_DELTA_PX,
  BENCH_RESULTS_RELATIVE_PATH,
  BYTES_PER_KILOBYTE,
  CAPTURE_TIMEOUT_MS,
  COLD_RUN_COUNT,
  LIBRARY_SETUP_ALLOWANCE_MS,
  MEDIAN_QUANTILE,
  MS_DECIMAL_PLACES,
  P95_QUANTILE,
  PNG_KILOBYTES_DECIMAL_PLACES,
  PROFILED_CAPTURE_RUN_COUNT,
  WARM_RUN_COUNT,
} from "./constants";
import type { BenchAdapterKey, BenchLibrarySpec, BenchResultEntry, BenchRunOutcome } from "./types";
import { captureCpuProfile } from "./utils/capture-cpu-profile";
import { computeQuantile } from "./utils/compute-quantile";
import { pngDataUrlByteLength } from "./utils/png-data-url-byte-length";
import { scorePngPair } from "./utils/score-png-pair";

const packageRootPath = fileURLToPath(new URL("..", import.meta.url));
const benchResultsPath = resolve(packageRootPath, BENCH_RESULTS_RELATIVE_PATH);

const benchResults: BenchResultEntry[] = [];

const runBenchInPage = (
  page: Page,
  adapterKey: BenchAdapterKey,
  warmRunCount: number,
): Promise<BenchRunOutcome> =>
  page.evaluate(
    async ({ adapterKey: inPageAdapterKey, warmRunCount, captureTimeoutMs, scale, pixelRatio }) => {
      const targetElement = document.querySelector<HTMLElement>("#target");
      if (!targetElement) {
        throw new Error("fixture is missing a #target element");
      }

      const captureByAdapterKey: Record<
        BenchAdapterKey,
        (element: HTMLElement) => Promise<string>
      > = {
        "react-grab": async (element) => {
          const captureResult = await window.HtmlToImageFast.captureNode(element, {
            scale,
            pixelRatio,
          });
          return captureResult.toPngDataUrl();
        },
        snapdom: async (element) => {
          const captureResult = await window.snapdom(element, {
            scale,
            dpr: pixelRatio,
            embedFonts: true,
          });
          const canvas = await captureResult.toCanvas();
          return canvas.toDataURL("image/png");
        },
        "modern-screenshot": (element) => window.modernScreenshot.domToPng(element, { scale }),
        "html-to-image": (element) => window.htmlToImage.toPng(element, { pixelRatio }),
        html2canvas: async (element) => {
          const canvas = await window.html2canvas(element, { scale });
          return canvas.toDataURL("image/png");
        },
        "dom-to-image-more": (element) => window.domtoimage.toPng(element, { scale }),
      };

      const captureTarget = captureByAdapterKey[inPageAdapterKey];

      const runCaptureOnce = async (): Promise<{ durationMs: number; pngDataUrl: string }> => {
        let timeoutId = 0;
        const timeoutPromise = new Promise<never>((_, rejectTimeout) => {
          timeoutId = window.setTimeout(
            () => rejectTimeout(new Error(`capture timed out after ${captureTimeoutMs}ms`)),
            captureTimeoutMs,
          );
        });
        const startTimeMs = performance.now();
        try {
          const pngDataUrl = await Promise.race([captureTarget(targetElement), timeoutPromise]);
          return { durationMs: performance.now() - startTimeMs, pngDataUrl };
        } finally {
          window.clearTimeout(timeoutId);
        }
      };

      const coldRun = await runCaptureOnce();
      const warmDurationsMs: number[] = [];
      let latestPngDataUrl = coldRun.pngDataUrl;
      for (let warmRunIndex = 0; warmRunIndex < warmRunCount; warmRunIndex++) {
        const warmRun = await runCaptureOnce();
        warmDurationsMs.push(warmRun.durationMs);
        latestPngDataUrl = warmRun.pngDataUrl;
      }
      return { coldMs: coldRun.durationMs, warmDurationsMs, pngDataUrl: latestPngDataUrl };
    },
    {
      adapterKey,
      warmRunCount,
      captureTimeoutMs: CAPTURE_TIMEOUT_MS,
      scale: CAPTURE_SCALE,
      pixelRatio: CAPTURE_PIXEL_RATIO,
    },
  );

const runLibraryOnFreshPage = async (
  context: BrowserContext,
  fixtureId: string,
  library: BenchLibrarySpec,
  warmRunCount: number,
): Promise<BenchRunOutcome> => {
  const page = await context.newPage();
  try {
    await page.goto(`/${fixtureId}.html`);
    await stabilizePage(page);
    await page.addScriptTag({ path: resolve(packageRootPath, library.bundleRelativePath) });

    const benchRunPromise = runBenchInPage(page, library.adapterKey, warmRunCount);
    benchRunPromise.catch(() => undefined);
    const pageBudgetMs = CAPTURE_TIMEOUT_MS * (warmRunCount + 1) + LIBRARY_SETUP_ALLOWANCE_MS;
    let budgetTimeoutId: NodeJS.Timeout | undefined;
    const budgetPromise = new Promise<never>((_, rejectBudget) => {
      budgetTimeoutId = setTimeout(
        () => rejectBudget(new Error(`exceeded total bench budget of ${pageBudgetMs}ms`)),
        pageBudgetMs,
      );
    });
    try {
      return await Promise.race([benchRunPromise, budgetPromise]);
    } finally {
      clearTimeout(budgetTimeoutId);
    }
  } finally {
    await page.close().catch(() => undefined);
  }
};

const benchLibraryOnFixture = async (
  context: BrowserContext,
  fixtureId: string,
  library: BenchLibrarySpec,
  expectedPng: PNG,
): Promise<BenchResultEntry> => {
  try {
    const coldDurationsMs: number[] = [];
    for (let coldRunIndex = 0; coldRunIndex < COLD_RUN_COUNT - 1; coldRunIndex++) {
      const coldOnlyOutcome = await runLibraryOnFreshPage(context, fixtureId, library, 0);
      coldDurationsMs.push(coldOnlyOutcome.coldMs);
    }
    const fullOutcome = await runLibraryOnFreshPage(context, fixtureId, library, WARM_RUN_COUNT);
    coldDurationsMs.push(fullOutcome.coldMs);

    const actualPng = decodePngDataUrl(fullOutcome.pngDataUrl);
    const resultEntry: BenchResultEntry = {
      fixtureId,
      libraryId: library.id,
      ok: true,
      medianColdMs: computeQuantile(coldDurationsMs, MEDIAN_QUANTILE),
      medianWarmMs: computeQuantile(fullOutcome.warmDurationsMs, MEDIAN_QUANTILE),
      p95WarmMs: computeQuantile(fullOutcome.warmDurationsMs, P95_QUANTILE),
      pngByteLength: pngDataUrlByteLength(fullOutcome.pngDataUrl),
    };

    const widthDeltaPx = Math.abs(actualPng.width - expectedPng.width);
    const heightDeltaPx = Math.abs(actualPng.height - expectedPng.height);
    if (
      widthDeltaPx > BENCH_MAX_DIMENSION_DELTA_PX ||
      heightDeltaPx > BENCH_MAX_DIMENSION_DELTA_PX
    ) {
      resultEntry.dimensionMismatch = `${actualPng.width}x${actualPng.height} vs expected ${expectedPng.width}x${expectedPng.height}`;
    } else {
      const pairScore = scorePngPair(expectedPng, actualPng);
      resultEntry.fidelityScore = pairScore.score;
      resultEntry.meanChannelDelta = pairScore.meanChannelDelta;
    }
    return resultEntry;
  } catch (error) {
    return {
      fixtureId,
      libraryId: library.id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

const formatMetric = (value: number | undefined, decimalPlaces: number): number | string =>
  value === undefined ? "—" : Number(value.toFixed(decimalPlaces));

const printFixtureTable = (fixtureId: string, fixtureResults: BenchResultEntry[]): void => {
  console.log(`\n${fixtureId}`);
  console.table(
    fixtureResults.map((entry) => ({
      library: entry.libraryId,
      "median cold ms": formatMetric(entry.medianColdMs, MS_DECIMAL_PLACES),
      "median warm ms": formatMetric(entry.medianWarmMs, MS_DECIMAL_PLACES),
      "p95 warm ms": formatMetric(entry.p95WarmMs, MS_DECIMAL_PLACES),
      "png KB": formatMetric(
        entry.pngByteLength === undefined ? undefined : entry.pngByteLength / BYTES_PER_KILOBYTE,
        PNG_KILOBYTES_DECIMAL_PLACES,
      ),
      "fidelity score":
        entry.dimensionMismatch ?? formatMetric(entry.fidelityScore, SCORE_DECIMAL_PLACES),
      "mean delta": formatMetric(entry.meanChannelDelta, SCORE_DECIMAL_PLACES),
      ok: entry.ok,
    })),
  );
  for (const failedEntry of fixtureResults.filter((entry) => !entry.ok)) {
    console.log(`  ${failedEntry.libraryId} failed: ${failedEntry.error}`);
  }
};

const profileOurLibraryOnFixture = async (
  context: BrowserContext,
  testInfo: TestInfo,
  fixtureId: string,
): Promise<void> => {
  const ourLibrary = benchLibraries.find((library) => library.id === OUR_LIBRARY_ID);
  if (!ourLibrary) return;
  const page = await context.newPage();
  try {
    await page.goto(`/${fixtureId}.html`);
    await stabilizePage(page);
    await page.addScriptTag({ path: resolve(packageRootPath, ourLibrary.bundleRelativePath) });
    await runBenchInPage(page, ourLibrary.adapterKey, 0);
    await captureCpuProfile(page, testInfo, fixtureId, async () => {
      await runBenchInPage(page, ourLibrary.adapterKey, PROFILED_CAPTURE_RUN_COUNT - 1);
    });
  } finally {
    await page.close().catch(() => undefined);
  }
};

test.describe("benchmark", () => {
  for (const fixtureId of benchFixtureIds) {
    test(fixtureId, async ({ context }, testInfo) => {
      if (process.env.PERF_TRACE) {
        await profileOurLibraryOnFixture(context, testInfo, fixtureId);
        return;
      }
      const expectedPage = await context.newPage();
      await expectedPage.goto(`/${fixtureId}.html`);
      await stabilizePage(expectedPage);
      const expectedPngBuffer = await expectedPage.locator("#target").screenshot({
        scale: "css",
        animations: "disabled",
        caret: "hide",
      });
      await expectedPage.close();
      const expectedPng = PNG.sync.read(expectedPngBuffer);

      const fixtureResults: BenchResultEntry[] = [];
      for (const library of benchLibraries) {
        fixtureResults.push(await benchLibraryOnFixture(context, fixtureId, library, expectedPng));
      }
      benchResults.push(...fixtureResults);
      printFixtureTable(fixtureId, fixtureResults);

      const ourResult = fixtureResults.find((entry) => entry.libraryId === OUR_LIBRARY_ID);
      expect(
        ourResult?.ok,
        `${OUR_LIBRARY_ID} failed on ${fixtureId}: ${ourResult?.error ?? "missing result"}`,
      ).toBe(true);
    });
  }
});

test.afterAll(() => {
  if (benchResults.length === 0) {
    return;
  }
  mkdirSync(dirname(benchResultsPath), { recursive: true });
  writeFileSync(benchResultsPath, JSON.stringify(benchResults, null, 2));
  console.log(`bench results written to ${benchResultsPath}`);
});
