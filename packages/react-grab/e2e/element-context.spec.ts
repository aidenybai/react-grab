import { test, expect } from "./fixtures.js";

test.describe("Element Context Fallback", () => {
  test.describe("React Elements", () => {
    test("should include component names in clipboard for React elements", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();

      await reactGrab.hoverElement("[data-testid='todo-list'] h1");
      await reactGrab.waitForSelectionBox();
      await reactGrab.clickElement("[data-testid='todo-list'] h1");

      const clipboard = await reactGrab.getClipboardContent();
      expect(clipboard).toContain("TodoList");
    });

    test("should include HTML preview with tag and content", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();

      await reactGrab.hoverElement("[data-testid='main-title']");
      await reactGrab.waitForSelectionBox();
      await reactGrab.clickElement("[data-testid='main-title']");

      const clipboard = await reactGrab.getClipboardContent();
      expect(clipboard).toContain("<h1");
      expect(clipboard).toContain("React Grab");
    });

    test("should include nested component names for deeply nested elements", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();

      await reactGrab.hoverElement("[data-testid='nested-button']");
      await reactGrab.waitForSelectionBox();
      await reactGrab.clickElement("[data-testid='nested-button']");

      const clipboard = await reactGrab.getClipboardContent();
      expect(clipboard).toContain("NestedCard");
    });
  });

  test.describe("Non-React Elements Fallback", () => {
    test("should fallback to HTML for plain DOM elements without React fiber", async ({
      reactGrab,
    }) => {
      await reactGrab.page.evaluate(() => {
        const plainElement = document.createElement("div");
        plainElement.id = "plain-dom-element";
        plainElement.className = "test-class";
        plainElement.textContent = "Plain DOM content";
        document.body.appendChild(plainElement);
      });

      await reactGrab.activate();

      await reactGrab.hoverElement("#plain-dom-element");
      await reactGrab.waitForSelectionBox();
      await reactGrab.clickElement("#plain-dom-element");

      const clipboard = await reactGrab.getClipboardContent();
      expect(clipboard).toContain("plain-dom-element");
      expect(clipboard).toContain("Plain DOM content");
    });

    test("should truncate long outerHTML to max length", async ({
      reactGrab,
    }) => {
      await reactGrab.page.evaluate(() => {
        const longElement = document.createElement("div");
        longElement.id = "long-dom-element";
        longElement.className = "a".repeat(300);
        longElement.textContent = "b".repeat(300);
        document.body.appendChild(longElement);
      });

      await reactGrab.activate();

      await reactGrab.hoverElement("#long-dom-element");
      await reactGrab.waitForSelectionBox();
      await reactGrab.clickElement("#long-dom-element");

      const clipboard = await reactGrab.getClipboardContent();
      expect(clipboard).toContain("long-dom-element");
      expect(clipboard.length).toBeLessThanOrEqual(510);
    });
  });
});
