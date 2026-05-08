import { test, expect } from "./fixtures.js";

test.describe("Shift Multi-Select", () => {
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

    await expect.poll(() => reactGrab.getClipboardContent()).toContain("Buy groceries");
    const clipboardContent = await reactGrab.getClipboardContent();
    expect(clipboardContent).toContain("Write tests");
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

    await expect.poll(() => reactGrab.getClipboardContent()).toContain("Walk the dog");
    const clipboardContent = await reactGrab.getClipboardContent();
    expect(clipboardContent).not.toContain("Buy groceries");
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

    await expect.poll(() => reactGrab.getClipboardContent()).toContain("Buy groceries");
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

    await expect.poll(() => reactGrab.getClipboardContent()).toContain("Write tests");
    const clipboardContent = await reactGrab.getClipboardContent();
    expect(clipboardContent).not.toContain("Buy groceries");
    expect(clipboardContent).not.toContain("Walk the dog");
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

    await expect.poll(() => reactGrab.getClipboardContent()).toContain("Buy groceries");
    const clipboardContent = await reactGrab.getClipboardContent();
    expect(clipboardContent).toContain("Walk the dog");

    const userSelectStyle = await reactGrab.page.evaluate(() => document.body.style.userSelect);
    expect(userSelectStyle).toBe("");
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

    await expect.poll(() => reactGrab.getClipboardContent()).toContain("Buy groceries");
    const clipboardContent = await reactGrab.getClipboardContent();
    expect(clipboardContent).toContain("Walk the dog");
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

    await expect.poll(() => reactGrab.getClipboardContent()).toContain("Buy groceries");
    const clipboardContent = await reactGrab.getClipboardContent();
    expect(clipboardContent).toContain("Write tests");
  });
});
