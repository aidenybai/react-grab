import { test, expect, type ReactGrabPageObject } from "./fixtures.js";

const ATTR = "data-react-grab";
const STROKE_TIMEOUT_MS = 3000;
const SCROLL_PX = 150;

interface DrawnPixels {
  count: number;
  centroidY: number | null;
  dpr: number;
}

const callDraw = (reactGrab: ReactGrabPageObject): Promise<void> =>
  reactGrab.page.evaluate(() => {
    (window as { __REACT_GRAB__?: { draw: () => void } }).__REACT_GRAB__?.draw();
  });

const startDraw = async (reactGrab: ReactGrabPageObject) => {
  await callDraw(reactGrab);
  await reactGrab.page.waitForFunction(
    (attr) =>
      Boolean(
        document.querySelector(`[${attr}]`)?.shadowRoot?.querySelector("[data-react-grab-draw]"),
      ),
    ATTR,
    { timeout: STROKE_TIMEOUT_MS },
  );
};

const isDrawActive = (reactGrab: ReactGrabPageObject): Promise<boolean> =>
  reactGrab.page.evaluate(
    (attr) =>
      Boolean(
        document.querySelector(`[${attr}]`)?.shadowRoot?.querySelector("[data-react-grab-draw]"),
      ),
    ATTR,
  );

const clickDrawButton = (reactGrab: ReactGrabPageObject): Promise<void> =>
  reactGrab.page.evaluate((attr) => {
    const root = document.querySelector(`[${attr}]`)?.shadowRoot;
    root?.querySelector<HTMLButtonElement>('[data-react-grab-toolbar-action="draw"]')?.click();
  }, ATTR);

const isToolbarActionDisabled = (
  reactGrab: ReactGrabPageObject,
  actionId: string,
): Promise<boolean> =>
  reactGrab.page.evaluate(
    ({ attr, id }) => {
      const root = document.querySelector(`[${attr}]`)?.shadowRoot;
      const button = root?.querySelector(`[data-react-grab-toolbar-action="${id}"]`);
      return button?.getAttribute("aria-disabled") === "true";
    },
    { attr: ATTR, id: actionId },
  );

const getDrawMenuLabels = (reactGrab: ReactGrabPageObject): Promise<string[]> =>
  reactGrab.page.evaluate((attr) => {
    const root = document.querySelector(`[${attr}]`)?.shadowRoot;
    const menu = root?.querySelector("[data-react-grab-draw-menu]");
    if (!menu) return [];
    return Array.from(menu.querySelectorAll('[role="menuitem"] > span:first-child')).map(
      (span) => span.textContent?.trim() ?? "",
    );
  }, ATTR);

const clickDrawMenuItem = (reactGrab: ReactGrabPageObject, label: string): Promise<void> =>
  reactGrab.page.evaluate(
    ({ attr, itemLabel }) => {
      const root = document.querySelector(`[${attr}]`)?.shadowRoot;
      const items = Array.from(
        root?.querySelectorAll<HTMLButtonElement>(
          '[data-react-grab-draw-menu] [role="menuitem"]',
        ) ?? [],
      );
      items.find((button) => (button.textContent ?? "").includes(itemLabel))?.click();
    },
    { attr: ATTR, itemLabel: label },
  );

const drawStroke = async (reactGrab: ReactGrabPageObject, points: Array<[number, number]>) => {
  await reactGrab.page.mouse.move(points[0][0], points[0][1]);
  await reactGrab.page.mouse.down();
  for (let index = 1; index < points.length; index++) {
    await reactGrab.page.mouse.move(points[index][0], points[index][1], { steps: 6 });
  }
  await reactGrab.page.mouse.up();
};

