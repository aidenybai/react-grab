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
    .poll(() => reactGrab.getClipboardContent(), { timeout: 5000 })
    .toBeTruthy();
  // HACK: Wait for copy feedback transition and history item addition
  await reactGrab.page.waitForTimeout(300);
};

test.describe("History Items", () => {
  test.describe("Toolbar History Button", () => {
    test("should not be visible before any elements are copied", async ({
      reactGrab,
    }) => {
      await expect
        .poll(() => reactGrab.isToolbarVisible(), { timeout: 2000 })
        .toBe(true);

      const isHistoryVisible = await reactGrab.isHistoryButtonVisible();
      expect(isHistoryVisible).toBe(false);
    });

    test("should become visible after copying an element", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");

      await expect
        .poll(() => reactGrab.isHistoryButtonVisible(), { timeout: 2000 })
        .toBe(true);
    });

    test("should show unread indicator after copy", async ({ reactGrab }) => {
      await copyElement(reactGrab, "li:first-child");

      await expect
        .poll(() => reactGrab.hasUnreadHistoryIndicator(), { timeout: 2000 })
        .toBe(true);
    });

    test("should clear unread indicator when dropdown is opened", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");

      await expect
        .poll(() => reactGrab.hasUnreadHistoryIndicator(), { timeout: 2000 })
        .toBe(true);

      await reactGrab.clickHistoryButton();

      await expect
        .poll(() => reactGrab.hasUnreadHistoryIndicator(), { timeout: 2000 })
        .toBe(false);
    });

    test("should show unread indicator again after new copy while dropdown is closed", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await reactGrab.clickHistoryButton();
      await reactGrab.clickHistoryButton();

      await expect
        .poll(() => reactGrab.hasUnreadHistoryIndicator(), { timeout: 2000 })
        .toBe(false);

      await copyElement(reactGrab, "li:last-child");

      await expect
        .poll(() => reactGrab.hasUnreadHistoryIndicator(), { timeout: 2000 })
        .toBe(true);
    });
  });

  test.describe("Dropdown Open/Close", () => {
    test("should open when clicking the history button", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await reactGrab.clickHistoryButton();

      const isDropdownVisible = await reactGrab.isHistoryDropdownVisible();
      expect(isDropdownVisible).toBe(true);
    });

    test("should close when clicking the history button again", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await reactGrab.clickHistoryButton();

      expect(await reactGrab.isHistoryDropdownVisible()).toBe(true);

      await reactGrab.clickHistoryButton();

      expect(await reactGrab.isHistoryDropdownVisible()).toBe(false);
    });

    test("should close when pressing Escape", async ({ reactGrab }) => {
      await copyElement(reactGrab, "li:first-child");
      await reactGrab.clickHistoryButton();

      expect(await reactGrab.isHistoryDropdownVisible()).toBe(true);

      await reactGrab.pressEscape();
      await reactGrab.page.waitForTimeout(100);

      expect(await reactGrab.isHistoryDropdownVisible()).toBe(false);
    });

    test("should close when context menu is opened", async ({ reactGrab }) => {
      await copyElement(reactGrab, "li:first-child");
      await reactGrab.clickHistoryButton();

      expect(await reactGrab.isHistoryDropdownVisible()).toBe(true);

      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();
      await reactGrab.rightClickElement("li:first-child");

      await expect
        .poll(() => reactGrab.isHistoryDropdownVisible(), { timeout: 2000 })
        .toBe(false);
      expect(await reactGrab.isContextMenuVisible()).toBe(true);
    });
  });

  test.describe("Dropdown Content", () => {
    test("should display one item after copying an element", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await reactGrab.clickHistoryButton();

      const dropdownInfo = await reactGrab.getHistoryDropdownInfo();
      expect(dropdownInfo.isVisible).toBe(true);
      expect(dropdownInfo.itemCount).toBe(1);
    });

    test("should display multiple items after copying different elements", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await copyElement(reactGrab, "li:last-child");

      await reactGrab.clickHistoryButton();

      const dropdownInfo = await reactGrab.getHistoryDropdownInfo();
      expect(dropdownInfo.itemCount).toBe(2);
    });

    test("should hide history button after clearing all items", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await reactGrab.clickHistoryButton();
      await reactGrab.clickHistoryClear();

      await expect
        .poll(() => reactGrab.isHistoryButtonVisible(), { timeout: 2000 })
        .toBe(false);

      expect(await reactGrab.isHistoryDropdownVisible()).toBe(false);
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

      await reactGrab.clickHistoryButton();
      await reactGrab.clickHistoryItem(0);

      await expect
        .poll(() => reactGrab.getClipboardContent(), { timeout: 3000 })
        .toBeTruthy();

      const newClipboard = await reactGrab.getClipboardContent();
      expect(newClipboard).toBe(originalClipboard);
    });

    test("should keep the dropdown open after selecting an item", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await reactGrab.clickHistoryButton();

      expect(await reactGrab.isHistoryDropdownVisible()).toBe(true);

      await reactGrab.clickHistoryItem(0);

      expect(await reactGrab.isHistoryDropdownVisible()).toBe(true);
    });
  });

  test.describe("Copy All", () => {
    test("should copy combined content of all items to clipboard", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await copyElement(reactGrab, "li:last-child");

      await reactGrab.page.evaluate(() => navigator.clipboard.writeText(""));

      await reactGrab.clickHistoryButton();
      await reactGrab.clickHistoryCopyAll();

      const clipboardContent = await reactGrab.getClipboardContent();
      expect(clipboardContent).toContain("[1]");
      expect(clipboardContent).toContain("[2]");
    });

    test("should keep the dropdown open after copy all", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await reactGrab.clickHistoryButton();

      expect(await reactGrab.isHistoryDropdownVisible()).toBe(true);

      await reactGrab.clickHistoryCopyAll();

      expect(await reactGrab.isHistoryDropdownVisible()).toBe(true);
    });

    test("should not trigger copy all via Enter key", async ({ reactGrab }) => {
      await copyElement(reactGrab, "li:first-child");

      await reactGrab.page.evaluate(() => navigator.clipboard.writeText(""));

      await reactGrab.clickHistoryButton();
      await reactGrab.pressEnter();
      await reactGrab.page.waitForTimeout(200);

      const clipboardContent = await reactGrab.getClipboardContent();
      expect(clipboardContent).toBe("");
    });
  });

  test.describe("Clear All", () => {
    test("should remove all history items", async ({ reactGrab }) => {
      await copyElement(reactGrab, "li:first-child");
      await copyElement(reactGrab, "li:last-child");

      await reactGrab.clickHistoryButton();
      expect((await reactGrab.getHistoryDropdownInfo()).itemCount).toBe(2);

      await reactGrab.clickHistoryClear();

      await expect
        .poll(() => reactGrab.isHistoryButtonVisible(), { timeout: 2000 })
        .toBe(false);
    });

    test("should hide the history button in toolbar after clearing", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");

      await expect
        .poll(() => reactGrab.isHistoryButtonVisible(), { timeout: 2000 })
        .toBe(true);

      await reactGrab.clickHistoryButton();
      await reactGrab.clickHistoryClear();

      await expect
        .poll(() => reactGrab.isHistoryButtonVisible(), { timeout: 2000 })
        .toBe(false);
    });

    test("should close the dropdown after clearing", async ({ reactGrab }) => {
      await copyElement(reactGrab, "li:first-child");
      await reactGrab.clickHistoryButton();

      expect(await reactGrab.isHistoryDropdownVisible()).toBe(true);

      await reactGrab.clickHistoryClear();

      expect(await reactGrab.isHistoryDropdownVisible()).toBe(false);
    });
  });

  test.describe("Deduplication", () => {
    test("should deduplicate when copying the same element twice", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await copyElement(reactGrab, "li:first-child");

      await reactGrab.clickHistoryButton();

      const dropdownInfo = await reactGrab.getHistoryDropdownInfo();
      expect(dropdownInfo.itemCount).toBe(1);
    });

    test("should not deduplicate when copying different elements", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await copyElement(reactGrab, "li:last-child");

      await reactGrab.clickHistoryButton();

      const dropdownInfo = await reactGrab.getHistoryDropdownInfo();
      expect(dropdownInfo.itemCount).toBe(2);
    });
  });

  test.describe("Hover Behavior", () => {
    test("should show a highlight box on the element when hovering a history item", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await reactGrab.clickHistoryButton();

      const grabbedBoxesBefore = await reactGrab.getGrabbedBoxInfo();
      const initialBoxCount = grabbedBoxesBefore.count;

      await reactGrab.hoverHistoryItem(0);

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

    test("should remove highlight box when mouse leaves a history item", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await reactGrab.clickHistoryButton();

      await reactGrab.hoverHistoryItem(0);
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
      const hasHistoryHoverBox = grabbedBoxesAfter.boxes.some((box) =>
        box.id.startsWith("history-hover-"),
      );
      expect(hasHistoryHoverBox).toBe(false);
    });
  });

  test.describe("History Button Hover Preview", () => {
    test("should show highlight boxes for all history items when hovering the history button", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await copyElement(reactGrab, "li:last-child");

      const grabbedBoxesBefore = await reactGrab.getGrabbedBoxInfo();
      const initialBoxCount = grabbedBoxesBefore.count;

      await reactGrab.hoverHistoryButton();

      await expect
        .poll(
          async () => {
            const info = await reactGrab.getGrabbedBoxInfo();
            return info.count;
          },
          { timeout: 2000 },
        )
        .toBeGreaterThanOrEqual(initialBoxCount + 2);

      const grabbedBoxes = await reactGrab.getGrabbedBoxInfo();
      const allHoverBoxes = grabbedBoxes.boxes.filter((box) =>
        box.id.startsWith("history-all-hover-"),
      );
      expect(allHoverBoxes.length).toBe(2);
    });

    test("should remove all highlight boxes when mouse leaves the history button", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await copyElement(reactGrab, "li:last-child");

      await reactGrab.hoverHistoryButton();

      await expect
        .poll(
          async () => {
            const info = await reactGrab.getGrabbedBoxInfo();
            return info.boxes.filter((box) =>
              box.id.startsWith("history-all-hover-"),
            ).length;
          },
          { timeout: 2000 },
        )
        .toBe(2);

      await reactGrab.page.mouse.move(0, 0);
      await reactGrab.page.waitForTimeout(200);

      const grabbedBoxesAfter = await reactGrab.getGrabbedBoxInfo();
      const remainingHoverBoxes = grabbedBoxesAfter.boxes.filter((box) =>
        box.id.startsWith("history-all-hover-"),
      );
      expect(remainingHoverBoxes.length).toBe(0);
    });

    test("should clear button hover boxes when pinning the dropdown", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");

      await reactGrab.hoverHistoryButton();

      await expect
        .poll(
          async () => {
            const info = await reactGrab.getGrabbedBoxInfo();
            return info.boxes.filter((box) =>
              box.id.startsWith("history-all-hover-"),
            ).length;
          },
          { timeout: 2000 },
        )
        .toBe(1);

      await reactGrab.page.evaluate((attrName) => {
        const host = document.querySelector(`[${attrName}]`);
        const shadowRoot = host?.shadowRoot;
        if (!shadowRoot) return;
        const root = shadowRoot.querySelector(`[${attrName}]`);
        if (!root) return;
        root
          .querySelector<HTMLButtonElement>("[data-react-grab-toolbar-history]")
          ?.click();
      }, "data-react-grab");
      await reactGrab.page.waitForTimeout(200);

      const grabbedBoxesAfter = await reactGrab.getGrabbedBoxInfo();
      const remainingHoverBoxes = grabbedBoxesAfter.boxes.filter((box) =>
        box.id.startsWith("history-all-hover-"),
      );
      expect(remainingHoverBoxes.length).toBe(0);
    });

    test("should show highlight box for a single history item", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");

      await reactGrab.hoverHistoryButton();

      await expect
        .poll(
          async () => {
            const info = await reactGrab.getGrabbedBoxInfo();
            return info.boxes.filter((box) =>
              box.id.startsWith("history-all-hover-"),
            ).length;
          },
          { timeout: 2000 },
        )
        .toBe(1);
    });
  });

  test.describe("Remove Individual Item", () => {
    test("should remove a single item and keep others", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await copyElement(reactGrab, "li:last-child");

      await reactGrab.clickHistoryButton();
      expect((await reactGrab.getHistoryDropdownInfo()).itemCount).toBe(2);

      await reactGrab.clickHistoryItemRemove(0);
      await reactGrab.page.waitForTimeout(200);

      const dropdownInfo = await reactGrab.getHistoryDropdownInfo();
      expect(dropdownInfo.itemCount).toBe(1);
    });

    test("should keep the dropdown open after removing an item", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await copyElement(reactGrab, "li:last-child");

      await reactGrab.clickHistoryButton();
      await reactGrab.clickHistoryItemRemove(0);
      await reactGrab.page.waitForTimeout(200);

      expect(await reactGrab.isHistoryDropdownVisible()).toBe(true);
    });

    test("should close the dropdown and hide button when removing the last item", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");

      await reactGrab.clickHistoryButton();
      expect((await reactGrab.getHistoryDropdownInfo()).itemCount).toBe(1);

      await reactGrab.clickHistoryItemRemove(0);
      await reactGrab.page.waitForTimeout(200);

      expect(await reactGrab.isHistoryDropdownVisible()).toBe(false);

      await expect
        .poll(() => reactGrab.isHistoryButtonVisible(), { timeout: 2000 })
        .toBe(false);
    });
  });

  test.describe("Copy Individual Item", () => {
    test("should copy the item content to clipboard", async ({ reactGrab }) => {
      await copyElement(reactGrab, "li:first-child");

      const originalClipboard = await reactGrab.getClipboardContent();

      await reactGrab.page.evaluate(() => navigator.clipboard.writeText(""));

      await reactGrab.clickHistoryButton();
      await reactGrab.clickHistoryItemCopy(0);
      await reactGrab.page.waitForTimeout(200);

      const newClipboard = await reactGrab.getClipboardContent();
      expect(newClipboard).toBe(originalClipboard);
    });

    test("should keep the dropdown open after copying an item", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");

      await reactGrab.clickHistoryButton();
      await reactGrab.clickHistoryItemCopy(0);
      await reactGrab.page.waitForTimeout(200);

      expect(await reactGrab.isHistoryDropdownVisible()).toBe(true);
    });

    test("should keep the dropdown open after clicking a row to copy", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");

      await reactGrab.clickHistoryButton();
      await reactGrab.clickHistoryItem(0);

      expect(await reactGrab.isHistoryDropdownVisible()).toBe(true);
    });
  });

  test.describe("Dropdown Positioning", () => {
    test("should position the dropdown within the viewport", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await reactGrab.clickHistoryButton();

      await expect
        .poll(
          async () => {
            const position = await reactGrab.getHistoryDropdownPosition();
            return position?.left ?? -9999;
          },
          { timeout: 3000 },
        )
        .toBeGreaterThanOrEqual(0);

      const position = await reactGrab.getHistoryDropdownPosition();
      expect(position).not.toBeNull();
      expect(position!.top).toBeGreaterThanOrEqual(0);
    });

    test("should reposition when toolbar is dragged to top edge", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");

      await reactGrab.dragToolbar(0, -600);

      await expect
        .poll(
          async () => {
            const info = await reactGrab.getToolbarInfo();
            return info.snapEdge;
          },
          { timeout: 3000 },
        )
        .toBe("top");

      await reactGrab.clickHistoryButton();

      await expect
        .poll(
          async () => {
            const position = await reactGrab.getHistoryDropdownPosition();
            return position?.top ?? -9999;
          },
          { timeout: 3000 },
        )
        .toBeGreaterThanOrEqual(0);
    });
  });

  test.describe("Persistence Across Copies", () => {
    test("should accumulate items across multiple copy operations", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await copyElement(reactGrab, '[data-testid="card-title"]');
      await copyElement(reactGrab, '[data-testid="submit-button"]');

      await reactGrab.clickHistoryButton();

      const dropdownInfo = await reactGrab.getHistoryDropdownInfo();
      expect(dropdownInfo.itemCount).toBe(3);
    });

    test("should maintain history items after activation cycle", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");

      await reactGrab.activate();
      await reactGrab.deactivate();
      await reactGrab.page.waitForTimeout(200);

      await expect
        .poll(() => reactGrab.isHistoryButtonVisible(), { timeout: 2000 })
        .toBe(true);

      await reactGrab.clickHistoryButton();

      const dropdownInfo = await reactGrab.getHistoryDropdownInfo();
      expect(dropdownInfo.itemCount).toBe(1);
    });
  });

  test.describe("Dismiss Behavior", () => {
    test("should not dismiss when clicking outside the dropdown", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await reactGrab.clickHistoryButton();

      expect(await reactGrab.isHistoryDropdownVisible()).toBe(true);

      await reactGrab.page.mouse.click(10, 10);
      await reactGrab.page.waitForTimeout(200);

      expect(await reactGrab.isHistoryDropdownVisible()).toBe(true);
    });

    test("should dismiss when pressing Escape", async ({ reactGrab }) => {
      await copyElement(reactGrab, "li:first-child");
      await reactGrab.clickHistoryButton();

      expect(await reactGrab.isHistoryDropdownVisible()).toBe(true);

      await reactGrab.pressEscape();
      await reactGrab.page.waitForTimeout(200);

      expect(await reactGrab.isHistoryDropdownVisible()).toBe(false);
    });

    test("should dismiss when clicking the history button to toggle off", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await reactGrab.clickHistoryButton();

      expect(await reactGrab.isHistoryDropdownVisible()).toBe(true);

      await reactGrab.clickHistoryButton();

      expect(await reactGrab.isHistoryDropdownVisible()).toBe(false);
    });
  });

  test.describe("Hover to Open", () => {
    test("should open dropdown when hovering the history button", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");

      await reactGrab.hoverHistoryButton();

      await expect
        .poll(() => reactGrab.isHistoryDropdownVisible(), { timeout: 2000 })
        .toBe(true);
    });

    test("should show all preview boxes when hovering the history button", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await copyElement(reactGrab, "li:last-child");

      await reactGrab.hoverHistoryButton();

      await expect
        .poll(
          async () => {
            const info = await reactGrab.getGrabbedBoxInfo();
            return info.boxes.filter((box) =>
              box.id.startsWith("history-all-hover-"),
            ).length;
          },
          { timeout: 2000 },
        )
        .toBe(2);
    });

    test("should pin dropdown open when clicking the history button while hover-opened", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");

      await reactGrab.hoverHistoryButton();

      await expect
        .poll(() => reactGrab.isHistoryDropdownVisible(), { timeout: 2000 })
        .toBe(true);

      await reactGrab.page.evaluate((attrName) => {
        const host = document.querySelector(`[${attrName}]`);
        const shadowRoot = host?.shadowRoot;
        if (!shadowRoot) return;
        const root = shadowRoot.querySelector(`[${attrName}]`);
        if (!root) return;
        root
          .querySelector<HTMLButtonElement>("[data-react-grab-toolbar-history]")
          ?.click();
      }, "data-react-grab");
      await reactGrab.page.waitForTimeout(300);

      await reactGrab.page.mouse.move(0, 0);
      await reactGrab.page.waitForTimeout(500);

      expect(await reactGrab.isHistoryDropdownVisible()).toBe(true);
    });
  });

  test.describe("Preview Suppression After Copy", () => {
    test("should clear hover preview boxes after copying via row click", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await reactGrab.clickHistoryButton();

      await reactGrab.clickHistoryItem(0);
      await reactGrab.page.waitForTimeout(300);

      const grabbedBoxes = await reactGrab.getGrabbedBoxInfo();
      const hoverBoxCount = grabbedBoxes.boxes.filter(
        (box) =>
          box.id.startsWith("history-hover-") ||
          box.id.startsWith("history-all-hover-"),
      ).length;
      expect(hoverBoxCount).toBe(0);
    });

    test("should clear all hover preview boxes after copy all", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await copyElement(reactGrab, "li:last-child");

      await reactGrab.clickHistoryButton();
      await reactGrab.page.waitForTimeout(200);

      await reactGrab.clickHistoryCopyAll();
      await reactGrab.page.waitForTimeout(300);

      const grabbedBoxes = await reactGrab.getGrabbedBoxInfo();
      const allHoverBoxes = grabbedBoxes.boxes.filter(
        (box) =>
          box.id.startsWith("history-all-hover-") ||
          box.id.startsWith("history-hover-"),
      );
      expect(allHoverBoxes.length).toBe(0);
    });

    test("should suppress all-item previews during feedback but allow different item hover", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await copyElement(reactGrab, "li:last-child");

      await reactGrab.clickHistoryButton();
      await reactGrab.clickHistoryItemCopy(0);
      await reactGrab.page.waitForTimeout(200);

      await reactGrab.hoverHistoryItem(1);

      await expect
        .poll(
          async () => {
            const info = await reactGrab.getGrabbedBoxInfo();
            return info.boxes.filter((box) =>
              box.id.startsWith("history-hover-"),
            ).length;
          },
          { timeout: 2000 },
        )
        .toBeGreaterThan(0);
    });
  });

  test.describe("Selection Label Lifecycle on Copy", () => {
    test("should show selection label when hovering a history item", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await reactGrab.clickHistoryButton();
      await reactGrab.page.waitForTimeout(200);

      await reactGrab.hoverHistoryItem(0);

      await expect
        .poll(
          async () => {
            const labels = await reactGrab.getLabelInstancesInfo();
            return labels.filter(
              (label) => label.status === "idle" && label.createdAt === 0,
            ).length;
          },
          { timeout: 5000 },
        )
        .toBeGreaterThan(0);
    });

    test("should clear idle labels and show copied label after copy all", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await copyElement(reactGrab, "li:last-child");

      await reactGrab.clickHistoryButton();
      await reactGrab.page.waitForTimeout(200);

      await reactGrab.hoverCopyAllButton();
      await expect
        .poll(
          async () => {
            const labels = await reactGrab.getLabelInstancesInfo();
            return labels.filter(
              (label) => label.status === "idle" && label.createdAt === 0,
            ).length;
          },
          { timeout: 5000 },
        )
        .toBeGreaterThanOrEqual(2);

      await reactGrab.clickHistoryCopyAll();

      await expect
        .poll(
          async () => {
            const labels = await reactGrab.getLabelInstancesInfo();
            const idlePreviewLabels = labels.filter(
              (label) => label.status === "idle" && label.createdAt === 0,
            );
            return idlePreviewLabels.length;
          },
          { timeout: 5000 },
        )
        .toBe(0);

      await expect
        .poll(
          async () => {
            const labels = await reactGrab.getLabelInstancesInfo();
            return labels.filter((label) => label.status === "copied").length;
          },
          { timeout: 5000 },
        )
        .toBeGreaterThanOrEqual(1);
    });

    test("should clear idle labels and show copied label after individual copy", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await reactGrab.clickHistoryButton();
      await reactGrab.page.waitForTimeout(200);

      await reactGrab.hoverHistoryItem(0);
      await expect
        .poll(
          async () => {
            const labels = await reactGrab.getLabelInstancesInfo();
            return labels.filter(
              (label) => label.status === "idle" && label.createdAt === 0,
            ).length;
          },
          { timeout: 5000 },
        )
        .toBeGreaterThan(0);

      await reactGrab.clickHistoryItem(0);

      await expect
        .poll(
          async () => {
            const labels = await reactGrab.getLabelInstancesInfo();
            const idlePreviewLabels = labels.filter(
              (label) => label.status === "idle" && label.createdAt === 0,
            );
            return idlePreviewLabels.length;
          },
          { timeout: 5000 },
        )
        .toBe(0);

      await expect
        .poll(
          async () => {
            const labels = await reactGrab.getLabelInstancesInfo();
            return labels.filter((label) => label.status === "copied").length;
          },
          { timeout: 5000 },
        )
        .toBeGreaterThanOrEqual(1);
    });

    test("should clear idle labels and show copied label after copy button click", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await reactGrab.clickHistoryButton();
      await reactGrab.page.waitForTimeout(200);

      await reactGrab.hoverHistoryItem(0);
      await expect
        .poll(
          async () => {
            const labels = await reactGrab.getLabelInstancesInfo();
            return labels.filter(
              (label) => label.status === "idle" && label.createdAt === 0,
            ).length;
          },
          { timeout: 5000 },
        )
        .toBeGreaterThan(0);

      await reactGrab.clickHistoryItemCopy(0);

      await expect
        .poll(
          async () => {
            const labels = await reactGrab.getLabelInstancesInfo();
            const idlePreviewLabels = labels.filter(
              (label) => label.status === "idle" && label.createdAt === 0,
            );
            return idlePreviewLabels.length;
          },
          { timeout: 5000 },
        )
        .toBe(0);

      await expect
        .poll(
          async () => {
            const labels = await reactGrab.getLabelInstancesInfo();
            return labels.filter((label) => label.status === "copied").length;
          },
          { timeout: 5000 },
        )
        .toBeGreaterThanOrEqual(1);
    });
  });
});
