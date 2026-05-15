import { test, expect } from "./fixtures.js";
import {
  SHIFT_DRAG_PREVIEW_OUTSET_PX,
  SHIFT_DRAG_PREVIEW_STEP_COUNT,
  SHIFT_LABEL_ANCHORED_COUNT,
  SHIFT_LABEL_CLICK_ANCHOR_RATIO,
  SHIFT_LABEL_MOUSE_MOVE_INSET_PX,
  SHIFT_LABEL_POSITION_TOLERANCE_PX,
  SHIFT_LABEL_SECOND_CLICK_ANCHOR_RATIO,
  SHIFT_LABEL_SETTLE_DELAY_MS,
  SHIFT_PENDING_HOVER_STEP_COUNT,
} from "./constants.js";

test.describe("Shift Multi-Select", () => {
  test.describe.configure({ mode: "serial" });

  test("should accumulate multiple elements via shift+click and copy on shift release", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();

    const firstItem = reactGrab.page.locator("[data-testid='todo-list'] li").nth(0);
    const lastItem = reactGrab.page.locator("[data-testid='todo-list'] li").nth(6);

    const firstBox = await firstItem.boundingBox();
    const lastBox = await lastItem.boundingBox();
    if (!firstBox || !lastBox) throw new Error("Could not get bounding boxes");

    await reactGrab.page.keyboard.down("Shift");

    await reactGrab.page.mouse.click(
      firstBox.x + firstBox.width / 2,
      firstBox.y + firstBox.height / 2,
    );
    await reactGrab.page.waitForTimeout(100);

    await reactGrab.page.mouse.click(lastBox.x + lastBox.width / 2, lastBox.y + lastBox.height / 2);
    await reactGrab.page.waitForTimeout(100);

    const stateWhileHoldingShift = await reactGrab.getState();
    expect(stateWhileHoldingShift.isActive).toBe(true);

    await reactGrab.page.keyboard.up("Shift");

    await expect.poll(() => reactGrab.getClipboardContent()).toContain("TodoItem");
  });

  test("should show the pending hover target while shift multi-selecting", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();

    const firstItem = reactGrab.page.locator("[data-testid='todo-list'] li").nth(0);
    const secondItem = reactGrab.page.locator("[data-testid='todo-list'] li").nth(1);

    const firstBox = await firstItem.boundingBox();
    const secondBox = await secondItem.boundingBox();
    if (!firstBox || !secondBox) throw new Error("Could not get bounding boxes");

    await reactGrab.page.keyboard.up("Shift");
    await reactGrab.page.keyboard.down("Shift");
    await reactGrab.page.mouse.click(
      firstBox.x + firstBox.width / 2,
      firstBox.y + firstBox.height / 2,
    );
    await expect.poll(() => reactGrab.getSelectionLabelBounds()).not.toBeNull();

    await reactGrab.page.mouse.move(
      secondBox.x + secondBox.width / 2,
      secondBox.y + secondBox.height / 2,
      { steps: SHIFT_PENDING_HOVER_STEP_COUNT },
    );

    await expect
      .poll(async () => {
        const pendingBounds = await reactGrab.getSelectionBoxBounds();
        if (!pendingBounds) return false;

        return (
          Math.abs(pendingBounds.x - secondBox.x) < SHIFT_LABEL_POSITION_TOLERANCE_PX &&
          Math.abs(pendingBounds.y - secondBox.y) < SHIFT_LABEL_POSITION_TOLERANCE_PX &&
          Math.abs(pendingBounds.width - secondBox.width) < SHIFT_LABEL_POSITION_TOLERANCE_PX &&
          Math.abs(pendingBounds.height - secondBox.height) < SHIFT_LABEL_POSITION_TOLERANCE_PX
        );
      })
      .toBe(true);

    await reactGrab.page.keyboard.up("Shift");
  });

  test("should keep the first shift-selected label anchored to the element", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();

    const firstItem = reactGrab.page.locator("[data-testid='todo-list'] li").nth(0);

    const firstBox = await firstItem.boundingBox();
    if (!firstBox) throw new Error("Could not get bounding box");

    const labelAnchorX = firstBox.x + firstBox.width * SHIFT_LABEL_CLICK_ANCHOR_RATIO;

    await reactGrab.page.keyboard.up("Shift");
    await reactGrab.page.keyboard.down("Shift");
    await reactGrab.page.mouse.click(labelAnchorX, firstBox.y + firstBox.height / 2);

    await expect.poll(() => reactGrab.getSelectionLabelBounds()).not.toBeNull();
    const firstLabelText = await reactGrab.page.evaluate(() => {
      const host = document.querySelector("[data-react-grab]");
      const shadowRoot = host?.shadowRoot;
      const label = shadowRoot?.querySelector("[data-react-grab-selection-label]");
      return label?.textContent?.replace(/\s+/g, " ").trim() ?? "";
    });
    expect(firstLabelText).toContain("TodoItem.li");

    const initialLabelBounds = await reactGrab.getSelectionLabelBounds();
    if (!initialLabelBounds) throw new Error("Could not get initial label bounds");

    await reactGrab.page.mouse.move(
      firstBox.x + firstBox.width - SHIFT_LABEL_MOUSE_MOVE_INSET_PX,
      firstBox.y + firstBox.height / 2,
    );
    await reactGrab.page.waitForTimeout(SHIFT_LABEL_SETTLE_DELAY_MS);

    const movedLabelBounds = await reactGrab.getSelectionLabelBounds();
    if (!movedLabelBounds) throw new Error("Could not get moved label bounds");

    const initialLabelCenterX = initialLabelBounds.label.x + initialLabelBounds.label.width / 2;
    const movedLabelCenterX = movedLabelBounds.label.x + movedLabelBounds.label.width / 2;

    expect(Math.abs(movedLabelCenterX - initialLabelCenterX)).toBeLessThan(
      SHIFT_LABEL_POSITION_TOLERANCE_PX,
    );
    expect(Math.abs(initialLabelCenterX - labelAnchorX)).toBeLessThan(
      SHIFT_LABEL_POSITION_TOLERANCE_PX,
    );

    await reactGrab.page.keyboard.up("Shift");
  });

  test("should keep every shift-selected label anchored to its click position", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();

    const firstItem = reactGrab.page.locator("[data-testid='todo-list'] li").nth(0);
    const secondItem = reactGrab.page.locator("[data-testid='todo-list'] li").nth(1);

    const firstBox = await firstItem.boundingBox();
    const secondBox = await secondItem.boundingBox();
    if (!firstBox || !secondBox) throw new Error("Could not get bounding boxes");

    const firstLabelAnchorX = firstBox.x + firstBox.width * SHIFT_LABEL_CLICK_ANCHOR_RATIO;
    const secondLabelAnchorX =
      secondBox.x + secondBox.width * SHIFT_LABEL_SECOND_CLICK_ANCHOR_RATIO;

    await reactGrab.page.keyboard.up("Shift");
    await reactGrab.page.keyboard.down("Shift");
    await reactGrab.page.mouse.click(firstLabelAnchorX, firstBox.y + firstBox.height / 2);
    await reactGrab.page.mouse.click(secondLabelAnchorX, secondBox.y + secondBox.height / 2);

    await expect
      .poll(async () =>
        reactGrab.page.evaluate(() => {
          const host = document.querySelector("[data-react-grab]");
          const shadowRoot = host?.shadowRoot;
          const labels = shadowRoot?.querySelectorAll<HTMLElement>(
            "[data-react-grab-selection-label]",
          );
          return labels?.length ?? 0;
        }),
      )
      .toBe(SHIFT_LABEL_ANCHORED_COUNT);

    const labelBounds = await reactGrab.page.evaluate(() => {
      const host = document.querySelector("[data-react-grab]");
      const shadowRoot = host?.shadowRoot;
      const labels = shadowRoot?.querySelectorAll<HTMLElement>("[data-react-grab-selection-label]");
      return Array.from(labels ?? []).map((label) => {
        const rect = label.getBoundingClientRect();
        return { x: rect.x, width: rect.width };
      });
    });

    const firstLabelCenterX = labelBounds[0].x + labelBounds[0].width / 2;
    const secondLabelCenterX = labelBounds[1].x + labelBounds[1].width / 2;

    expect(Math.abs(firstLabelCenterX - firstLabelAnchorX)).toBeLessThan(
      SHIFT_LABEL_POSITION_TOLERANCE_PX,
    );
    expect(Math.abs(secondLabelCenterX - secondLabelAnchorX)).toBeLessThan(
      SHIFT_LABEL_POSITION_TOLERANCE_PX,
    );

    await reactGrab.page.keyboard.up("Shift");
  });

  test("should expand the first frozen label without toggling the element below", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();

    const firstItem = reactGrab.page.locator("[data-testid='todo-list'] li").nth(0);
    const secondItem = reactGrab.page.locator("[data-testid='todo-list'] li").nth(1);

    const firstBox = await firstItem.boundingBox();
    const secondBox = await secondItem.boundingBox();
    if (!firstBox || !secondBox) throw new Error("Could not get bounding boxes");

    const firstLabelAnchorX = firstBox.x + firstBox.width * SHIFT_LABEL_CLICK_ANCHOR_RATIO;
    const secondLabelAnchorX =
      secondBox.x + secondBox.width * SHIFT_LABEL_SECOND_CLICK_ANCHOR_RATIO;

    await reactGrab.page.keyboard.up("Shift");
    await reactGrab.page.keyboard.down("Shift");
    await reactGrab.page.mouse.click(firstLabelAnchorX, firstBox.y + firstBox.height / 2);
    await reactGrab.page.mouse.click(secondLabelAnchorX, secondBox.y + secondBox.height / 2);

    await expect
      .poll(async () =>
        reactGrab.page.evaluate(() => {
          const host = document.querySelector("[data-react-grab]");
          const shadowRoot = host?.shadowRoot;
          const labels = shadowRoot?.querySelectorAll<HTMLElement>(
            "[data-react-grab-selection-label]",
          );
          return labels?.length ?? 0;
        }),
      )
      .toBe(SHIFT_LABEL_ANCHORED_COUNT);

    const firstLabelBounds = await reactGrab.page.evaluate(() => {
      const host = document.querySelector("[data-react-grab]");
      const shadowRoot = host?.shadowRoot;
      const label = shadowRoot?.querySelector<HTMLElement>("[data-react-grab-selection-label]");
      if (!label) return null;
      const rect = label.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    });
    if (!firstLabelBounds) throw new Error("Could not get first frozen label bounds");

    await reactGrab.page.mouse.click(
      firstLabelBounds.x + firstLabelBounds.width / 2,
      firstLabelBounds.y + firstLabelBounds.height / 2,
    );

    await expect.poll(async () => (await reactGrab.getState()).isPromptMode).toBe(true);

    const promptLabelInfo = await reactGrab.getSelectionLabelInfo();
    expect(promptLabelInfo.elementsCount).toBe(SHIFT_LABEL_ANCHORED_COUNT);

    await reactGrab.page.keyboard.up("Shift");
    await reactGrab.pressEscape();
  });

  test("should preserve drag preview while shift multi-selecting", async ({ reactGrab }) => {
    await reactGrab.activate();

    const firstItem = reactGrab.page.locator("[data-testid='todo-list'] li").nth(0);
    const secondItem = reactGrab.page.locator("[data-testid='todo-list'] li").nth(1);
    const thirdItem = reactGrab.page.locator("[data-testid='todo-list'] li").nth(2);

    const firstBox = await firstItem.boundingBox();
    const secondBox = await secondItem.boundingBox();
    const thirdBox = await thirdItem.boundingBox();
    if (!firstBox || !secondBox || !thirdBox) throw new Error("Could not get bounding boxes");

    await reactGrab.page.keyboard.up("Shift");
    await reactGrab.page.keyboard.down("Shift");
    await reactGrab.page.mouse.click(
      firstBox.x + firstBox.width / 2,
      firstBox.y + firstBox.height / 2,
    );

    await reactGrab.page.mouse.move(
      secondBox.x - SHIFT_DRAG_PREVIEW_OUTSET_PX,
      secondBox.y - SHIFT_DRAG_PREVIEW_OUTSET_PX,
    );
    await reactGrab.page.mouse.down();
    await reactGrab.page.mouse.move(
      thirdBox.x + thirdBox.width + SHIFT_DRAG_PREVIEW_OUTSET_PX,
      thirdBox.y + thirdBox.height + SHIFT_DRAG_PREVIEW_OUTSET_PX,
      { steps: SHIFT_DRAG_PREVIEW_STEP_COUNT },
    );

    await expect.poll(() => reactGrab.getDragBoxBounds()).not.toBeNull();

    await reactGrab.page.mouse.up();
    await reactGrab.page.keyboard.up("Shift");
  });

  test("should toggle element off when shift+clicking it twice", async ({ reactGrab }) => {
    await reactGrab.activate();

    const firstItem = reactGrab.page.locator("[data-testid='todo-list'] li").nth(0);
    const secondItem = reactGrab.page.locator("[data-testid='todo-list'] li").nth(1);

    const firstBox = await firstItem.boundingBox();
    const secondBox = await secondItem.boundingBox();
    if (!firstBox || !secondBox) throw new Error("Could not get bounding boxes");

    await reactGrab.page.keyboard.down("Shift");

    await reactGrab.page.mouse.click(
      firstBox.x + firstBox.width / 2,
      firstBox.y + firstBox.height / 2,
    );
    await reactGrab.page.waitForTimeout(100);

    await reactGrab.page.mouse.click(
      secondBox.x + secondBox.width / 2,
      secondBox.y + secondBox.height / 2,
    );
    await reactGrab.page.waitForTimeout(100);

    await reactGrab.page.mouse.click(
      firstBox.x + firstBox.width / 2,
      firstBox.y + firstBox.height / 2,
    );
    await reactGrab.page.waitForTimeout(100);

    await reactGrab.page.keyboard.up("Shift");

    await expect.poll(() => reactGrab.getClipboardContent()).toContain("TodoItem");
  });

  test("should not auto-copy until shift is released", async ({ reactGrab }) => {
    await reactGrab.page.evaluate(() => navigator.clipboard.writeText("baseline"));
    await reactGrab.activate();

    const firstItem = reactGrab.page.locator("[data-testid='todo-list'] li").nth(0);
    const firstBox = await firstItem.boundingBox();
    if (!firstBox) throw new Error("Could not get bounding box");

    await reactGrab.page.keyboard.down("Shift");

    await reactGrab.page.mouse.click(
      firstBox.x + firstBox.width / 2,
      firstBox.y + firstBox.height / 2,
    );
    await reactGrab.page.waitForTimeout(400);

    const clipboardWhileShiftHeld = await reactGrab.getClipboardContent();
    expect(clipboardWhileShiftHeld).toBe("baseline");

    expect(await reactGrab.isOverlayVisible()).toBe(true);

    await reactGrab.page.keyboard.up("Shift");

    await expect.poll(() => reactGrab.getClipboardContent()).toContain("TodoItem");
  });

  test("should reset accumulated selection when a non-shift click follows", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();

    const firstItem = reactGrab.page.locator("[data-testid='todo-list'] li").nth(0);
    const secondItem = reactGrab.page.locator("[data-testid='todo-list'] li").nth(1);
    const lastItem = reactGrab.page.locator("[data-testid='todo-list'] li").nth(6);

    const firstBox = await firstItem.boundingBox();
    const secondBox = await secondItem.boundingBox();
    const lastBox = await lastItem.boundingBox();
    if (!firstBox || !secondBox || !lastBox) {
      throw new Error("Could not get bounding boxes");
    }

    await reactGrab.page.keyboard.down("Shift");
    await reactGrab.page.mouse.click(
      firstBox.x + firstBox.width / 2,
      firstBox.y + firstBox.height / 2,
    );
    await reactGrab.page.waitForTimeout(100);
    await reactGrab.page.mouse.click(
      secondBox.x + secondBox.width / 2,
      secondBox.y + secondBox.height / 2,
    );
    await reactGrab.page.waitForTimeout(100);
    await reactGrab.page.keyboard.up("Shift");

    await reactGrab.page.evaluate(() => navigator.clipboard.writeText("baseline"));

    await reactGrab.activate();
    await reactGrab.page.mouse.click(lastBox.x + lastBox.width / 2, lastBox.y + lastBox.height / 2);

    await expect.poll(() => reactGrab.getClipboardContent()).toContain("TodoItem");
  });

  test("should not commit accumulated selection when shift releases over an open context menu", async ({
    reactGrab,
  }) => {
    await reactGrab.page.evaluate(() => navigator.clipboard.writeText("baseline"));
    await reactGrab.activate();

    const firstItem = reactGrab.page.locator("[data-testid='todo-list'] li").nth(0);
    const secondItem = reactGrab.page.locator("[data-testid='todo-list'] li").nth(1);

    const firstBox = await firstItem.boundingBox();
    const secondBox = await secondItem.boundingBox();
    if (!firstBox || !secondBox) throw new Error("Could not get bounding boxes");

    await reactGrab.page.keyboard.down("Shift");
    await reactGrab.page.mouse.click(
      firstBox.x + firstBox.width / 2,
      firstBox.y + firstBox.height / 2,
    );
    await reactGrab.page.waitForTimeout(100);
    await reactGrab.page.mouse.click(
      secondBox.x + secondBox.width / 2,
      secondBox.y + secondBox.height / 2,
    );
    await reactGrab.page.waitForTimeout(100);

    await reactGrab.page.mouse.click(
      secondBox.x + secondBox.width / 2,
      secondBox.y + secondBox.height / 2,
      { button: "right" },
    );
    await reactGrab.page.waitForTimeout(150);
    expect(await reactGrab.isContextMenuVisible()).toBe(true);

    await reactGrab.page.keyboard.up("Shift");
    await reactGrab.page.waitForTimeout(400);

    expect(await reactGrab.getClipboardContent()).toBe("baseline");
    expect(await reactGrab.isContextMenuVisible()).toBe(true);
  });

  test("should render a tag label under each accumulated element", async ({ reactGrab }) => {
    await reactGrab.activate();

    const firstItem = reactGrab.page.locator("[data-testid='todo-list'] li").nth(0);
    const secondItem = reactGrab.page.locator("[data-testid='todo-list'] li").nth(1);

    const firstBox = await firstItem.boundingBox();
    const secondBox = await secondItem.boundingBox();
    if (!firstBox || !secondBox) throw new Error("Could not get bounding boxes");

    await reactGrab.page.keyboard.down("Shift");
    await reactGrab.page.mouse.click(
      firstBox.x + firstBox.width / 2,
      firstBox.y + firstBox.height / 2,
    );
    await reactGrab.page.waitForTimeout(120);
    await reactGrab.page.mouse.click(
      secondBox.x + secondBox.width / 2,
      secondBox.y + secondBox.height / 2,
    );
    await reactGrab.page.waitForTimeout(200);

    const labelTexts = await reactGrab.page.evaluate(() => {
      const host = document.querySelector("[data-react-grab]");
      const shadowRoot = host?.shadowRoot;
      if (!shadowRoot) return [];
      const root = shadowRoot.querySelector("[data-react-grab]");
      if (!root) return [];
      const labels = root.querySelectorAll("[data-react-grab-selection-label]");
      return Array.from(labels).map((label) => label.textContent?.trim() ?? "");
    });

    expect(labelTexts.length).toBeGreaterThanOrEqual(2);
    const concatenatedLabelText = labelTexts.join(" ");
    expect(concatenatedLabelText).not.toContain("elements");
    expect(concatenatedLabelText).toContain("li");

    await reactGrab.page.keyboard.up("Shift");
  });

  test("should not silently drop accumulated selection when shift is released mid-drag", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();

    const firstItem = reactGrab.page.locator("[data-testid='todo-list'] li").nth(0);
    const secondItem = reactGrab.page.locator("[data-testid='todo-list'] li").nth(1);
    const lastItem = reactGrab.page.locator("[data-testid='todo-list'] li").nth(6);

    const firstBox = await firstItem.boundingBox();
    const secondBox = await secondItem.boundingBox();
    const lastBox = await lastItem.boundingBox();
    if (!firstBox || !secondBox || !lastBox) throw new Error("Could not get bounding boxes");

    await reactGrab.page.keyboard.down("Shift");
    await reactGrab.page.mouse.click(
      firstBox.x + firstBox.width / 2,
      firstBox.y + firstBox.height / 2,
    );
    await reactGrab.page.waitForTimeout(120);
    await reactGrab.page.mouse.click(
      secondBox.x + secondBox.width / 2,
      secondBox.y + secondBox.height / 2,
    );
    await reactGrab.page.waitForTimeout(120);

    await reactGrab.page.mouse.move(lastBox.x - 30, lastBox.y - 30);
    await reactGrab.page.mouse.down();
    await reactGrab.page.mouse.move(
      lastBox.x + lastBox.width + 30,
      lastBox.y + lastBox.height + 30,
      { steps: 6 },
    );

    await reactGrab.page.keyboard.up("Shift");
    await reactGrab.page.mouse.up();

    await expect.poll(() => reactGrab.getClipboardContent()).toContain("TodoItem");

    const userSelectStyle = await reactGrab.page.evaluate(() => document.body.style.userSelect);
    expect(userSelectStyle).toBe("");
  });

  test("should clear shift multi-select state when window loses focus", async ({ reactGrab }) => {
    await reactGrab.activate();

    const firstItem = reactGrab.page.locator("[data-testid='todo-list'] li").nth(0);
    const secondItem = reactGrab.page.locator("[data-testid='todo-list'] li").nth(1);

    const firstBox = await firstItem.boundingBox();
    const secondBox = await secondItem.boundingBox();
    if (!firstBox || !secondBox) throw new Error("Could not get bounding boxes");

    await reactGrab.page.keyboard.down("Shift");
    await reactGrab.page.mouse.click(
      firstBox.x + firstBox.width / 2,
      firstBox.y + firstBox.height / 2,
    );
    await reactGrab.page.waitForTimeout(120);
    await reactGrab.page.mouse.click(
      secondBox.x + secondBox.width / 2,
      secondBox.y + secondBox.height / 2,
    );
    await reactGrab.page.waitForTimeout(120);

    await reactGrab.page.evaluate(() => window.dispatchEvent(new Event("blur")));
    await reactGrab.page.waitForTimeout(100);

    await reactGrab.page.keyboard.press("ArrowDown");
    await reactGrab.page.waitForTimeout(150);

    const arrowNavDidWork = await reactGrab.page.evaluate(() => {
      const host = document.querySelector("[data-react-grab]");
      const shadowRoot = host?.shadowRoot;
      if (!shadowRoot) return false;
      const root = shadowRoot.querySelector("[data-react-grab]");
      if (!root) return false;
      return Boolean(root.querySelector("[data-react-grab-selection-label]"));
    });
    expect(arrowNavDidWork).toBe(true);

    await reactGrab.page.keyboard.up("Shift");
  });

  test("should ignore shift+click that resolves to no element under pointer", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();

    const firstItem = reactGrab.page.locator("[data-testid='todo-list'] li").nth(0);
    const secondItem = reactGrab.page.locator("[data-testid='todo-list'] li").nth(1);

    const firstBox = await firstItem.boundingBox();
    const secondBox = await secondItem.boundingBox();
    if (!firstBox || !secondBox) throw new Error("Could not get bounding boxes");

    const viewport = reactGrab.page.viewportSize();
    if (!viewport) throw new Error("No viewport");
    const emptySpaceX = viewport.width - 5;
    const emptySpaceY = viewport.height - 5;

    await reactGrab.page.keyboard.down("Shift");
    await reactGrab.page.mouse.click(
      firstBox.x + firstBox.width / 2,
      firstBox.y + firstBox.height / 2,
    );
    await reactGrab.page.waitForTimeout(120);
    await reactGrab.page.mouse.click(
      secondBox.x + secondBox.width / 2,
      secondBox.y + secondBox.height / 2,
    );
    await reactGrab.page.waitForTimeout(120);

    await reactGrab.page.mouse.click(emptySpaceX, emptySpaceY);
    await reactGrab.page.waitForTimeout(150);

    await reactGrab.page.keyboard.up("Shift");

    await expect.poll(() => reactGrab.getClipboardContent()).toContain("TodoItem");
  });

  test("should extend existing drag selection with shift+click", async ({ reactGrab }) => {
    await reactGrab.activate();

    const firstItem = reactGrab.page.locator("[data-testid='todo-list'] li").nth(0);
    const secondItem = reactGrab.page.locator("[data-testid='todo-list'] li").nth(1);
    const lastItem = reactGrab.page.locator("[data-testid='todo-list'] li").nth(6);

    const firstBox = await firstItem.boundingBox();
    const secondBox = await secondItem.boundingBox();
    const lastBox = await lastItem.boundingBox();
    if (!firstBox || !secondBox || !lastBox) {
      throw new Error("Could not get bounding boxes");
    }

    await reactGrab.page.keyboard.down("Shift");

    await reactGrab.page.mouse.move(firstBox.x - 10, firstBox.y - 10);
    await reactGrab.page.mouse.down();
    await reactGrab.page.mouse.move(
      secondBox.x + secondBox.width + 10,
      secondBox.y + secondBox.height + 10,
      { steps: 8 },
    );
    await reactGrab.page.mouse.up();
    await reactGrab.page.waitForTimeout(150);

    await reactGrab.page.mouse.click(lastBox.x + lastBox.width / 2, lastBox.y + lastBox.height / 2);
    await reactGrab.page.waitForTimeout(150);

    await reactGrab.page.keyboard.up("Shift");

    await expect.poll(() => reactGrab.getClipboardContent()).toContain("TodoItem");
  });
});
