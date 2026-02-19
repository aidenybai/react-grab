import { test, expect } from "./fixtures.js";
import type { ReactGrabPageObject } from "./fixtures.js";

interface ViewportRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const getViewportRect = async (
  reactGrab: ReactGrabPageObject,
  selector: string,
): Promise<ViewportRect | null> => {
  return reactGrab.page.evaluate((sel) => {
    const element = document.querySelector(sel);
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    return {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
    };
  }, selector);
};

const setHiddenToggleSectionMarginTopPx = async (
  reactGrab: ReactGrabPageObject,
  marginTopPx: number,
) => {
  await reactGrab.page.evaluate((marginTop) => {
    const section = document.querySelector(
      '[data-testid="hidden-toggle-section"]',
    );
    if (section instanceof HTMLElement) {
      section.style.marginTop = `${marginTop}px`;
    }
  }, marginTopPx);
};

const toggleToggleableElement = async (reactGrab: ReactGrabPageObject) => {
  await reactGrab.page
    .locator('[data-testid="toggle-visibility-button"]')
    .click({ force: true });
};

const copyElementViaApi = async (
  reactGrab: ReactGrabPageObject,
  selector: string,
) => {
  await reactGrab.page.evaluate(() => navigator.clipboard.writeText(""));
  const didCopy = await reactGrab.copyElementViaApi(selector);
  expect(didCopy).toBe(true);
  await expect
    .poll(() => reactGrab.getClipboardContent(), { timeout: 5000 })
    .toBeTruthy();
  // HACK: allow history item to be persisted + mapped
  await reactGrab.page.waitForTimeout(300);
};

const expectCloseTo = (
  actual: number,
  expected: number,
  tolerancePx: number,
) => {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerancePx);
};

test.describe("History selector reacquire", () => {
  test("should reacquire a remounted element and update hover preview bounds", async ({
    reactGrab,
  }) => {
    const toggleableSelector = '[data-testid="toggleable-element"]';

    await reactGrab.page
      .locator('[data-testid="hidden-toggle-section"]')
      .scrollIntoViewIfNeeded();

    const beforeRect = await getViewportRect(reactGrab, toggleableSelector);
    expect(beforeRect).not.toBeNull();

    await copyElementViaApi(reactGrab, toggleableSelector);

    await expect
      .poll(() => reactGrab.isHistoryButtonVisible(), { timeout: 2000 })
      .toBe(true);

    await toggleToggleableElement(reactGrab);
    await expect(reactGrab.page.locator(toggleableSelector)).toHaveCount(0);

    await setHiddenToggleSectionMarginTopPx(reactGrab, 240);

    await toggleToggleableElement(reactGrab);
    await expect(reactGrab.page.locator(toggleableSelector)).toHaveCount(1);
    await reactGrab.page.locator(toggleableSelector).scrollIntoViewIfNeeded();

    const afterRect = await getViewportRect(reactGrab, toggleableSelector);
    expect(afterRect).not.toBeNull();
    expect(Math.abs(afterRect!.y - beforeRect!.y)).toBeGreaterThan(40);

    await reactGrab.clickHistoryButton();
    expect((await reactGrab.getHistoryDropdownInfo()).itemCount).toBe(1);

    await reactGrab.hoverHistoryItem(0);

    await expect
      .poll(async () => {
        const info = await reactGrab.getGrabbedBoxInfo();
        return info.boxes.filter((box) => box.id.startsWith("history-hover-"))
          .length;
      })
      .toBeGreaterThan(0);

    const grabbedBoxes = await reactGrab.getGrabbedBoxInfo();
    const hoverBox = grabbedBoxes.boxes.find((box) =>
      box.id.startsWith("history-hover-"),
    );
    expect(hoverBox).toBeTruthy();

    expectCloseTo(hoverBox!.bounds.x, afterRect!.x, 8);
    expectCloseTo(hoverBox!.bounds.y, afterRect!.y, 8);
    expectCloseTo(hoverBox!.bounds.width, afterRect!.width, 8);
    expectCloseTo(hoverBox!.bounds.height, afterRect!.height, 8);
  });

  test("should show copied label feedback when selecting a reacquired history item", async ({
    reactGrab,
  }) => {
    const toggleableSelector = '[data-testid="toggleable-element"]';

    await reactGrab.page
      .locator('[data-testid="hidden-toggle-section"]')
      .scrollIntoViewIfNeeded();

    await copyElementViaApi(reactGrab, toggleableSelector);

    await toggleToggleableElement(reactGrab);
    await expect(reactGrab.page.locator(toggleableSelector)).toHaveCount(0);

    await setHiddenToggleSectionMarginTopPx(reactGrab, 220);

    await toggleToggleableElement(reactGrab);
    await expect(reactGrab.page.locator(toggleableSelector)).toHaveCount(1);

    await reactGrab.clickHistoryButton();
    await reactGrab.clickHistoryItem(0);

    await expect
      .poll(async () => {
        const labels = await reactGrab.getLabelInstancesInfo();
        return labels.filter((label) => label.status === "copied").length;
      })
      .toBeGreaterThan(0);
  });
});
