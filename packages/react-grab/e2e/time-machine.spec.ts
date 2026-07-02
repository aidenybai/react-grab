import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures.js";
import type { ReactGrabPageObject } from "./fixtures.js";
import { ATTRIBUTE_NAME } from "./constants.js";

const TIME_MACHINE_PANEL_ATTR = "data-react-grab-time-machine-panel";
const TIME_MACHINE_CLOCK_ATTR = "data-react-grab-time-machine-clock";
const TOGGLE_BUTTON_SELECTOR = "[data-testid='toggle-visibility-button']";
const TOGGLEABLE_ELEMENT_SELECTOR = "[data-testid='toggleable-element']";
const SPINNER_SELECTOR = "[data-testid='animated-spin']";

const getSpinnerAnimationPlayState = async (page: Page): Promise<string | null> =>
  page.evaluate((spinnerSelector) => {
    const spinnerElement = document.querySelector(spinnerSelector);
    if (!spinnerElement) return null;
    const spinnerAnimation = spinnerElement.getAnimations()[0];
    return spinnerAnimation?.playState ?? null;
  }, SPINNER_SELECTOR);

const isTimeMachinePanelVisible = async (page: Page): Promise<boolean> =>
  page.evaluate(
    ({ attrName, panelAttr }) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      if (!shadowRoot) return false;
      return shadowRoot.querySelector(`[${panelAttr}]`) !== null;
    },
    { attrName: ATTRIBUTE_NAME, panelAttr: TIME_MACHINE_PANEL_ATTR },
  );

const getTimeMachineValueText = async (page: Page): Promise<string | null> =>
  page.evaluate(
    ({ attrName, panelAttr }) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      if (!shadowRoot) return null;
      const panel = shadowRoot.querySelector(`[${panelAttr}]`);
      const valueElement = panel?.querySelector("[data-react-grab-value]");
      return valueElement?.getAttribute("data-react-grab-value") ?? null;
    },
    { attrName: ATTRIBUTE_NAME, panelAttr: TIME_MACHINE_PANEL_ATTR },
  );

const getTimeMachineClockText = async (page: Page): Promise<string | null> =>
  page.evaluate(
    ({ attrName, clockAttr }) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      if (!shadowRoot) return null;
      const clockElement = shadowRoot.querySelector(`[${clockAttr}]`);
      return clockElement?.textContent?.trim() ?? null;
    },
    { attrName: ATTRIBUTE_NAME, clockAttr: TIME_MACHINE_CLOCK_ATTR },
  );

const openTimeMachinePanel = async (
  reactGrab: ReactGrabPageObject,
  selector: string,
): Promise<void> => {
  await reactGrab.activate();
  await reactGrab.hoverUntilSelected(selector);
  await reactGrab.rightClickElement(selector);
  await reactGrab.clickContextMenuItem("Time Machine");
  await expect.poll(() => isTimeMachinePanelVisible(reactGrab.page)).toBe(true);
};

const clickToolbarTimeMachineButton = async (reactGrab: ReactGrabPageObject): Promise<void> => {
  await reactGrab.page.evaluate((attrName) => {
    const host = document.querySelector(`[${attrName}]`);
    const shadowRoot = host?.shadowRoot;
    const root = shadowRoot?.querySelector(`[${attrName}]`);
    const timeMachineButton = root?.querySelector<HTMLButtonElement>(
      '[data-react-grab-toolbar-action="time-machine"]',
    );
    timeMachineButton?.click();
  }, ATTRIBUTE_NAME);
};

const recordVisibilityToggles = async (reactGrab: ReactGrabPageObject): Promise<void> => {
  await expect(reactGrab.page.locator(TOGGLEABLE_ELEMENT_SELECTOR)).toBeVisible();
  await reactGrab.page.click(TOGGLE_BUTTON_SELECTOR);
  await expect(reactGrab.page.locator(TOGGLEABLE_ELEMENT_SELECTOR)).toBeHidden();
  await reactGrab.page.click(TOGGLE_BUTTON_SELECTOR);
  await expect(reactGrab.page.locator(TOGGLEABLE_ELEMENT_SELECTOR)).toBeVisible();
};

