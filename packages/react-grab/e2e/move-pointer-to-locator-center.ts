import type { Locator, Page } from "@playwright/test";
import { POINTER_SETTLE_DELAY_MS } from "./constants.js";

export const movePointerToLocatorCenter = async (page: Page, locator: Locator): Promise<void> => {
  await locator.scrollIntoViewIfNeeded();
  const targetBounds = await locator.boundingBox();
  if (!targetBounds) throw new Error("Cannot move the pointer to an element without bounds");

  const targetCenterX = targetBounds.x + targetBounds.width / 2;
  const targetCenterY = targetBounds.y + targetBounds.height / 2;
  await page.mouse.move(targetCenterX, targetCenterY);
  await page.waitForTimeout(POINTER_SETTLE_DELAY_MS);
  await page.mouse.move(targetCenterX, targetCenterY);
};