const getDrawnPixels = (reactGrab: ReactGrabPageObject): Promise<DrawnPixels> =>
  reactGrab.page.evaluate((attr) => {
    const root = document.querySelector(`[${attr}]`)?.shadowRoot;
    const canvas = root?.querySelector<HTMLCanvasElement>("[data-react-grab-draw] canvas");
    if (!canvas) return { count: 0, centroidY: null, dpr: window.devicePixelRatio };
    const context = canvas.getContext("2d");
    if (!context) return { count: 0, centroidY: null, dpr: window.devicePixelRatio };
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    let count = 0;
    let rowSum = 0;
    for (let index = 0; index < data.length; index += 4) {
      const isPink =
        data[index] > 150 && data[index + 1] < 130 && data[index + 2] > 100 && data[index + 3] > 40;
      if (isPink) {
        count++;
        rowSum += Math.floor(index / 4 / canvas.width);
      }
    }
    return {
      count,
      centroidY: count ? Math.round(rowSum / count) : null,
      dpr: window.devicePixelRatio,
    };
  }, ATTR);

const waitForDrawPixels = async (reactGrab: ReactGrabPageObject) => {
  await reactGrab.page.waitForFunction(
    (attr) => {
      const root = document.querySelector(`[${attr}]`)?.shadowRoot;
      const canvas = root?.querySelector<HTMLCanvasElement>("[data-react-grab-draw] canvas");
      const context = canvas?.getContext("2d");
      if (!context || !canvas) return false;
      const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
      for (let index = 0; index < data.length; index += 4) {
        if (data[index] > 150 && data[index + 1] < 130 && data[index + 3] > 40) return true;
      }
      return false;
    },
    ATTR,
    { timeout: STROKE_TIMEOUT_MS },
  );
};

