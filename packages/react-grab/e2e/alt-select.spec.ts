import { test, expect } from "./fixtures.js";
import { isEditPanelVisible } from "./edit-panel-helpers.js";

const TODO_ITEM_COUNT = 7;

const getInlineStyledTodoCount = async (page: import("@playwright/test").Page): Promise<number> =>
  page.evaluate(() => {
    const items = document.querySelectorAll<HTMLElement>("[data-testid='todo-list'] li");
    return Array.from(items).filter((item) => (item.getAttribute("style") ?? "").length > 0).length;
  });

test.describe("Alt Component-Instance Select", () => {
  test.describe.configure({ mode: "serial" });

  test("should select every instance of the clicked component when Alt is held", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();

    const firstItem = reactGrab.page.locator("[data-testid='todo-list'] li").nth(0);
    const firstBox = await firstItem.boundingBox();
    if (!firstBox) throw new Error("Could not get bounding box");

    await reactGrab.page.keyboard.down("Alt");
    await reactGrab.page.mouse.click(
      firstBox.x + firstBox.width / 2,
      firstBox.y + firstBox.height / 2,
    );
    await reactGrab.page.waitForTimeout(150);
    await reactGrab.page.keyboard.up("Alt");

    await expect
      .poll(async () => (await reactGrab.getLabelInstancesInfo()).length)
      .toBe(TODO_ITEM_COUNT);

    await expect.poll(() => reactGrab.getClipboardContent()).toContain("TodoItem");
  });

  test("should select all instances when clicking a deeply nested child element", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();

    const nestedText = reactGrab.page.locator("[data-testid='deeply-nested-text']");
    const textBox = await nestedText.boundingBox();
    if (!textBox) throw new Error("Could not get bounding box");

    await reactGrab.page.keyboard.down("Alt");
    await reactGrab.page.mouse.click(textBox.x + textBox.width / 2, textBox.y + textBox.height / 2);
    await reactGrab.page.waitForTimeout(150);
    await reactGrab.page.keyboard.up("Alt");

    await expect.poll(async () => (await reactGrab.getLabelInstancesInfo()).length).toBe(3);
  });

  test("should apply a style tweak to every instance when Alt+right-click opens the Style panel", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();

    const firstItem = reactGrab.page.locator("[data-testid='todo-list'] li").nth(0);
    await reactGrab.hoverElement("[data-testid='todo-list'] li");
    await reactGrab.waitForSelectionBox();

    await reactGrab.page.keyboard.down("Alt");
    await firstItem.click({ button: "right", force: true });
    await reactGrab.page.keyboard.up("Alt");

    await reactGrab.clickContextMenuItem("Style");
    await expect.poll(() => isEditPanelVisible(reactGrab.page)).toBe(true);

    await reactGrab.page.keyboard.press("ArrowRight");
    await reactGrab.page.waitForTimeout(120);

    await expect.poll(() => getInlineStyledTodoCount(reactGrab.page)).toBe(TODO_ITEM_COUNT);
  });

  test("should fall back to a single selection when no sibling instances exist", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();

    const heading = reactGrab.page.locator("[data-testid='todo-list'] h1");
    const headingBox = await heading.boundingBox();
    if (!headingBox) throw new Error("Could not get bounding box");

    await reactGrab.page.keyboard.down("Alt");
    await reactGrab.page.mouse.click(
      headingBox.x + headingBox.width / 2,
      headingBox.y + headingBox.height / 2,
    );
    await reactGrab.page.waitForTimeout(150);
    await reactGrab.page.keyboard.up("Alt");

    await expect.poll(() => reactGrab.getClipboardContent()).not.toBe("");
  });
});
