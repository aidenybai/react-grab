import { test, expect } from "./fixtures.js";

const getTargetTestId = async (page: import("@playwright/test").Page): Promise<string | null> => {
  return page.evaluate(() => {
    const api = (
      window as {
        __REACT_GRAB__?: {
          getState: () => { targetElement: Element | null };
        };
      }
    ).__REACT_GRAB__;
    return api?.getState()?.targetElement?.getAttribute("data-testid") ?? null;
  });
};

const getTargetTagName = async (page: import("@playwright/test").Page): Promise<string | null> => {
  return page.evaluate(() => {
    const api = (
      window as {
        __REACT_GRAB__?: {
          getState: () => { targetElement: Element | null };
        };
      }
    ).__REACT_GRAB__;
    return api?.getState()?.targetElement?.tagName?.toLowerCase() ?? null;
  });
};

test.describe("Element Detection", () => {
  test.describe("Overflow Clipping", () => {
    test("should select elements inside overflow:hidden container", async ({ reactGrab }) => {
      const section = reactGrab.page.locator("[data-testid='overflow-clipping-section']");
      await section.scrollIntoViewIfNeeded();
      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='overflow-visible-child']");
      await reactGrab.waitForSelectionBox();

      const isVisible = await reactGrab.isSelectionBoxVisible();
      expect(isVisible).toBe(true);
    });

    test("should select clipped element when hovering its visible region", async ({
      reactGrab,
    }) => {
      const container = reactGrab.page.locator("[data-testid='overflow-hidden-container']");
      await container.scrollIntoViewIfNeeded();
      await reactGrab.activate();

      const containerBox = await container.boundingBox();
      if (!containerBox) throw new Error("Could not get container bounds");

      await reactGrab.page.mouse.move(containerBox.x + 10, containerBox.y + 10);
      await reactGrab.waitForSelectionBox();

      const isVisible = await reactGrab.isSelectionBoxVisible();
      expect(isVisible).toBe(true);
    });

    test("should not select clipped element at position outside container", async ({
      reactGrab,
    }) => {
      const container = reactGrab.page.locator("[data-testid='overflow-hidden-container']");
      await container.scrollIntoViewIfNeeded();
      await reactGrab.activate();

      const containerBox = await container.boundingBox();
      if (!containerBox) throw new Error("Could not get container bounds");

      await reactGrab.page.mouse.move(containerBox.x + containerBox.width + 20, containerBox.y + 5);
      await reactGrab.page.waitForTimeout(200);

      const testId = await getTargetTestId(reactGrab.page);
      expect(testId).not.toBe("overflow-clipped-wide");
    });

    test("should handle overflow:auto scrollable containers", async ({ reactGrab }) => {
      const section = reactGrab.page.locator("[data-testid='overflow-clipping-section']");
      await section.scrollIntoViewIfNeeded();
      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='overflow-auto-inner']");
      await reactGrab.waitForSelectionBox();

      const testId = await getTargetTestId(reactGrab.page);
      expect(testId).toBe("overflow-auto-inner");
    });

    test("should handle nested overflow:hidden containers", async ({ reactGrab }) => {
      const innerContainer = reactGrab.page.locator("[data-testid='overflow-nested-inner']");
      await innerContainer.scrollIntoViewIfNeeded();
      await reactGrab.activate();

      const innerBox = await innerContainer.boundingBox();
      if (!innerBox) throw new Error("Could not get inner container bounds");

      await reactGrab.page.mouse.move(innerBox.x + 5, innerBox.y + 5);
      await reactGrab.waitForSelectionBox();

      const isVisible = await reactGrab.isSelectionBoxVisible();
      expect(isVisible).toBe(true);
    });

    test("should select elements inside scroll-container", async ({ reactGrab }) => {
      const section = reactGrab.page.locator("[data-testid='scrollable-section']");
      await section.scrollIntoViewIfNeeded();
      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='scroll-item-1']");
      await reactGrab.waitForSelectionBox();

      const isVisible = await reactGrab.isSelectionBoxVisible();
      expect(isVisible).toBe(true);

      await reactGrab.clickElement("[data-testid='scroll-item-1']");
      await expect.poll(() => reactGrab.getClipboardContent()).toContain("Scrollable Item 1");
    });

    test("should not select scroll items that are scrolled out of view", async ({ reactGrab }) => {
      const container = reactGrab.page.locator("[data-testid='scroll-container']");
      await container.scrollIntoViewIfNeeded();
      await reactGrab.activate();

      const containerBox = await container.boundingBox();
      if (!containerBox) throw new Error("Could not get scroll container bounds");

      await reactGrab.page.mouse.move(containerBox.x + containerBox.width / 2, containerBox.y + 5);
      await reactGrab.waitForSelectionBox();

      const testId = await getTargetTestId(reactGrab.page);
      expect(testId).not.toBe("scroll-item-50");
    });
  });

  test.describe("CSS Containment", () => {
    test("should select child inside contain:paint container at visible region", async ({
      reactGrab,
    }) => {
      const container = reactGrab.page.locator("[data-testid='contain-paint-container']");
      await container.scrollIntoViewIfNeeded();
      await reactGrab.activate();

      const containerBox = await container.boundingBox();
      if (!containerBox) throw new Error("Could not get container bounds");

      await reactGrab.page.mouse.move(containerBox.x + 10, containerBox.y + 10);
      await reactGrab.waitForSelectionBox();

      const isVisible = await reactGrab.isSelectionBoxVisible();
      expect(isVisible).toBe(true);
    });

    test("should not select paint-contained element outside container bounds", async ({
      reactGrab,
    }) => {
      const container = reactGrab.page.locator("[data-testid='contain-paint-container']");
      await container.scrollIntoViewIfNeeded();
      await reactGrab.activate();

      const containerBox = await container.boundingBox();
      if (!containerBox) throw new Error("Could not get container bounds");

      await reactGrab.page.mouse.move(
        containerBox.x + containerBox.width + 30,
        containerBox.y + 10,
      );
      await reactGrab.page.waitForTimeout(200);

      const testId = await getTargetTestId(reactGrab.page);
      expect(testId).not.toBe("contain-paint-clipped");
    });

    test("should select child inside contain:strict container", async ({ reactGrab }) => {
      const section = reactGrab.page.locator("[data-testid='contain-paint-section']");
      await section.scrollIntoViewIfNeeded();
      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='contain-strict-child']");
      await reactGrab.waitForSelectionBox();

      const isVisible = await reactGrab.isSelectionBoxVisible();
      expect(isVisible).toBe(true);
    });

    test("should select child inside contain:content container", async ({ reactGrab }) => {
      const section = reactGrab.page.locator("[data-testid='contain-paint-section']");
      await section.scrollIntoViewIfNeeded();
      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='contain-content-child']");
      await reactGrab.waitForSelectionBox();

      const isVisible = await reactGrab.isSelectionBoxVisible();
      expect(isVisible).toBe(true);
    });
  });

  test.describe("Stacking Order", () => {
    test("should select topmost z-indexed element at overlap point", async ({ reactGrab }) => {
      const section = reactGrab.page.locator("[data-testid='stacking-order-section']");
      await section.scrollIntoViewIfNeeded();
      await reactGrab.activate();

      const topElement = reactGrab.page.locator("[data-testid='stacking-top']");
      const topBox = await topElement.boundingBox();
      if (!topBox) throw new Error("Could not get top element bounds");

      await reactGrab.page.mouse.move(topBox.x + 10, topBox.y + 10);
      await reactGrab.waitForSelectionBox();

      const testId = await getTargetTestId(reactGrab.page);
      expect(testId).toBe("stacking-top");
    });

    test("should select middle element where top element does not overlap", async ({
      reactGrab,
    }) => {
      const section = reactGrab.page.locator("[data-testid='stacking-order-section']");
      await section.scrollIntoViewIfNeeded();
      await reactGrab.activate();

      const middleElement = reactGrab.page.locator("[data-testid='stacking-middle']");
      const topElement = reactGrab.page.locator("[data-testid='stacking-top']");
      const middleBox = await middleElement.boundingBox();
      const topBox = await topElement.boundingBox();
      if (!middleBox || !topBox) throw new Error("Could not get element bounds");

      await reactGrab.page.mouse.move(middleBox.x + 5, middleBox.y + 5);
      await reactGrab.waitForSelectionBox();

      const testId = await getTargetTestId(reactGrab.page);
      expect(testId).toBe("stacking-middle");
    });

    test("should select bottom element in non-overlapping region", async ({ reactGrab }) => {
      const section = reactGrab.page.locator("[data-testid='stacking-order-section']");
      await section.scrollIntoViewIfNeeded();
      await reactGrab.activate();

      const bottomElement = reactGrab.page.locator("[data-testid='stacking-bottom']");
      const bottomBox = await bottomElement.boundingBox();
      if (!bottomBox) throw new Error("Could not get bottom element bounds");

      await reactGrab.page.mouse.move(bottomBox.x + 5, bottomBox.y + 5);
      await reactGrab.waitForSelectionBox();

      const testId = await getTargetTestId(reactGrab.page);
      expect(testId).toBe("stacking-bottom");
    });

    test("should prefer smaller front element over larger background", async ({ reactGrab }) => {
      const section = reactGrab.page.locator("[data-testid='stacking-order-section']");
      await section.scrollIntoViewIfNeeded();
      await reactGrab.activate();

      const frontElement = reactGrab.page.locator("[data-testid='stacking-small-front']");
      const frontBox = await frontElement.boundingBox();
      if (!frontBox) throw new Error("Could not get front element bounds");

      await reactGrab.page.mouse.move(
        frontBox.x + frontBox.width / 2,
        frontBox.y + frontBox.height / 2,
      );
      await reactGrab.waitForSelectionBox();

      const testId = await getTargetTestId(reactGrab.page);
      expect(testId).toBe("stacking-small-front");
    });

    test("should copy correct content from stacked elements", async ({ reactGrab }) => {
      const section = reactGrab.page.locator("[data-testid='stacking-order-section']");
      await section.scrollIntoViewIfNeeded();
      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='stacking-top']");
      await reactGrab.waitForSelectionBox();
      await reactGrab.clickElement("[data-testid='stacking-top']");

      await expect.poll(() => reactGrab.getClipboardContent()).toContain("Top");
    });
  });

  test.describe("Inline Elements", () => {
    test("should select inline span element", async ({ reactGrab }) => {
      const section = reactGrab.page.locator("[data-testid='inline-elements-section']");
      await section.scrollIntoViewIfNeeded();
      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='inline-span']");
      await reactGrab.waitForSelectionBox();

      const testId = await getTargetTestId(reactGrab.page);
      expect(testId).toBe("inline-span");
    });

    test("should select inline link element", async ({ reactGrab }) => {
      const section = reactGrab.page.locator("[data-testid='inline-elements-section']");
      await section.scrollIntoViewIfNeeded();
      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='inline-link']");
      await reactGrab.waitForSelectionBox();

      const testId = await getTargetTestId(reactGrab.page);
      expect(testId).toBe("inline-link");
    });

    test("should select inline em element", async ({ reactGrab }) => {
      const section = reactGrab.page.locator("[data-testid='inline-elements-section']");
      await section.scrollIntoViewIfNeeded();
      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='inline-em']");
      await reactGrab.waitForSelectionBox();

      const testId = await getTargetTestId(reactGrab.page);
      expect(testId).toBe("inline-em");
    });

    test("should select inline strong element", async ({ reactGrab }) => {
      const section = reactGrab.page.locator("[data-testid='inline-elements-section']");
      await section.scrollIntoViewIfNeeded();
      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='inline-strong']");
      await reactGrab.waitForSelectionBox();

      const testId = await getTargetTestId(reactGrab.page);
      expect(testId).toBe("inline-strong");
    });

    test("should select inline code element", async ({ reactGrab }) => {
      const section = reactGrab.page.locator("[data-testid='inline-elements-section']");
      await section.scrollIntoViewIfNeeded();
      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='inline-code']");
      await reactGrab.waitForSelectionBox();

      const testId = await getTargetTestId(reactGrab.page);
      expect(testId).toBe("inline-code");
    });

    test("should copy inline span content correctly", async ({ reactGrab }) => {
      const section = reactGrab.page.locator("[data-testid='inline-elements-section']");
      await section.scrollIntoViewIfNeeded();
      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='inline-span']");
      await reactGrab.waitForSelectionBox();
      await reactGrab.clickElement("[data-testid='inline-span']");

      await expect.poll(() => reactGrab.getClipboardContent()).toContain("inline span");
    });

    test("should show selection box with correct bounds for inline elements", async ({
      reactGrab,
    }) => {
      const section = reactGrab.page.locator("[data-testid='inline-elements-section']");
      await section.scrollIntoViewIfNeeded();
      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='inline-span']");
      await reactGrab.waitForSelectionBox();

      const bounds = await reactGrab.getSelectionBoxBounds();
      expect(bounds).not.toBeNull();
      expect(bounds!.width).toBeGreaterThan(0);
      expect(bounds!.height).toBeGreaterThan(0);
    });
  });

  test.describe("Decorative Overlays", () => {
    test("should select content element, not the empty overlay above it", async ({ reactGrab }) => {
      const section = reactGrab.page.locator("[data-testid='decorative-overlay-section']");
      await section.scrollIntoViewIfNeeded();
      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='decorative-content']");
      await reactGrab.waitForSelectionBox();

      const testId = await getTargetTestId(reactGrab.page);
      expect(testId).toBe("decorative-content");
    });

    test("should select text content under positioned empty div", async ({ reactGrab }) => {
      const section = reactGrab.page.locator("[data-testid='decorative-overlay-section']");
      await section.scrollIntoViewIfNeeded();
      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='decorative-text-content']");
      await reactGrab.waitForSelectionBox();

      await reactGrab.clickElement("[data-testid='decorative-text-content']");
      await expect.poll(() => reactGrab.getClipboardContent()).toContain("Text content under");
    });

    test("should copy content from element under decorative overlay", async ({ reactGrab }) => {
      const section = reactGrab.page.locator("[data-testid='decorative-overlay-section']");
      await section.scrollIntoViewIfNeeded();
      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='decorative-content']");
      await reactGrab.waitForSelectionBox();
      await reactGrab.clickElement("[data-testid='decorative-content']");

      await expect.poll(() => reactGrab.getClipboardContent()).toContain("should be selectable");
    });
  });

  test.describe("Transform and Opacity Stacking", () => {
    test("should select element with CSS transform", async ({ reactGrab }) => {
      const section = reactGrab.page.locator("[data-testid='transform-stacking-section']");
      await section.scrollIntoViewIfNeeded();
      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='transform-element']");
      await reactGrab.waitForSelectionBox();

      const testId = await getTargetTestId(reactGrab.page);
      expect(testId).toBe("transform-element");
    });

    test("should select element with sub-1 opacity", async ({ reactGrab }) => {
      const section = reactGrab.page.locator("[data-testid='transform-stacking-section']");
      await section.scrollIntoViewIfNeeded();
      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='opacity-element']");
      await reactGrab.waitForSelectionBox();

      const testId = await getTargetTestId(reactGrab.page);
      expect(testId).toBe("opacity-element");
    });

    test("should prefer front transformed element at overlap", async ({ reactGrab }) => {
      const section = reactGrab.page.locator("[data-testid='transform-stacking-section']");
      await section.scrollIntoViewIfNeeded();
      await reactGrab.activate();

      const frontElement = reactGrab.page.locator("[data-testid='transform-front']");
      const frontBox = await frontElement.boundingBox();
      if (!frontBox) throw new Error("Could not get front element bounds");

      await reactGrab.page.mouse.move(
        frontBox.x + frontBox.width / 2,
        frontBox.y + frontBox.height / 2,
      );
      await reactGrab.waitForSelectionBox();

      const testId = await getTargetTestId(reactGrab.page);
      expect(testId).toBe("transform-front");
    });
  });

  test.describe("Fixed Position Elements", () => {
    test("should select fixed-position corner element", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='edge-top-left']");
      await reactGrab.waitForSelectionBox();

      const testId = await getTargetTestId(reactGrab.page);
      expect(testId).toBe("edge-top-left");
    });

    test("should select different fixed-position corners", async ({ reactGrab }) => {
      await reactGrab.activate();

      await reactGrab.hoverElement("[data-testid='edge-top-right']");
      await reactGrab.waitForSelectionBox();
      const topRightId = await getTargetTestId(reactGrab.page);
      expect(topRightId).toBe("edge-top-right");

      await reactGrab.hoverElement("[data-testid='edge-bottom-left']");
      await reactGrab.waitForSelectionBox();
      const bottomLeftId = await getTargetTestId(reactGrab.page);
      expect(bottomLeftId).toBe("edge-bottom-left");
    });

    test("should copy fixed-position element content", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='edge-top-left']");
      await reactGrab.waitForSelectionBox();
      await reactGrab.clickElement("[data-testid='edge-top-left']");

      await expect.poll(() => reactGrab.getClipboardContent()).toContain("Top Left");
    });
  });

  test.describe("Various Element Types", () => {
    test("should select table cells", async ({ reactGrab }) => {
      const section = reactGrab.page.locator("[data-testid='various-section']");
      await section.scrollIntoViewIfNeeded();
      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='td-1-1']");
      await reactGrab.waitForSelectionBox();

      const testId = await getTargetTestId(reactGrab.page);
      expect(testId).toBe("td-1-1");
    });

    test("should select image element", async ({ reactGrab }) => {
      const section = reactGrab.page.locator("[data-testid='various-section']");
      await section.scrollIntoViewIfNeeded();
      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='img-element']");
      await reactGrab.waitForSelectionBox();

      const testId = await getTargetTestId(reactGrab.page);
      expect(testId).toBe("img-element");
    });

    test("should select article element", async ({ reactGrab }) => {
      const section = reactGrab.page.locator("[data-testid='various-section']");
      await section.scrollIntoViewIfNeeded();
      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='article-element']");
      await reactGrab.waitForSelectionBox();

      const isVisible = await reactGrab.isSelectionBoxVisible();
      expect(isVisible).toBe(true);
    });

    test("should select button element", async ({ reactGrab }) => {
      const section = reactGrab.page.locator("[data-testid='various-section']");
      await section.scrollIntoViewIfNeeded();
      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='plain-button']");
      await reactGrab.waitForSelectionBox();

      const testId = await getTargetTestId(reactGrab.page);
      expect(testId).toBe("plain-button");
    });

    test("should select gradient div", async ({ reactGrab }) => {
      const section = reactGrab.page.locator("[data-testid='various-section']");
      await section.scrollIntoViewIfNeeded();
      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='gradient-div']");
      await reactGrab.waitForSelectionBox();

      const testId = await getTargetTestId(reactGrab.page);
      expect(testId).toBe("gradient-div");
    });
  });

  test.describe("Element Removal After Index Build", () => {
    test("should handle element removal after activation", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='dynamic-element-2']");
      await reactGrab.waitForSelectionBox();

      const testIdBefore = await getTargetTestId(reactGrab.page);
      expect(testIdBefore).toBe("dynamic-element-2");

      await reactGrab.removeElement("[data-testid='dynamic-element-2']");
      await reactGrab.page.waitForTimeout(200);

      await reactGrab.hoverElement("[data-testid='dynamic-element-1']");
      await reactGrab.waitForSelectionBox();

      const testIdAfter = await getTargetTestId(reactGrab.page);
      expect(testIdAfter).toBe("dynamic-element-1");
    });

    test("should handle dynamically added elements", async ({ reactGrab }) => {
      const section = reactGrab.page.locator("[data-testid='dynamic-section']");
      await section.scrollIntoViewIfNeeded();
      await reactGrab.activate();

      await reactGrab.page.evaluate(() => {
        const section = document.querySelector("[data-testid='dynamic-section']");
        if (!section) return;
        const newDiv = document.createElement("div");
        newDiv.setAttribute("data-testid", "runtime-added-element");
        newDiv.className = "p-4 bg-emerald-200 rounded mt-2";
        newDiv.textContent = "Dynamically added at runtime";
        section.appendChild(newDiv);
      });
      await reactGrab.page.waitForTimeout(200);

      await reactGrab.hoverElement("[data-testid='runtime-added-element']");
      await reactGrab.waitForSelectionBox();

      const isVisible = await reactGrab.isSelectionBoxVisible();
      expect(isVisible).toBe(true);
    });
  });

  test.describe("Zero-Dimension and Invisible Elements", () => {
    test("should not detect zero-size elements", async ({ reactGrab }) => {
      const section = reactGrab.page.locator("[data-testid='zero-dimension-section']");
      await section.scrollIntoViewIfNeeded();
      await reactGrab.activate();

      const zeroEl = reactGrab.page.locator("[data-testid='zero-size-element']");
      const box = await zeroEl.boundingBox();

      if (box && box.width > 0 && box.height > 0) {
        await reactGrab.page.mouse.move(box.x, box.y);
      } else {
        await reactGrab.page.mouse.move(100, 100);
      }
      await reactGrab.page.waitForTimeout(200);

      const testId = await getTargetTestId(reactGrab.page);
      expect(testId).not.toBe("zero-size-element");
    });

    test("should skip invisible elements and select visible ones", async ({ reactGrab }) => {
      const section = reactGrab.page.locator("[data-testid='zero-dimension-section']");
      await section.scrollIntoViewIfNeeded();
      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='zero-dimension-section'] h2");
      await reactGrab.waitForSelectionBox();

      const tagName = await getTargetTagName(reactGrab.page);
      expect(tagName).toBe("h2");
    });
  });

  test.describe("Modal and Overlay Interaction", () => {
    test("should select modal content when modal is open", async ({ reactGrab }) => {
      const section = reactGrab.page.locator("[data-testid='modal-dialog-section']");
      await section.scrollIntoViewIfNeeded();
      await reactGrab.page.click("[data-testid='modal-trigger']");
      await reactGrab.page.waitForSelector("[data-testid='modal-content']");

      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='modal-inner-button']");
      await reactGrab.waitForSelectionBox();

      const testId = await getTargetTestId(reactGrab.page);
      expect(testId).toBe("modal-inner-button");
    });

    test("should copy modal content correctly", async ({ reactGrab }) => {
      const section = reactGrab.page.locator("[data-testid='modal-dialog-section']");
      await section.scrollIntoViewIfNeeded();
      await reactGrab.page.click("[data-testid='modal-trigger']");
      await reactGrab.page.waitForSelector("[data-testid='modal-content']");

      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='modal-inner-button']");
      await reactGrab.waitForSelectionBox();
      await reactGrab.clickElement("[data-testid='modal-inner-button']");

      await expect.poll(() => reactGrab.getClipboardContent()).toContain("Button Inside Modal");
    });
  });

  test.describe("Deeply Nested Elements", () => {
    test("should select deepest nested text element", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='deeply-nested-text']");
      await reactGrab.waitForSelectionBox();

      const testId = await getTargetTestId(reactGrab.page);
      expect(testId).toBe("deeply-nested-text");
    });

    test("should select nested button inside cards", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='nested-button']");
      await reactGrab.waitForSelectionBox();

      const testId = await getTargetTestId(reactGrab.page);
      expect(testId).toBe("nested-button");
    });

    test("should navigate through nested cards with arrows", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='nested-button']");
      await reactGrab.waitForSelectionBox();

      await reactGrab.pressArrowDown();
      await reactGrab.page.waitForTimeout(200);

      const isVisible = await reactGrab.isSelectionBoxVisible();
      expect(isVisible).toBe(true);
    });
  });

  test.describe("Reactivation Rebuilds Index", () => {
    test("should rebuild element index on each activation cycle", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='main-title']");
      await reactGrab.waitForSelectionBox();

      const testId1 = await getTargetTestId(reactGrab.page);
      expect(testId1).toBe("main-title");

      await reactGrab.deactivate();
      await reactGrab.page.waitForTimeout(100);

      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='main-title']");
      await reactGrab.waitForSelectionBox();

      const testId2 = await getTargetTestId(reactGrab.page);
      expect(testId2).toBe("main-title");
    });

    test("should detect elements added between activation cycles", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.deactivate();

      await reactGrab.page.evaluate(() => {
        const section = document.querySelector("[data-testid='dynamic-section']");
        if (!section) return;
        const newDiv = document.createElement("div");
        newDiv.setAttribute("data-testid", "between-cycles-element");
        newDiv.className = "p-4 bg-fuchsia-200 rounded mt-2";
        newDiv.textContent = "Added between cycles";
        section.appendChild(newDiv);
      });

      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='between-cycles-element']");
      await reactGrab.waitForSelectionBox();

      const testId = await getTargetTestId(reactGrab.page);
      expect(testId).toBe("between-cycles-element");
    });
  });

  test.describe("Animated Elements", () => {
    test("should select pulsing element after freeze", async ({ reactGrab }) => {
      const section = reactGrab.page.locator("[data-testid='animated-section']");
      await section.scrollIntoViewIfNeeded();
      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='animated-pulse']");
      await reactGrab.waitForSelectionBox();

      const testId = await getTargetTestId(reactGrab.page);
      expect(testId).toBe("animated-pulse");
    });

    test("should select spinning element after freeze", async ({ reactGrab }) => {
      const section = reactGrab.page.locator("[data-testid='animated-section']");
      await section.scrollIntoViewIfNeeded();
      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='animated-spin']");
      await reactGrab.waitForSelectionBox();

      const testId = await getTargetTestId(reactGrab.page);
      expect(testId).toBe("animated-spin");
    });

    test("should select bouncing element after freeze", async ({ reactGrab }) => {
      const section = reactGrab.page.locator("[data-testid='animated-section']");
      await section.scrollIntoViewIfNeeded();
      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='animated-bounce']");
      await reactGrab.waitForSelectionBox();

      const testId = await getTargetTestId(reactGrab.page);
      expect(testId).toBe("animated-bounce");
    });
  });

  test.describe("Injected Edge Cases", () => {
    test("should skip absolutely positioned empty decorative div over content", async ({
      reactGrab,
    }) => {
      await reactGrab.page.evaluate(() => {
        const container = document.createElement("div");
        container.id = "injected-decorative-test";
        container.style.cssText = "position: relative; margin: 16px;";
        container.innerHTML = `
          <p data-testid="injected-real-content" style="padding: 16px; background: #e0f2fe;">
            Real content under decorative overlay
          </p>
          <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></div>
        `;
        document.body.appendChild(container);
      });

      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='injected-real-content']");
      await reactGrab.waitForSelectionBox();

      const testId = await getTargetTestId(reactGrab.page);
      expect(testId).toBe("injected-real-content");

      await reactGrab.page.evaluate(() => {
        document.getElementById("injected-decorative-test")?.remove();
      });
    });

    test("should handle deeply nested overflow clipping chain", async ({ reactGrab }) => {
      await reactGrab.page.evaluate(() => {
        const container = document.createElement("div");
        container.id = "injected-nested-clip-test";
        container.innerHTML = `
          <div style="overflow: hidden; width: 200px; height: 100px; border: 2px solid red; margin: 16px;">
            <div style="overflow: hidden; width: 150px; height: 80px; border: 1px solid orange;">
              <div style="overflow: hidden; width: 100px; height: 60px; border: 1px solid yellow;">
                <div data-testid="injected-deep-visible" style="padding: 4px; background: #fef3c7; width: 80px;">
                  Visible
                </div>
                <div data-testid="injected-deep-clipped" style="padding: 4px; background: #fee2e2; width: 300px; position: relative;">
                  This extends far beyond all containers
                </div>
              </div>
            </div>
          </div>
        `;
        document.body.appendChild(container);
      });

      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='injected-deep-visible']");
      await reactGrab.waitForSelectionBox();

      const testId = await getTargetTestId(reactGrab.page);
      expect(testId).toBe("injected-deep-visible");

      await reactGrab.page.evaluate(() => {
        document.getElementById("injected-nested-clip-test")?.remove();
      });
    });

    test("should handle contain:paint with overflow interaction", async ({ reactGrab }) => {
      await reactGrab.page.evaluate(() => {
        const container = document.createElement("div");
        container.id = "injected-contain-overflow-test";
        container.innerHTML = `
          <div style="contain: paint; overflow: hidden; width: 120px; height: 50px; border: 2px solid #0d9488; margin: 16px; position: relative;">
            <div data-testid="injected-contain-visible" style="padding: 4px; background: #ccfbf1;">
              Visible
            </div>
            <div data-testid="injected-contain-clipped" style="position: absolute; left: 130px; top: 0; padding: 4px; background: #fecdd3;">
              Clipped by contain
            </div>
          </div>
        `;
        document.body.appendChild(container);
      });

      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='injected-contain-visible']");
      await reactGrab.waitForSelectionBox();

      const testId = await getTargetTestId(reactGrab.page);
      expect(testId).toBe("injected-contain-visible");

      await reactGrab.page.evaluate(() => {
        document.getElementById("injected-contain-overflow-test")?.remove();
      });
    });

    test("should handle multiple stacking contexts with transforms", async ({ reactGrab }) => {
      await reactGrab.page.evaluate(() => {
        const container = document.createElement("div");
        container.id = "injected-transform-stack-test";
        container.style.cssText = "position: relative; height: 100px; margin: 16px;";
        container.innerHTML = `
          <div data-testid="injected-transform-back" style="position: absolute; top: 0; left: 0; width: 200px; height: 80px; background: #dbeafe; padding: 8px;">
            Background
          </div>
          <div data-testid="injected-transform-front" style="position: absolute; top: 10px; left: 10px; width: 120px; height: 60px; background: #bfdbfe; padding: 8px; transform: translateZ(0); z-index: 1;">
            Foreground (transform)
          </div>
        `;
        document.body.appendChild(container);
      });

      const frontElement = reactGrab.page.locator("[data-testid='injected-transform-front']");
      await frontElement.scrollIntoViewIfNeeded();
      await reactGrab.activate();

      const frontBox = await frontElement.boundingBox();
      if (!frontBox) throw new Error("Could not get front element bounds");

      await reactGrab.page.mouse.move(
        frontBox.x + frontBox.width / 2,
        frontBox.y + frontBox.height / 2,
      );
      await reactGrab.waitForSelectionBox();

      const testId = await getTargetTestId(reactGrab.page);
      expect(testId).toBe("injected-transform-front");

      await reactGrab.page.evaluate(() => {
        document.getElementById("injected-transform-stack-test")?.remove();
      });
    });

    test("should handle flex item stacking with z-index", async ({ reactGrab }) => {
      await reactGrab.page.evaluate(() => {
        const container = document.createElement("div");
        container.id = "injected-flex-stack-test";
        container.style.cssText = "display: flex; position: relative; height: 80px; margin: 16px;";
        container.innerHTML = `
          <div data-testid="injected-flex-behind" style="position: absolute; width: 200px; height: 60px; background: #fde68a; padding: 8px; z-index: 0;">
            Flex behind
          </div>
          <div data-testid="injected-flex-front" style="position: absolute; width: 100px; height: 40px; background: #fbbf24; padding: 8px; z-index: 2; top: 10px; left: 10px;">
            Flex front
          </div>
        `;
        document.body.appendChild(container);
      });

      const frontElement = reactGrab.page.locator("[data-testid='injected-flex-front']");
      await frontElement.scrollIntoViewIfNeeded();
      await reactGrab.activate();

      const frontBox = await frontElement.boundingBox();
      if (!frontBox) throw new Error("Could not get front element bounds");

      await reactGrab.page.mouse.move(
        frontBox.x + frontBox.width / 2,
        frontBox.y + frontBox.height / 2,
      );
      await reactGrab.waitForSelectionBox();

      const testId = await getTargetTestId(reactGrab.page);
      expect(testId).toBe("injected-flex-front");

      await reactGrab.page.evaluate(() => {
        document.getElementById("injected-flex-stack-test")?.remove();
      });
    });

    test("should handle page with only fixed elements and no regular elements", async ({
      reactGrab,
    }) => {
      await reactGrab.page.evaluate(() => {
        document.body.innerHTML = "";
        const fixedElement = document.createElement("div");
        fixedElement.id = "injected-fixed-only-test";
        fixedElement.setAttribute("data-testid", "fixed-only-element");
        fixedElement.style.cssText =
          "position: fixed; top: 10px; left: 10px; width: 200px; height: 60px; background: #93c5fd; padding: 8px; z-index: 10;";
        fixedElement.textContent = "Only fixed element";
        document.body.appendChild(fixedElement);
      });

      await reactGrab.activate();

      const fixedElement = reactGrab.page.locator("[data-testid='fixed-only-element']");
      const fixedBox = await fixedElement.boundingBox();
      if (!fixedBox) throw new Error("Could not get fixed element bounds");

      await reactGrab.page.mouse.move(
        fixedBox.x + fixedBox.width / 2,
        fixedBox.y + fixedBox.height / 2,
      );
      await reactGrab.waitForSelectionBox();

      const testId = await getTargetTestId(reactGrab.page);
      expect(testId).toBe("fixed-only-element");
    });
  });
});
