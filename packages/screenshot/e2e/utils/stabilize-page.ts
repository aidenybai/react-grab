import type { Page } from "@playwright/test";
import {
  ANIMATION_PRESERVING_STABILIZATION_STYLE_CSS,
  IMAGE_DECODE_TIMEOUT_MS,
  STABILIZATION_STYLE_CSS,
} from "../constants";

export interface StabilizePageOptions {
  preserveAnimations?: boolean;
}

export const stabilizePage = async (
  page: Page,
  options: StabilizePageOptions = {},
): Promise<void> => {
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
  await page.addStyleTag({
    content: options.preserveAnimations
      ? ANIMATION_PRESERVING_STABILIZATION_STYLE_CSS
      : STABILIZATION_STYLE_CSS,
  });
  await page.evaluate(() => {
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }
  });
};
