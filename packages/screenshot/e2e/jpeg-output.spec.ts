import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { DIST_BUNDLE_RELATIVE_PATH } from "./constants";

const packageRootPath = fileURLToPath(new URL("..", import.meta.url));
const distBundlePath = resolve(packageRootPath, DIST_BUNDLE_RELATIVE_PATH);

test("jpeg output", async ({ page }) => {
  await page.goto("/01-solid-box.html");
  await page.addScriptTag({ path: distBundlePath });
  const result = await page.evaluate(async () => {
    const target = document.querySelector("#target") ?? document.body;
    const captureResult = await window.FastHtmlToImage.captureNode(target, { pixelRatio: 1 });
    const jpegBlob = await captureResult.toJpegBlob(0.9);
    const jpegDataUrl = await captureResult.toJpegDataUrl();
    const decodedImage = new Image();
    decodedImage.src = jpegDataUrl;
    await decodedImage.decode();
    return {
      blobType: jpegBlob.type,
      blobSize: jpegBlob.size,
      dataUrlPrefix: jpegDataUrl.slice(0, 15),
      decodedWidth: decodedImage.naturalWidth,
      expectedWidth: Math.ceil(captureResult.width),
    };
  });
  expect(result.blobType).toBe("image/jpeg");
  expect(result.blobSize).toBeGreaterThan(0);
  expect(result.dataUrlPrefix).toBe("data:image/jpeg");
  expect(result.decodedWidth).toBe(result.expectedWidth);
});