test.describe("Draw (draw) mode", () => {
  test("toolbar exposes a Draw button", async ({ reactGrab }) => {
    await expect.poll(() => reactGrab.isToolbarVisible(), { timeout: 2000 }).toBe(true);
    expect(await reactGrab.getToolbarActionPressed("draw")).toBe(false);
  });

  test("Draw is listed in the toolbar menu", async ({ reactGrab }) => {
    await expect.poll(() => reactGrab.isToolbarVisible(), { timeout: 2000 }).toBe(true);
    await reactGrab.rightClickToolbarToggle();
    await expect.poll(() => reactGrab.isToolbarMenuVisible(), { timeout: 2000 }).toBe(true);
    const labels = await reactGrab.getToolbarMenuItemLabels();
    expect(labels.some((label) => label.includes("Draw"))).toBe(true);
  });

  test("api.draw() enters draw mode and toggles back off", async ({ reactGrab }) => {
    await expect.poll(() => reactGrab.isToolbarVisible(), { timeout: 2000 }).toBe(true);
    await startDraw(reactGrab);
    expect(await isDrawActive(reactGrab)).toBe(true);

    await callDraw(reactGrab);
    await expect.poll(() => isDrawActive(reactGrab), { timeout: 2000 }).toBe(false);
  });

  test("clicking the Draw toolbar button enters draw mode", async ({ reactGrab }) => {
    await expect.poll(() => reactGrab.isToolbarVisible(), { timeout: 2000 }).toBe(true);
    await clickDrawButton(reactGrab);
    await expect.poll(() => isDrawActive(reactGrab), { timeout: 2000 }).toBe(true);
  });

  test("the D keyboard shortcut enters draw mode", async ({ reactGrab }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("li:first-child");
    await reactGrab.waitForSelectionBox();
    await reactGrab.page.keyboard.press("d");
    await expect.poll(() => isDrawActive(reactGrab), { timeout: STROKE_TIMEOUT_MS }).toBe(true);
  });

  test("entering draw mode disables the other toolbar buttons", async ({ reactGrab }) => {
    await expect.poll(() => reactGrab.isToolbarVisible(), { timeout: 2000 }).toBe(true);
    await startDraw(reactGrab);

    expect(await isToolbarActionDisabled(reactGrab, "copy")).toBe(true);
    expect(await isToolbarActionDisabled(reactGrab, "comment")).toBe(true);
    expect(await isToolbarActionDisabled(reactGrab, "edit")).toBe(true);
    expect(await isToolbarActionDisabled(reactGrab, "draw")).toBe(false);
  });

  test("draw mode shows a Copy / Cancel menu", async ({ reactGrab }) => {
    await expect.poll(() => reactGrab.isToolbarVisible(), { timeout: 2000 }).toBe(true);
    await startDraw(reactGrab);

    await expect
      .poll(() => getDrawMenuLabels(reactGrab), { timeout: 2000 })
      .toEqual(["Copy", "Cancel"]);
  });

  test("drawing renders pink strokes on the canvas", async ({ reactGrab }) => {
    await expect.poll(() => reactGrab.isToolbarVisible(), { timeout: 2000 }).toBe(true);
    await startDraw(reactGrab);

    await drawStroke(reactGrab, [
      [180, 220],
      [340, 240],
      [520, 220],
    ]);
    await waitForDrawPixels(reactGrab);
    expect((await getDrawnPixels(reactGrab)).count).toBeGreaterThan(0);
  });

  test("Cancel exits draw mode and re-enables the toolbar", async ({ reactGrab }) => {
    await expect.poll(() => reactGrab.isToolbarVisible(), { timeout: 2000 }).toBe(true);
    await startDraw(reactGrab);
    await drawStroke(reactGrab, [
      [180, 220],
      [420, 240],
    ]);

    await clickDrawMenuItem(reactGrab, "Cancel");

    await expect.poll(() => isDrawActive(reactGrab), { timeout: 2000 }).toBe(false);
    expect(await isToolbarActionDisabled(reactGrab, "copy")).toBe(false);
  });

  test("Escape exits draw mode", async ({ reactGrab }) => {
    await expect.poll(() => reactGrab.isToolbarVisible(), { timeout: 2000 }).toBe(true);
    await startDraw(reactGrab);
    await reactGrab.pressEscape();
    await expect.poll(() => isDrawActive(reactGrab), { timeout: 2000 }).toBe(false);
  });

  test("undo removes the last stroke", async ({ reactGrab }) => {
    await expect.poll(() => reactGrab.isToolbarVisible(), { timeout: 2000 }).toBe(true);
    await startDraw(reactGrab);

    await drawStroke(reactGrab, [
      [180, 200],
      [520, 200],
    ]);
    await drawStroke(reactGrab, [
      [180, 320],
      [520, 320],
    ]);
    await waitForDrawPixels(reactGrab);
    const twoStrokes = (await getDrawnPixels(reactGrab)).count;

    await reactGrab.pressModifierKeyCombo("z");

    await expect
      .poll(() => getDrawnPixels(reactGrab).then((p) => p.count), { timeout: 2000 })
      .toBeLessThan(twoStrokes);
  });

  test("drawings stay anchored to the page on scroll", async ({ reactGrab }) => {
    await reactGrab.page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(() => reactGrab.isToolbarVisible(), { timeout: 2000 }).toBe(true);
    await startDraw(reactGrab);

    await drawStroke(reactGrab, [
      [160, 230],
      [340, 230],
      [560, 230],
    ]);
    await waitForDrawPixels(reactGrab);
    const before = await getDrawnPixels(reactGrab);
    expect(before.centroidY).not.toBeNull();

    await reactGrab.page.evaluate((delta) => window.scrollBy(0, delta), SCROLL_PX);
    await reactGrab.page.waitForTimeout(300);
    const after = await getDrawnPixels(reactGrab);

    expect(after.centroidY).not.toBeNull();
    // Scrolling down moves content (and the anchored stroke) up by scroll × DPR.
    const shift = (before.centroidY ?? 0) - (after.centroidY ?? 0);
    expect(Math.abs(shift - SCROLL_PX * before.dpr)).toBeLessThan(24 * before.dpr);
  });
});
