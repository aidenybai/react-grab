import { test, expect } from "./fixtures.js";

interface ViewportMetaCase {
  label: string;
  initial: string | null;
}

const viewportMetaCases: ViewportMetaCase[] = [
  { label: "no viewport meta", initial: null },
  { label: "basic viewport meta", initial: "width=device-width, initial-scale=1" },
  {
    label: "viewport-fit=cover meta",
    initial: "width=device-width, initial-scale=1, viewport-fit=cover",
  },
];

test.describe("Viewport and Scroll Handling", () => {
  for (const { label, initial } of viewportMetaCases) {
    test(`should not mutate viewport meta during activation lifecycle (${label})`, async ({
      reactGrab,
    }) => {
      await reactGrab.page.evaluate((content) => {
        const existing = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
        if (content === null) {
          existing?.remove();
          return;
        }
        const meta = existing ?? document.createElement("meta");
        meta.name = "viewport";
        meta.setAttribute("content", content);
        if (!existing) document.head.appendChild(meta);
      }, initial);

      const readViewportContent = () =>
        reactGrab.page.evaluate(
          () =>
            document
              .querySelector<HTMLMetaElement>('meta[name="viewport"]')
              ?.getAttribute("content") ?? null,
        );

      await reactGrab.activate();
      expect(await readViewportContent()).toBe(initial);

      await reactGrab.deactivate();
      expect(await readViewportContent()).toBe(initial);
    });
  }

  test("should ship iOS auto-zoom mitigation in shadow stylesheet", async ({ reactGrab }) => {
    await reactGrab.activate();

    const shadowStylesheetText = await reactGrab.page.evaluate(() => {
      const host = document.querySelector<HTMLElement>("[data-react-grab]");
      const styleElement = host?.shadowRoot?.querySelector("style");
      return styleElement?.textContent ?? "";
    });

    expect(shadowStylesheetText).toMatch(/@supports\s*\(\s*-webkit-touch-callout\s*:\s*none\s*\)/);
    expect(shadowStylesheetText).toMatch(
      /textarea\[data-react-grab-input\][^{}]*\{[^}]*font-size:\s*16px/,
    );
  });

  test("should maintain selection after scrolling page", async ({ reactGrab }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("li:first-child");
    await reactGrab.waitForSelectionBox();

    await reactGrab.page.evaluate(() => {
      window.scrollBy(0, 50);
    });
    await reactGrab.page.waitForTimeout(200);

    const isVisible = await reactGrab.isOverlayVisible();
    expect(isVisible).toBe(true);
  });

  test("should re-detect element under cursor after scroll without mouse movement", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();

    const firstItem = reactGrab.page.locator("[data-testid='todo-list'] li").first();
    const firstItemBox = await firstItem.boundingBox();
    expect(firstItemBox).not.toBeNull();

    await reactGrab.page.mouse.move(
      firstItemBox!.x + firstItemBox!.width / 2,
      firstItemBox!.y + firstItemBox!.height / 2,
    );
    await reactGrab.page.waitForTimeout(150);
    await reactGrab.waitForSelectionBox();

    const initialLabel = await reactGrab.getSelectionLabelInfo();
    expect(initialLabel.isVisible).toBe(true);

    await reactGrab.page.evaluate(() => {
      window.scrollBy(0, 100);
    });
    await reactGrab.page.waitForTimeout(200);

    const isVisible = await reactGrab.isOverlayVisible();
    expect(isVisible).toBe(true);
  });

  test("should update selection to new element after scroll changes element under cursor", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();

    const heading = reactGrab.page.locator("[data-testid='main-title']");
    const headingBox = await heading.boundingBox();
    expect(headingBox).not.toBeNull();

    const cursorX = headingBox!.x + headingBox!.width / 2;
    const cursorY = headingBox!.y + headingBox!.height / 2;

    await reactGrab.page.mouse.move(cursorX, cursorY);
    await reactGrab.page.waitForTimeout(150);
    await reactGrab.waitForSelectionBox();

    const initialBounds = await reactGrab.getSelectionBoxBounds();
    expect(initialBounds).not.toBeNull();

    await reactGrab.page.evaluate(() => {
      window.scrollBy(0, 200);
    });
    await reactGrab.page.waitForTimeout(200);

    const newBounds = await reactGrab.getSelectionBoxBounds();
    if (newBounds !== null && initialBounds !== null) {
      const boundsChanged =
        newBounds.y !== initialBounds.y || newBounds.height !== initialBounds.height;
      expect(boundsChanged).toBe(true);
    }
  });

  test("should re-detect element after viewport resize without mouse movement", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();

    const heading = reactGrab.page.locator("[data-testid='main-title']");
    const headingBox = await heading.boundingBox();
    expect(headingBox).not.toBeNull();

    await reactGrab.page.mouse.move(
      headingBox!.x + headingBox!.width / 2,
      headingBox!.y + headingBox!.height / 2,
    );
    await reactGrab.page.waitForTimeout(150);
    await reactGrab.waitForSelectionBox();

    const initialBounds = await reactGrab.getSelectionBoxBounds();
    expect(initialBounds).not.toBeNull();

    await reactGrab.setViewportSize(800, 400);
    await reactGrab.page.waitForTimeout(200);

    const isVisible = await reactGrab.isOverlayVisible();
    expect(isVisible).toBe(true);

    await reactGrab.setViewportSize(1280, 720);
  });

  test("should not re-detect element during drag operation on scroll", async ({ reactGrab }) => {
    await reactGrab.activate();

    const todoList = reactGrab.page.locator("[data-testid='todo-list'] ul");
    const listBox = await todoList.boundingBox();
    expect(listBox).not.toBeNull();

    const startX = listBox!.x - 10;
    const startY = listBox!.y;
    const endX = listBox!.x + listBox!.width + 10;
    const endY = listBox!.y + listBox!.height;

    await reactGrab.page.mouse.move(startX, startY);
    await reactGrab.page.mouse.down();
    await reactGrab.page.mouse.move(endX, endY, { steps: 5 });

    const state = await reactGrab.getState();
    expect(state.isDragging).toBe(true);

    await reactGrab.page.evaluate(() => {
      window.scrollBy(0, 50);
    });
    await reactGrab.page.waitForTimeout(100);

    const stateAfterScroll = await reactGrab.getState();
    expect(stateAfterScroll.isDragging).toBe(true);

    await reactGrab.page.mouse.up();
  });

  test("should not re-detect element when selection is frozen via arrow navigation", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("[data-testid='todo-list'] li:first-child");
    await reactGrab.waitForSelectionBox();

    await reactGrab.pressArrowDown();
    await reactGrab.page.waitForTimeout(100);

    const labelBeforeScroll = await reactGrab.getSelectionLabelInfo();

    await reactGrab.page.evaluate(() => {
      window.scrollBy(0, 30);
    });
    await reactGrab.page.waitForTimeout(200);

    const labelAfterScroll = await reactGrab.getSelectionLabelInfo();

    expect(labelAfterScroll.tagName).toBe(labelBeforeScroll.tagName);
  });

  test("should update selection position after viewport resize", async ({ reactGrab }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("li:first-child");
    await reactGrab.waitForSelectionBox();

    await reactGrab.page.setViewportSize({ width: 800, height: 600 });
    await reactGrab.page.waitForTimeout(200);

    const isVisible = await reactGrab.isOverlayVisible();
    expect(isVisible).toBe(true);

    await reactGrab.page.setViewportSize({ width: 1280, height: 720 });
  });

  test("should handle mouse movement after scroll", async ({ reactGrab }) => {
    await reactGrab.activate();

    await reactGrab.scrollPage(100);

    await reactGrab.hoverElement("li:nth-child(5)");
    await reactGrab.waitForSelectionBox();

    const isVisible = await reactGrab.isOverlayVisible();
    expect(isVisible).toBe(true);
  });

  test("should allow drag selection after scrolling", async ({ reactGrab }) => {
    await reactGrab.activate();
    await reactGrab.scrollPage(50);

    await reactGrab.dragSelect("li:first-child", "li:nth-child(3)");
    await reactGrab.page.waitForTimeout(500);

    const clipboardContent = await reactGrab.getClipboardContent();
    expect(clipboardContent).toBeTruthy();
  });

  test("should preserve frozen selection during scroll via arrow navigation", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("li:first-child");
    await reactGrab.waitForSelectionBox();

    await reactGrab.pressArrowDown();
    await reactGrab.scrollPage(100);

    const isVisible = await reactGrab.isOverlayVisible();
    expect(isVisible).toBe(true);
  });

  test("should handle keyboard navigation after scroll", async ({ reactGrab }) => {
    await reactGrab.activate();
    await reactGrab.scrollPage(50);

    await reactGrab.hoverElement("li:first-child");
    await reactGrab.waitForSelectionBox();

    await reactGrab.pressArrowDown();
    await reactGrab.pressArrowDown();

    const isVisible = await reactGrab.isOverlayVisible();
    expect(isVisible).toBe(true);
  });

  test("should recalculate bounds after visual viewport change", async ({ reactGrab }) => {
    await reactGrab.activate();

    const heading = reactGrab.page.locator("[data-testid='main-title']");
    const headingBox = await heading.boundingBox();
    expect(headingBox).not.toBeNull();

    await reactGrab.page.mouse.move(
      headingBox!.x + headingBox!.width / 2,
      headingBox!.y + headingBox!.height / 2,
    );
    await reactGrab.page.waitForTimeout(150);
    await reactGrab.waitForSelectionBox();

    const initialBounds = await reactGrab.getSelectionBoxBounds();
    expect(initialBounds).not.toBeNull();

    await reactGrab.page.evaluate(() => {
      window.visualViewport?.dispatchEvent(new Event("resize"));
      window.visualViewport?.dispatchEvent(new Event("scroll"));
    });
    await reactGrab.page.waitForTimeout(200);

    const isVisible = await reactGrab.isOverlayVisible();
    expect(isVisible).toBe(true);

    const boundsAfter = await reactGrab.getSelectionBoxBounds();
    expect(boundsAfter).not.toBeNull();
  });

  test("should copy element after resize using click", async ({ reactGrab }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("[data-testid='todo-list'] h1");
    await reactGrab.waitForSelectionBox();

    await reactGrab.page.setViewportSize({ width: 600, height: 400 });
    await reactGrab.page.waitForTimeout(200);

    await reactGrab.hoverElement("[data-testid='todo-list'] h1");
    await reactGrab.waitForSelectionBox();
    await reactGrab.clickElement("[data-testid='todo-list'] h1");

    await expect
      .poll(() => reactGrab.getClipboardContent(), { timeout: 5000 })
      .toContain("Todo List");

    await reactGrab.page.setViewportSize({ width: 1280, height: 720 });
  });
});
