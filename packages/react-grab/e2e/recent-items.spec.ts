import { test, expect } from "./fixtures.js";
import type { ReactGrabPageObject } from "./fixtures.js";

const copyElement = async (
  reactGrab: ReactGrabPageObject,
  selector: string,
) => {
  await reactGrab.activate();
  await reactGrab.hoverElement(selector);
  await reactGrab.waitForSelectionBox();
  await reactGrab.clickElement(selector);
  await expect
    .poll(() => reactGrab.getClipboardContent(), { timeout: 3000 })
    .toBeTruthy();
  // HACK: Wait for copy feedback transition and recent item addition
  await reactGrab.page.waitForTimeout(300);
};

test.describe("Recent Items", () => {
  test.describe("Toolbar Recent Button", () => {
    test("should not be visible before any elements are copied", async ({
      reactGrab,
    }) => {
      await expect
        .poll(() => reactGrab.isToolbarVisible(), { timeout: 2000 })
        .toBe(true);

      const isRecentVisible = await reactGrab.isRecentButtonVisible();
      expect(isRecentVisible).toBe(false);
    });

    test("should become visible after copying an element", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");

      await expect
        .poll(() => reactGrab.isRecentButtonVisible(), { timeout: 2000 })
        .toBe(true);
    });

    test("should show unread indicator after copy", async ({ reactGrab }) => {
      await copyElement(reactGrab, "li:first-child");

      await expect
        .poll(() => reactGrab.hasUnreadRecentIndicator(), { timeout: 2000 })
        .toBe(true);
    });

    test("should clear unread indicator when dropdown is opened", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");

      await expect
        .poll(() => reactGrab.hasUnreadRecentIndicator(), { timeout: 2000 })
        .toBe(true);

      await reactGrab.clickRecentButton();

      await expect
        .poll(() => reactGrab.hasUnreadRecentIndicator(), { timeout: 2000 })
        .toBe(false);
    });

    test("should show unread indicator again after new copy while dropdown is closed", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await reactGrab.clickRecentButton();
      await reactGrab.clickRecentButton();

      await expect
        .poll(() => reactGrab.hasUnreadRecentIndicator(), { timeout: 2000 })
        .toBe(false);

      await copyElement(reactGrab, "li:last-child");

      await expect
        .poll(() => reactGrab.hasUnreadRecentIndicator(), { timeout: 2000 })
        .toBe(true);
    });
  });

  test.describe("Dropdown Open/Close", () => {
    test("should open when clicking the recent button", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await reactGrab.clickRecentButton();

      const isDropdownVisible = await reactGrab.isRecentDropdownVisible();
      expect(isDropdownVisible).toBe(true);
    });

    test("should close when clicking the recent button again", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await reactGrab.clickRecentButton();

      expect(await reactGrab.isRecentDropdownVisible()).toBe(true);

      await reactGrab.clickRecentButton();

      expect(await reactGrab.isRecentDropdownVisible()).toBe(false);
    });

    test("should close when pressing Escape", async ({ reactGrab }) => {
      await copyElement(reactGrab, "li:first-child");
      await reactGrab.clickRecentButton();

      expect(await reactGrab.isRecentDropdownVisible()).toBe(true);

      await reactGrab.pressEscape();
      await reactGrab.page.waitForTimeout(100);

      expect(await reactGrab.isRecentDropdownVisible()).toBe(false);
    });

    test("should close when context menu is opened", async ({ reactGrab }) => {
      await copyElement(reactGrab, "li:first-child");
      await reactGrab.clickRecentButton();

      expect(await reactGrab.isRecentDropdownVisible()).toBe(true);

      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();
      await reactGrab.rightClickElement("li:first-child");

      expect(await reactGrab.isRecentDropdownVisible()).toBe(false);
      expect(await reactGrab.isContextMenuVisible()).toBe(true);
    });
  });

  test.describe("Dropdown Content", () => {
    test("should display one item after copying an element", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await reactGrab.clickRecentButton();

      const dropdownInfo = await reactGrab.getRecentDropdownInfo();
      expect(dropdownInfo.isVisible).toBe(true);
      expect(dropdownInfo.itemCount).toBe(1);
    });

    test("should display multiple items after copying different elements", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await copyElement(reactGrab, "li:last-child");

      await reactGrab.clickRecentButton();

      const dropdownInfo = await reactGrab.getRecentDropdownInfo();
      expect(dropdownInfo.itemCount).toBe(2);
    });

    test("should hide recent button after clearing all items", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await reactGrab.clickRecentButton();
      await reactGrab.clickRecentClear();

      await expect
        .poll(() => reactGrab.isRecentButtonVisible(), { timeout: 2000 })
        .toBe(false);

      expect(await reactGrab.isRecentDropdownVisible()).toBe(false);
    });
  });

  test.describe("Item Selection", () => {
    test("should copy content to clipboard when clicking a regular item", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");

      const originalClipboard = await reactGrab.getClipboardContent();
      expect(originalClipboard).toBeTruthy();

      await reactGrab.page.evaluate(() => navigator.clipboard.writeText(""));

      await reactGrab.clickRecentButton();
      await reactGrab.clickRecentItem(0);

      await expect
        .poll(() => reactGrab.getClipboardContent(), { timeout: 3000 })
        .toBeTruthy();

      const newClipboard = await reactGrab.getClipboardContent();
      expect(newClipboard).toBe(originalClipboard);
    });

    test("should close the dropdown after selecting an item", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await reactGrab.clickRecentButton();

      expect(await reactGrab.isRecentDropdownVisible()).toBe(true);

      await reactGrab.clickRecentItem(0);

      expect(await reactGrab.isRecentDropdownVisible()).toBe(false);
    });
  });

  test.describe("Copy All", () => {
    test("should copy combined content of all items to clipboard", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await copyElement(reactGrab, "li:last-child");

      await reactGrab.page.evaluate(() => navigator.clipboard.writeText(""));

      await reactGrab.clickRecentButton();
      await reactGrab.clickRecentCopyAll();

      const clipboardContent = await reactGrab.getClipboardContent();
      expect(clipboardContent).toContain("[1]");
      expect(clipboardContent).toContain("[2]");
    });

    test("should close the dropdown after copy all", async ({ reactGrab }) => {
      await copyElement(reactGrab, "li:first-child");
      await reactGrab.clickRecentButton();

      expect(await reactGrab.isRecentDropdownVisible()).toBe(true);

      await reactGrab.clickRecentCopyAll();

      expect(await reactGrab.isRecentDropdownVisible()).toBe(false);
    });

    test("should trigger copy all via Enter key", async ({ reactGrab }) => {
      await copyElement(reactGrab, "li:first-child");

      await reactGrab.page.evaluate(() => navigator.clipboard.writeText(""));

      await reactGrab.clickRecentButton();
      await reactGrab.pressEnter();
      await reactGrab.page.waitForTimeout(200);

      const clipboardContent = await reactGrab.getClipboardContent();
      expect(clipboardContent).toBeTruthy();
    });
  });

  test.describe("Clear All", () => {
    test("should remove all recent items", async ({ reactGrab }) => {
      await copyElement(reactGrab, "li:first-child");
      await copyElement(reactGrab, "li:last-child");

      await reactGrab.clickRecentButton();
      expect((await reactGrab.getRecentDropdownInfo()).itemCount).toBe(2);

      await reactGrab.clickRecentClear();

      await expect
        .poll(() => reactGrab.isRecentButtonVisible(), { timeout: 2000 })
        .toBe(false);
    });

    test("should hide the recent button in toolbar after clearing", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");

      await expect
        .poll(() => reactGrab.isRecentButtonVisible(), { timeout: 2000 })
        .toBe(true);

      await reactGrab.clickRecentButton();
      await reactGrab.clickRecentClear();

      await expect
        .poll(() => reactGrab.isRecentButtonVisible(), { timeout: 2000 })
        .toBe(false);
    });

    test("should close the dropdown after clearing", async ({ reactGrab }) => {
      await copyElement(reactGrab, "li:first-child");
      await reactGrab.clickRecentButton();

      expect(await reactGrab.isRecentDropdownVisible()).toBe(true);

      await reactGrab.clickRecentClear();

      expect(await reactGrab.isRecentDropdownVisible()).toBe(false);
    });
  });

  test.describe("Deduplication", () => {
    test("should deduplicate when copying the same element twice", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await copyElement(reactGrab, "li:first-child");

      await reactGrab.clickRecentButton();

      const dropdownInfo = await reactGrab.getRecentDropdownInfo();
      expect(dropdownInfo.itemCount).toBe(1);
    });

    test("should not deduplicate when copying different elements", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await copyElement(reactGrab, "li:last-child");

      await reactGrab.clickRecentButton();

      const dropdownInfo = await reactGrab.getRecentDropdownInfo();
      expect(dropdownInfo.itemCount).toBe(2);
    });
  });

  test.describe("Hover Behavior", () => {
    test("should show a highlight box on the element when hovering a recent item", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await reactGrab.clickRecentButton();

      const grabbedBoxesBefore = await reactGrab.getGrabbedBoxInfo();
      const initialBoxCount = grabbedBoxesBefore.count;

      await reactGrab.hoverRecentItem(0);

      await expect
        .poll(
          async () => {
            const info = await reactGrab.getGrabbedBoxInfo();
            return info.count;
          },
          { timeout: 2000 },
        )
        .toBeGreaterThan(initialBoxCount);
    });

    test("should remove highlight box when mouse leaves a recent item", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await reactGrab.clickRecentButton();

      await reactGrab.hoverRecentItem(0);
      await expect
        .poll(
          async () => {
            const info = await reactGrab.getGrabbedBoxInfo();
            return info.count;
          },
          { timeout: 2000 },
        )
        .toBeGreaterThan(0);

      await reactGrab.page.mouse.move(0, 0);
      await reactGrab.page.waitForTimeout(200);

      const grabbedBoxesAfter = await reactGrab.getGrabbedBoxInfo();
      const hasRecentHoverBox = grabbedBoxesAfter.boxes.some((box) =>
        box.id.startsWith("recent-hover-"),
      );
      expect(hasRecentHoverBox).toBe(false);
    });
  });

  test.describe("Remove Individual Item", () => {
    test("should remove a single item and keep others", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await copyElement(reactGrab, "li:last-child");

      await reactGrab.clickRecentButton();
      expect((await reactGrab.getRecentDropdownInfo()).itemCount).toBe(2);

      await reactGrab.clickRecentItemRemove(0);
      await reactGrab.page.waitForTimeout(200);

      const dropdownInfo = await reactGrab.getRecentDropdownInfo();
      expect(dropdownInfo.itemCount).toBe(1);
    });

    test("should keep the dropdown open after removing an item", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await copyElement(reactGrab, "li:last-child");

      await reactGrab.clickRecentButton();
      await reactGrab.clickRecentItemRemove(0);
      await reactGrab.page.waitForTimeout(200);

      expect(await reactGrab.isRecentDropdownVisible()).toBe(true);
    });

    test("should close the dropdown and hide button when removing the last item", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");

      await reactGrab.clickRecentButton();
      expect((await reactGrab.getRecentDropdownInfo()).itemCount).toBe(1);

      await reactGrab.clickRecentItemRemove(0);
      await reactGrab.page.waitForTimeout(200);

      expect(await reactGrab.isRecentDropdownVisible()).toBe(false);

      await expect
        .poll(() => reactGrab.isRecentButtonVisible(), { timeout: 2000 })
        .toBe(false);
    });
  });

  test.describe("Copy Individual Item", () => {
    test("should copy the item content to clipboard", async ({ reactGrab }) => {
      await copyElement(reactGrab, "li:first-child");

      const originalClipboard = await reactGrab.getClipboardContent();

      await reactGrab.page.evaluate(() => navigator.clipboard.writeText(""));

      await reactGrab.clickRecentButton();
      await reactGrab.clickRecentItemCopy(0);
      await reactGrab.page.waitForTimeout(200);

      const newClipboard = await reactGrab.getClipboardContent();
      expect(newClipboard).toBe(originalClipboard);
    });

    test("should keep the dropdown open after copying an item", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");

      await reactGrab.clickRecentButton();
      await reactGrab.clickRecentItemCopy(0);
      await reactGrab.page.waitForTimeout(200);

      expect(await reactGrab.isRecentDropdownVisible()).toBe(true);
    });
  });

  test.describe("Dropdown Positioning", () => {
    test("should position the dropdown within the viewport", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await reactGrab.clickRecentButton();

      await expect
        .poll(
          async () => {
            const position = await reactGrab.getRecentDropdownPosition();
            return position?.left ?? -9999;
          },
          { timeout: 3000 },
        )
        .toBeGreaterThanOrEqual(0);

      const position = await reactGrab.getRecentDropdownPosition();
      expect(position).not.toBeNull();
      expect(position!.top).toBeGreaterThanOrEqual(0);
    });

    test("should reposition when toolbar is dragged to top edge", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");

      await reactGrab.dragToolbar(0, -600);
      await reactGrab.page.waitForTimeout(400);

      await reactGrab.clickRecentButton();

      await expect
        .poll(
          async () => {
            const position = await reactGrab.getRecentDropdownPosition();
            return position?.top ?? -9999;
          },
          { timeout: 3000 },
        )
        .toBeGreaterThanOrEqual(0);

      const toolbarInfo = await reactGrab.getToolbarInfo();
      expect(toolbarInfo.snapEdge).toBe("top");
    });
  });

  test.describe("Persistence Across Copies", () => {
    test("should accumulate items across multiple copy operations", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await copyElement(reactGrab, '[data-testid="card-title"]');
      await copyElement(reactGrab, '[data-testid="submit-button"]');

      await reactGrab.clickRecentButton();

      const dropdownInfo = await reactGrab.getRecentDropdownInfo();
      expect(dropdownInfo.itemCount).toBe(3);
    });

    test("should maintain recent items after activation cycle", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");

      await reactGrab.activate();
      await reactGrab.deactivate();
      await reactGrab.page.waitForTimeout(200);

      await expect
        .poll(() => reactGrab.isRecentButtonVisible(), { timeout: 2000 })
        .toBe(true);

      await reactGrab.clickRecentButton();

      const dropdownInfo = await reactGrab.getRecentDropdownInfo();
      expect(dropdownInfo.itemCount).toBe(1);
    });
  });
});
