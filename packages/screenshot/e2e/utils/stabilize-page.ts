import type { Page } from "@playwright/test";
import { IMAGE_DECODE_TIMEOUT_MS, STABILIZATION_STYLE_CSS } from "../constants";

export const stabilizePage = async (page: Page): Promise<void> => {
  await page.evaluate(() => document.fonts.ready);
  // decode() never settles for a lazy image outside Chromium's loading window,
  // so each decode races a timeout instead of awaiting unconditionally.
  await page.evaluate(
    (decodeTimeoutMs) =>
      Promise.all(
        Array.from(document.images, (image) =>
          Promise.race([
            image.decode().catch(() => undefined),
            new Promise((resolveTimeout) => setTimeout(resolveTimeout, decodeTimeoutMs)),
          ]),
        ),
      ),
    IMAGE_DECODE_TIMEOUT_MS,
  );
  await page.addStyleTag({ content: STABILIZATION_STYLE_CSS });
  await page.evaluate(() => {
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }
  });
};
