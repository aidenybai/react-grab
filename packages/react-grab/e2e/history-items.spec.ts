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
  // HACK: Wait for copy feedback transition and comment item addition
  await reactGrab.page.waitForTimeout(300);
};

test.describe("Comment Items", () => {
  test.describe("Toolbar Comments Button", () => {
    test("should not be visible before any elements are copied", async ({
      reactGrab,
    }) => {
      await expect
        .poll(() => reactGrab.isToolbarVisible(), { timeout: 2000 })
        .toBe(true);

      const isCommentsVisible = await reactGrab.isCommentsButtonVisible();
      expect(isCommentsVisible).toBe(false);
    });

    test("should become visible after copying an element", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");

      await expect
        .poll(() => reactGrab.isCommentsButtonVisible(), { timeout: 2000 })
        .toBe(true);
    });
  });

  test.describe("Dropdown Open/Close", () => {
    test("should open when clicking the comments button", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await reactGrab.clickCommentsButton();

      const isDropdownVisible = await reactGrab.isCommentsDropdownVisible();
      expect(isDropdownVisible).toBe(true);
    });

    test("should close when clicking the comments button again", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await reactGrab.clickCommentsButton();

      expect(await reactGrab.isCommentsDropdownVisible()).toBe(true);

      await reactGrab.clickCommentsButton();

      expect(await reactGrab.isCommentsDropdownVisible()).toBe(false);
    });

    test("should close when pressing Escape", async ({ reactGrab }) => {
      await copyElement(reactGrab, "li:first-child");
      await reactGrab.clickCommentsButton();

      expect(await reactGrab.isCommentsDropdownVisible()).toBe(true);

      await reactGrab.pressEscape();
      await reactGrab.page.waitForTimeout(100);

      expect(await reactGrab.isCommentsDropdownVisible()).toBe(false);
    });

    test("should close when context menu is opened", async ({ reactGrab }) => {
      await copyElement(reactGrab, "li:first-child");
      await reactGrab.clickCommentsButton();

      expect(await reactGrab.isCommentsDropdownVisible()).toBe(true);

      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();
      await reactGrab.rightClickElement("li:first-child");

      await expect
        .poll(() => reactGrab.isCommentsDropdownVisible(), { timeout: 2000 })
        .toBe(false);
      expect(await reactGrab.isContextMenuVisible()).toBe(true);
    });
  });

  test.describe("Dropdown Content", () => {
    test("should display one item after copying an element", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await reactGrab.clickCommentsButton();

      const dropdownInfo = await reactGrab.getCommentsDropdownInfo();
      expect(dropdownInfo.isVisible).toBe(true);
      expect(dropdownInfo.itemCount).toBe(1);
    });

    test("should display multiple items after copying different elements", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await copyElement(reactGrab, "li:last-child");

      await reactGrab.clickCommentsButton();

      const dropdownInfo = await reactGrab.getCommentsDropdownInfo();
      expect(dropdownInfo.itemCount).toBe(2);
    });

    test("should hide comments button after clearing all items", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await reactGrab.clickCommentsButton();
      await reactGrab.clickCommentsClear();

      await expect
        .poll(() => reactGrab.isCommentsButtonVisible(), { timeout: 2000 })
        .toBe(false);

      expect(await reactGrab.isCommentsDropdownVisible()).toBe(false);
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

      await reactGrab.clickCommentsButton();
      await reactGrab.clickCommentItem(0);

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
      await reactGrab.clickCommentsButton();

      expect(await reactGrab.isCommentsDropdownVisible()).toBe(true);

      await reactGrab.clickCommentItem(0);

      expect(await reactGrab.isCommentsDropdownVisible()).toBe(true);
    });
  });

  test.describe("Copy All", () => {
    test("should copy combined content of all items to clipboard", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await copyElement(reactGrab, "li:last-child");

      await reactGrab.page.evaluate(() => navigator.clipboard.writeText(""));

      await reactGrab.clickCommentsButton();
      await reactGrab.clickCommentsCopyAll();

      const clipboardContent = await reactGrab.getClipboardContent();
      expect(clipboardContent).toContain("[1]");
      expect(clipboardContent).toContain("[2]");
    });

    test("should keep the dropdown open after copy all", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await reactGrab.clickCommentsButton();

      expect(await reactGrab.isCommentsDropdownVisible()).toBe(true);

      await reactGrab.clickCommentsCopyAll();

      expect(await reactGrab.isCommentsDropdownVisible()).toBe(true);
    });

    test("should not trigger copy all via Enter key", async ({ reactGrab }) => {
      await copyElement(reactGrab, "li:first-child");

      await reactGrab.page.evaluate(() => navigator.clipboard.writeText(""));

      await reactGrab.clickCommentsButton();
      await reactGrab.pressEnter();
      await reactGrab.page.waitForTimeout(200);

      const clipboardContent = await reactGrab.getClipboardContent();
      expect(clipboardContent).toBe("");
    });
  });

  test.describe("Clear All", () => {
    test("should remove all comment items", async ({ reactGrab }) => {
      await copyElement(reactGrab, "li:first-child");
      await copyElement(reactGrab, "li:last-child");

      await reactGrab.clickCommentsButton();
      expect((await reactGrab.getCommentsDropdownInfo()).itemCount).toBe(2);

      await reactGrab.clickCommentsClear();

      await expect
        .poll(() => reactGrab.isCommentsButtonVisible(), { timeout: 2000 })
        .toBe(false);
    });

    test("should hide the comments button in toolbar after clearing", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");

      await expect
        .poll(() => reactGrab.isCommentsButtonVisible(), { timeout: 2000 })
        .toBe(true);

      await reactGrab.clickCommentsButton();
      await reactGrab.clickCommentsClear();

      await expect
        .poll(() => reactGrab.isCommentsButtonVisible(), { timeout: 2000 })
        .toBe(false);
    });

    test("should close the dropdown after clearing", async ({ reactGrab }) => {
      await copyElement(reactGrab, "li:first-child");
      await reactGrab.clickCommentsButton();

      expect(await reactGrab.isCommentsDropdownVisible()).toBe(true);

      await reactGrab.clickCommentsClear();

      expect(await reactGrab.isCommentsDropdownVisible()).toBe(false);
    });
  });

  test.describe("Deduplication", () => {
    test("should deduplicate when copying the same element twice", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await copyElement(reactGrab, "li:first-child");

      await reactGrab.clickCommentsButton();

      const dropdownInfo = await reactGrab.getCommentsDropdownInfo();
      expect(dropdownInfo.itemCount).toBe(1);
    });

    test("should not deduplicate when copying different elements", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await copyElement(reactGrab, "li:last-child");

      await reactGrab.clickCommentsButton();

      const dropdownInfo = await reactGrab.getCommentsDropdownInfo();
      expect(dropdownInfo.itemCount).toBe(2);
    });
  });

  test.describe("Hover Behavior", () => {
    test("should show a highlight box on the element when hovering a comment item", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await reactGrab.clickCommentsButton();

      const grabbedBoxesBefore = await reactGrab.getGrabbedBoxInfo();
      const initialBoxCount = grabbedBoxesBefore.count;

      await reactGrab.hoverCommentItem(0);

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

    test("should remove highlight box when mouse leaves a comment item", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await reactGrab.clickCommentsButton();

      await reactGrab.hoverCommentItem(0);
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
      const hasCommentHoverBox = grabbedBoxesAfter.boxes.some((box) =>
        box.id.startsWith("comment-hover-"),
      );
      expect(hasCommentHoverBox).toBe(false);
    });
  });

  test.describe("Comments Button Hover Preview", () => {
    test("should show highlight boxes for all comment items when hovering the comments button", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await copyElement(reactGrab, "li:last-child");

      const grabbedBoxesBefore = await reactGrab.getGrabbedBoxInfo();
      const initialBoxCount = grabbedBoxesBefore.count;

      await reactGrab.hoverCommentsButton();

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
        box.id.startsWith("comment-all-hover-"),
      );
      expect(allHoverBoxes.length).toBe(2);
    });

    test("should remove all highlight boxes when mouse leaves the comments button", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await copyElement(reactGrab, "li:last-child");

      await reactGrab.hoverCommentsButton();

      await expect
        .poll(
          async () => {
            const info = await reactGrab.getGrabbedBoxInfo();
            return info.boxes.filter((box) =>
              box.id.startsWith("comment-all-hover-"),
            ).length;
          },
          { timeout: 2000 },
        )
        .toBe(2);

      await reactGrab.page.mouse.move(0, 0);
      await reactGrab.page.waitForTimeout(200);

      const grabbedBoxesAfter = await reactGrab.getGrabbedBoxInfo();
      const remainingHoverBoxes = grabbedBoxesAfter.boxes.filter((box) =>
        box.id.startsWith("comment-all-hover-"),
      );
      expect(remainingHoverBoxes.length).toBe(0);
    });

    test("should clear button hover boxes when pinning the dropdown", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");

      await reactGrab.hoverCommentsButton();

      await expect
        .poll(
          async () => {
            const info = await reactGrab.getGrabbedBoxInfo();
            return info.boxes.filter((box) =>
              box.id.startsWith("comment-all-hover-"),
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
          .querySelector<HTMLButtonElement>(
            "[data-react-grab-toolbar-comments]",
          )
          ?.click();
      }, "data-react-grab");
      await reactGrab.page.waitForTimeout(200);

      const grabbedBoxesAfter = await reactGrab.getGrabbedBoxInfo();
      const remainingHoverBoxes = grabbedBoxesAfter.boxes.filter((box) =>
        box.id.startsWith("comment-all-hover-"),
      );
      expect(remainingHoverBoxes.length).toBe(0);
    });

    test("should show highlight box for a single comment item", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");

      await reactGrab.hoverCommentsButton();

      await expect
        .poll(
          async () => {
            const info = await reactGrab.getGrabbedBoxInfo();
            return info.boxes.filter((box) =>
              box.id.startsWith("comment-all-hover-"),
            ).length;
          },
          { timeout: 2000 },
        )
        .toBe(1);
    });
  });

  test.describe("Item Row Click", () => {
    test("should keep the dropdown open after clicking a row", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");

      await reactGrab.clickCommentsButton();
      await reactGrab.clickCommentItem(0);

      expect(await reactGrab.isCommentsDropdownVisible()).toBe(true);
    });
  });

  test.describe("Dropdown Positioning", () => {
    test("should position the dropdown within the viewport", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await reactGrab.clickCommentsButton();

      await expect
        .poll(
          async () => {
            const position = await reactGrab.getCommentsDropdownPosition();
            return position?.left ?? -9999;
          },
          { timeout: 3000 },
        )
        .toBeGreaterThanOrEqual(0);

      const position = await reactGrab.getCommentsDropdownPosition();
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
          { timeout: 5000 },
        )
        .toBe("top");

      // HACK: wait for snap animation and toolbar layout transition to fully settle
      await reactGrab.page.waitForTimeout(500);

      await expect
        .poll(() => reactGrab.isCommentsButtonVisible(), { timeout: 5000 })
        .toBe(true);

      const commentsButtonRect = await reactGrab.page.evaluate((attrName) => {
        const host = document.querySelector(`[${attrName}]`);
        const shadowRoot = host?.shadowRoot;
        if (!shadowRoot) return null;
        const root = shadowRoot.querySelector(`[${attrName}]`);
        if (!root) return null;
        const button = root.querySelector<HTMLElement>(
          "[data-react-grab-toolbar-comments]",
        );
        if (!button) return null;
        const rect = button.getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      }, "data-react-grab");

      expect(commentsButtonRect).not.toBeNull();
      await reactGrab.page.mouse.click(
        commentsButtonRect!.x + commentsButtonRect!.width / 2,
        commentsButtonRect!.y + commentsButtonRect!.height / 2,
      );

      await expect
        .poll(() => reactGrab.isCommentsDropdownVisible(), { timeout: 5000 })
        .toBe(true);

      await expect
        .poll(
          async () => {
            const position = await reactGrab.getCommentsDropdownPosition();
            return position?.top ?? -9999;
          },
          { timeout: 5000 },
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

      await reactGrab.clickCommentsButton();

      const dropdownInfo = await reactGrab.getCommentsDropdownInfo();
      expect(dropdownInfo.itemCount).toBe(3);
    });

    test("should maintain comment items after activation cycle", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");

      await reactGrab.activate();
      await reactGrab.deactivate();
      await reactGrab.page.waitForTimeout(200);

      await expect
        .poll(() => reactGrab.isCommentsButtonVisible(), { timeout: 2000 })
        .toBe(true);

      await reactGrab.clickCommentsButton();

      const dropdownInfo = await reactGrab.getCommentsDropdownInfo();
      expect(dropdownInfo.itemCount).toBe(1);
    });
  });

  test.describe("Dismiss Behavior", () => {
    test("should not dismiss when clicking outside the dropdown", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await reactGrab.clickCommentsButton();

      expect(await reactGrab.isCommentsDropdownVisible()).toBe(true);

      await reactGrab.page.mouse.click(10, 10);
      await reactGrab.page.waitForTimeout(200);

      expect(await reactGrab.isCommentsDropdownVisible()).toBe(true);
    });

    test("should dismiss when pressing Escape", async ({ reactGrab }) => {
      await copyElement(reactGrab, "li:first-child");
      await reactGrab.clickCommentsButton();

      expect(await reactGrab.isCommentsDropdownVisible()).toBe(true);

      await reactGrab.pressEscape();
      await reactGrab.page.waitForTimeout(200);

      expect(await reactGrab.isCommentsDropdownVisible()).toBe(false);
    });

    test("should dismiss when clicking the comments button to toggle off", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await reactGrab.clickCommentsButton();

      expect(await reactGrab.isCommentsDropdownVisible()).toBe(true);

      await reactGrab.clickCommentsButton();

      expect(await reactGrab.isCommentsDropdownVisible()).toBe(false);
    });
  });

  test.describe("Hover to Open", () => {
    test("should open dropdown when hovering the comments button", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");

      await reactGrab.hoverCommentsButton();

      await expect
        .poll(() => reactGrab.isCommentsDropdownVisible(), { timeout: 2000 })
        .toBe(true);
    });

    test("should show all preview boxes when hovering the comments button", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await copyElement(reactGrab, "li:last-child");

      await reactGrab.hoverCommentsButton();

      await expect
        .poll(
          async () => {
            const info = await reactGrab.getGrabbedBoxInfo();
            return info.boxes.filter((box) =>
              box.id.startsWith("comment-all-hover-"),
            ).length;
          },
          { timeout: 2000 },
        )
        .toBe(2);
    });

    test("should pin dropdown open when clicking the comments button while hover-opened", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");

      await reactGrab.hoverCommentsButton();

      await expect
        .poll(() => reactGrab.isCommentsDropdownVisible(), { timeout: 2000 })
        .toBe(true);

      await reactGrab.page.evaluate((attrName) => {
        const host = document.querySelector(`[${attrName}]`);
        const shadowRoot = host?.shadowRoot;
        if (!shadowRoot) return;
        const root = shadowRoot.querySelector(`[${attrName}]`);
        if (!root) return;
        root
          .querySelector<HTMLButtonElement>(
            "[data-react-grab-toolbar-comments]",
          )
          ?.click();
      }, "data-react-grab");
      await reactGrab.page.waitForTimeout(300);

      await reactGrab.page.mouse.move(0, 0);
      await reactGrab.page.waitForTimeout(500);

      expect(await reactGrab.isCommentsDropdownVisible()).toBe(true);
    });
  });

  test.describe("Preview Suppression After Copy", () => {
    test("should clear hover preview boxes after copying via row click", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await reactGrab.clickCommentsButton();

      await reactGrab.clickCommentItem(0);
      await reactGrab.page.waitForTimeout(300);

      const grabbedBoxes = await reactGrab.getGrabbedBoxInfo();
      const hoverBoxCount = grabbedBoxes.boxes.filter(
        (box) =>
          box.id.startsWith("comment-hover-") ||
          box.id.startsWith("comment-all-hover-"),
      ).length;
      expect(hoverBoxCount).toBe(0);
    });

    test("should clear all hover preview boxes after copy all", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await copyElement(reactGrab, "li:last-child");

      await reactGrab.clickCommentsButton();
      await reactGrab.page.waitForTimeout(200);

      await reactGrab.clickCommentsCopyAll();
      await reactGrab.page.waitForTimeout(300);

      const grabbedBoxes = await reactGrab.getGrabbedBoxInfo();
      const allHoverBoxes = grabbedBoxes.boxes.filter(
        (box) =>
          box.id.startsWith("comment-all-hover-") ||
          box.id.startsWith("comment-hover-"),
      );
      expect(allHoverBoxes.length).toBe(0);
    });

    test("should allow item hover after clicking a row", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await copyElement(reactGrab, "li:last-child");

      await reactGrab.clickCommentsButton();
      await reactGrab.clickCommentItem(0);
      await reactGrab.page.waitForTimeout(200);

      await reactGrab.hoverCommentItem(1);

      await expect
        .poll(
          async () => {
            const info = await reactGrab.getGrabbedBoxInfo();
            return info.boxes.filter((box) =>
              box.id.startsWith("comment-hover-"),
            ).length;
          },
          { timeout: 2000 },
        )
        .toBeGreaterThan(0);
    });
  });

  test.describe("Selection Label Lifecycle on Copy", () => {
    test("should show selection label when hovering a comment item", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await reactGrab.clickCommentsButton();
      await reactGrab.page.waitForTimeout(200);

      await reactGrab.hoverCommentItem(0);

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

      await reactGrab.clickCommentsButton();
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

      await reactGrab.clickCommentsCopyAll();

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
      await reactGrab.clickCommentsButton();
      await reactGrab.page.waitForTimeout(200);

      await reactGrab.hoverCommentItem(0);
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

      await reactGrab.clickCommentItem(0);

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

    test("should clear idle labels and show copied label after row click", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await reactGrab.clickCommentsButton();
      await reactGrab.page.waitForTimeout(200);

      await reactGrab.hoverCommentItem(0);
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

      await reactGrab.clickCommentItem(0);

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