test.describe("Time Machine", () => {
  test("Time Machine action is disabled before any state change", async ({ reactGrab }) => {
    await reactGrab.activate();
    await reactGrab.hoverUntilSelected(TOGGLE_BUTTON_SELECTOR);
    await reactGrab.rightClickElement(TOGGLE_BUTTON_SELECTOR);
    expect(await reactGrab.isContextMenuItemEnabled("Time Machine")).toBe(false);
  });

  test("toolbar Time Machine button opens the panel without selecting an element", async ({
    reactGrab,
  }) => {
    await recordVisibilityToggles(reactGrab);

    await clickToolbarTimeMachineButton(reactGrab);
    await expect.poll(() => isTimeMachinePanelVisible(reactGrab.page)).toBe(true);
    expect(await reactGrab.isOverlayVisible()).toBe(false);
    expect(await getTimeMachineValueText(reactGrab.page)).toBe("2/2");

    await reactGrab.pressArrowLeft();
    await expect(reactGrab.page.locator(TOGGLEABLE_ELEMENT_SELECTOR)).toBeHidden();

    await clickToolbarTimeMachineButton(reactGrab);
    await expect.poll(() => isTimeMachinePanelVisible(reactGrab.page)).toBe(false);
  });

  test("toolbar-opened panel keeps the app live and records new changes", async ({ reactGrab }) => {
    await recordVisibilityToggles(reactGrab);

    await clickToolbarTimeMachineButton(reactGrab);
    await expect.poll(() => isTimeMachinePanelVisible(reactGrab.page)).toBe(true);

    await reactGrab.page.click(TOGGLE_BUTTON_SELECTOR);
    await expect(reactGrab.page.locator(TOGGLEABLE_ELEMENT_SELECTOR)).toBeHidden();
    await expect.poll(() => getTimeMachineValueText(reactGrab.page)).toBe("3/3");
    await expect.poll(() => isTimeMachinePanelVisible(reactGrab.page)).toBe(true);
  });

  test("H shortcut opens the panel when history exists", async ({ reactGrab }) => {
    await recordVisibilityToggles(reactGrab);
    await reactGrab.activate();
    await reactGrab.hoverUntilSelected(TOGGLE_BUTTON_SELECTOR);
    await reactGrab.pressKey("h");
    await expect.poll(() => isTimeMachinePanelVisible(reactGrab.page)).toBe(true);
  });

  test("right-click -> Time Machine opens the panel after state changes", async ({ reactGrab }) => {
    await recordVisibilityToggles(reactGrab);
    await openTimeMachinePanel(reactGrab, TOGGLE_BUTTON_SELECTOR);
    expect(await isTimeMachinePanelVisible(reactGrab.page)).toBe(true);
    expect(await getTimeMachineValueText(reactGrab.page)).toBe("2/2");
    expect(await getTimeMachineClockText(reactGrab.page)).toBe("Now");
  });

  test("arrow keys travel backward and forward through state history", async ({ reactGrab }) => {
    await recordVisibilityToggles(reactGrab);
    await openTimeMachinePanel(reactGrab, TOGGLE_BUTTON_SELECTOR);

    await reactGrab.pressArrowLeft();
    await expect(reactGrab.page.locator(TOGGLEABLE_ELEMENT_SELECTOR)).toBeHidden();
    await expect.poll(() => getTimeMachineValueText(reactGrab.page)).toBe("1/2");

    await reactGrab.pressArrowLeft();
    await expect(reactGrab.page.locator(TOGGLEABLE_ELEMENT_SELECTOR)).toBeVisible();
    await expect.poll(() => getTimeMachineValueText(reactGrab.page)).toBe("0/2");

    await reactGrab.pressArrowRight();
    await expect(reactGrab.page.locator(TOGGLEABLE_ELEMENT_SELECTOR)).toBeHidden();
    await expect.poll(() => getTimeMachineValueText(reactGrab.page)).toBe("1/2");

    await reactGrab.pressArrowRight();
    await expect(reactGrab.page.locator(TOGGLEABLE_ELEMENT_SELECTOR)).toBeVisible();
    await expect.poll(() => getTimeMachineValueText(reactGrab.page)).toBe("2/2");
  });

  test("stepping past either end of history is a no-op", async ({ reactGrab }) => {
    await recordVisibilityToggles(reactGrab);
    await openTimeMachinePanel(reactGrab, TOGGLE_BUTTON_SELECTOR);

    await reactGrab.pressArrowRight();
    await expect.poll(() => getTimeMachineValueText(reactGrab.page)).toBe("2/2");

    await reactGrab.pressArrowLeft();
    await reactGrab.pressArrowLeft();
    await reactGrab.pressArrowLeft();
    await expect.poll(() => getTimeMachineValueText(reactGrab.page)).toBe("0/2");
    await expect(reactGrab.page.locator(TOGGLEABLE_ELEMENT_SELECTOR)).toBeVisible();
  });

  test("timeline shows a lane per component and dragging it travels", async ({ reactGrab }) => {
    await recordVisibilityToggles(reactGrab);
    await clickToolbarTimeMachineButton(reactGrab);
    await expect.poll(() => isTimeMachinePanelVisible(reactGrab.page)).toBe(true);

    const readTimelineInfo = () =>
      reactGrab.page.evaluate((attrName) => {
        const host = document.querySelector(`[${attrName}]`);
        const timeline = host?.shadowRoot?.querySelector("[data-react-grab-time-machine-timeline]");
        const laneArea = timeline?.querySelector("[role='slider']");
        const laneAreaRect = laneArea?.getBoundingClientRect();
        return {
          laneLabels: [...(timeline?.querySelectorAll("span") ?? [])].map(
            (label) => label.textContent,
          ),
          dotCount: timeline?.querySelectorAll("[data-react-grab-timeline-dot]").length ?? 0,
          hasPlayhead: Boolean(timeline?.querySelector("[data-react-grab-timeline-playhead]")),
          laneAreaRect: laneAreaRect
            ? {
                x: laneAreaRect.x,
                y: laneAreaRect.y,
                width: laneAreaRect.width,
                height: laneAreaRect.height,
              }
            : null,
        };
      }, ATTRIBUTE_NAME);

    const timelineInfo = await readTimelineInfo();
    expect(timelineInfo.laneLabels).toEqual(["HiddenToggleSection"]);
    expect(timelineInfo.dotCount).toBe(2);
    expect(timelineInfo.hasPlayhead).toBe(true);
    expect(timelineInfo.laneAreaRect).not.toBeNull();

    // The panel animates in (translate + scale) and resizes as the position
    // label changes, so coordinates are re-read immediately before each
    // scrub instead of being computed once up front.
    await expect
      .poll(async () => {
        const before = (await readTimelineInfo()).laneAreaRect;
        await reactGrab.page.waitForTimeout(100);
        const after = (await readTimelineInfo()).laneAreaRect;
        return before && after && before.x === after.x && before.y === after.y;
      })
      .toBe(true);

    const clickLaneAreaAt = async (widthRatio: number) => {
      const laneAreaRect = (await readTimelineInfo()).laneAreaRect!;
      await reactGrab.page.mouse.click(
        laneAreaRect.x + laneAreaRect.width * widthRatio,
        laneAreaRect.y + laneAreaRect.height / 2,
      );
    };

    await clickLaneAreaAt(0.5);
    await expect.poll(() => getTimeMachineValueText(reactGrab.page)).toBe("1/2");
    await expect(reactGrab.page.locator(TOGGLEABLE_ELEMENT_SELECTOR)).toBeHidden();

    await clickLaneAreaAt(0.99);
    await expect.poll(() => getTimeMachineValueText(reactGrab.page)).toBe("2/2");
    await expect(reactGrab.page.locator(TOGGLEABLE_ELEMENT_SELECTOR)).toBeVisible();
  });

  test("rewinding pins the hover styling captured with each change", async ({ reactGrab }) => {
    const toggleButton = reactGrab.page.locator(TOGGLE_BUTTON_SELECTOR);
    await toggleButton.scrollIntoViewIfNeeded();
    // Real pointer hover so the recorded entries capture the button in
    // their hover chain.
    await toggleButton.hover();
    await toggleButton.click();
    await expect(reactGrab.page.locator(TOGGLEABLE_ELEMENT_SELECTOR)).toBeHidden();
    await toggleButton.click();
    await expect(reactGrab.page.locator(TOGGLEABLE_ELEMENT_SELECTOR)).toBeVisible();
    await reactGrab.page.mouse.move(0, 0);

    await clickToolbarTimeMachineButton(reactGrab);
    await expect.poll(() => isTimeMachinePanelVisible(reactGrab.page)).toBe(true);

    const getPinnedPriority = () =>
      reactGrab.page.evaluate((toggleSelector) => {
        const button = document.querySelector(toggleSelector);
        return button instanceof HTMLElement
          ? button.style.getPropertyPriority("background-color")
          : null;
      }, TOGGLE_BUTTON_SELECTOR);

    expect(await getPinnedPriority()).toBe("");

    await reactGrab.pressArrowLeft();
    await expect.poll(getPinnedPriority).toBe("important");

    await reactGrab.pressArrowRight();
    await expect.poll(getPinnedPriority).toBe("");
  });

  test("rewinding freezes page animations and returning to now resumes them", async ({
    reactGrab,
  }) => {
    await recordVisibilityToggles(reactGrab);
    await clickToolbarTimeMachineButton(reactGrab);
    await expect.poll(() => isTimeMachinePanelVisible(reactGrab.page)).toBe(true);
    expect(await getSpinnerAnimationPlayState(reactGrab.page)).toBe("running");

    await reactGrab.pressArrowLeft();
    await expect.poll(() => getSpinnerAnimationPlayState(reactGrab.page)).toBe("paused");

    await reactGrab.pressArrowRight();
    await expect.poll(() => getSpinnerAnimationPlayState(reactGrab.page)).toBe("running");
  });

  test("closing the panel while rewound lets animations flow again", async ({ reactGrab }) => {
    await recordVisibilityToggles(reactGrab);
    await clickToolbarTimeMachineButton(reactGrab);
    await expect.poll(() => isTimeMachinePanelVisible(reactGrab.page)).toBe(true);

    await reactGrab.pressArrowLeft();
    await expect.poll(() => getSpinnerAnimationPlayState(reactGrab.page)).toBe("paused");

    await reactGrab.pressEscape();
    await expect.poll(() => isTimeMachinePanelVisible(reactGrab.page)).toBe(false);
    await expect.poll(() => getSpinnerAnimationPlayState(reactGrab.page)).toBe("running");
  });

  test("Escape dismisses the panel and keeps the travelled state", async ({ reactGrab }) => {
    await recordVisibilityToggles(reactGrab);
    await openTimeMachinePanel(reactGrab, TOGGLE_BUTTON_SELECTOR);

    await reactGrab.pressArrowLeft();
    await expect(reactGrab.page.locator(TOGGLEABLE_ELEMENT_SELECTOR)).toBeHidden();

    await reactGrab.pressEscape();
    await expect.poll(() => isTimeMachinePanelVisible(reactGrab.page)).toBe(false);
    await expect(reactGrab.page.locator(TOGGLEABLE_ELEMENT_SELECTOR)).toBeHidden();
  });

  test("deactivating grab mode closes the panel", async ({ reactGrab }) => {
    await recordVisibilityToggles(reactGrab);
    await openTimeMachinePanel(reactGrab, TOGGLE_BUTTON_SELECTOR);

    await reactGrab.page.evaluate(() => {
      window.__REACT_GRAB__?.deactivate();
    });
    await expect.poll(() => isTimeMachinePanelVisible(reactGrab.page)).toBe(false);
  });

  test("changes made after rewinding fork the timeline", async ({ reactGrab }) => {
    await recordVisibilityToggles(reactGrab);
    await openTimeMachinePanel(reactGrab, TOGGLE_BUTTON_SELECTOR);

    await reactGrab.pressArrowLeft();
    await reactGrab.pressArrowLeft();
    await expect.poll(() => getTimeMachineValueText(reactGrab.page)).toBe("0/2");

    await reactGrab.pressEscape();
    await expect.poll(() => isTimeMachinePanelVisible(reactGrab.page)).toBe(false);

    await reactGrab.page.click(TOGGLE_BUTTON_SELECTOR);
    await expect(reactGrab.page.locator(TOGGLEABLE_ELEMENT_SELECTOR)).toBeHidden();

    await openTimeMachinePanel(reactGrab, TOGGLE_BUTTON_SELECTOR);
    await expect.poll(() => getTimeMachineValueText(reactGrab.page)).toBe("1/1");
  });
});
