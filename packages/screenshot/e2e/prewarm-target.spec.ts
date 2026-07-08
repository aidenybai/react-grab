import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { DIST_BUNDLE_RELATIVE_PATH } from "./constants";

const packageRootPath = fileURLToPath(new URL("..", import.meta.url));
const distBundlePath = resolve(packageRootPath, DIST_BUNDLE_RELATIVE_PATH);

test("prewarm(element) makes the next capture of an unchanged element resolve from cache", async ({
  page,
}) => {
  await page.goto("/60-kitchen-sink.html");
  await page.addScriptTag({ path: distBundlePath });
  const result = await page.evaluate(async () => {
    const target = document.querySelector("#target") ?? document.body;
    const prewarmStart = performance.now();
    await window.FastHtmlToImage.prewarm(target);
    const prewarmMs = performance.now() - prewarmStart;
    const captureStart = performance.now();
    const captureResult = await window.FastHtmlToImage.captureNode(target, { pixelRatio: 1 });
    const pngDataUrl = await captureResult.toPngDataUrl();
    const captureMs = performance.now() - captureStart;
    return { prewarmMs, captureMs, pngByteLength: pngDataUrl.length };
  });
  expect(result.pngByteLength).toBeGreaterThan(0);
  expect(result.captureMs).toBeLessThan(result.prewarmMs);
});
