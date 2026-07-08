import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { DIST_BUNDLE_RELATIVE_PATH } from "./constants";

const packageRootPath = fileURLToPath(new URL("..", import.meta.url));
const distBundlePath = resolve(packageRootPath, DIST_BUNDLE_RELATIVE_PATH);

test("embeds only the font faces CSS matching can select", async ({ page }) => {
  await page.goto("/lim-font-weight-pruning.html");
  await page.addScriptTag({ path: distBundlePath });
  const embeddedFontFaceCount = await page.evaluate(async () => {
    const target = document.querySelector("#target");
    if (!target) throw new Error("missing #target");
    const captureResult = await window.FastHtmlToImage.captureNode(target, { pixelRatio: 1 });
    const svgDataUrl = await captureResult.toSvgDataUrl();
    return (decodeURIComponent(svgDataUrl).match(/@font-face/g) ?? []).length;
  });
  expect(embeddedFontFaceCount).toBe(2);
});
