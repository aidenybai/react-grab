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

    test("should include HTML preview with tag and content", async ({ reactGrab }) => {
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

    test("should include parent components in stack, not just immediate component", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();

      await reactGrab.hoverElement("[data-testid='nested-button']");
      await reactGrab.waitForSelectionBox();
      await reactGrab.clickElement("[data-testid='nested-button']");

      const clipboard = await reactGrab.getClipboardContent();
      const inMatches = clipboard.match(/in\s+\S+/g) ?? [];
      expect(inMatches.length).toBeGreaterThanOrEqual(2);
    });

    test("should include ancestor component for todo item", async ({ reactGrab }) => {
      await reactGrab.activate();

      const todoItem = "[data-testid='todo-list'] ul li:first-child span";
      await reactGrab.hoverElement(todoItem);
      await reactGrab.waitForSelectionBox();
      await reactGrab.clickElement(todoItem);

      const clipboard = await reactGrab.getClipboardContent();
      expect(clipboard).toContain("TodoItem");
    });

    test("should include third-party component name for library icons", async ({ reactGrab }) => {
      await reactGrab.activate();

      const icon = "[data-testid='library-icon-host'] svg";
      await reactGrab.hoverElement(icon);
      await reactGrab.waitForSelectionBox();
      await reactGrab.clickElement(icon);

      const clipboard = await reactGrab.getClipboardContent();
      expect(clipboard).toContain("<svg");
      // lucide-react ships the component under the display name "Square"
      // (SquareIcon is just an export alias). Without the third-party
      // component fix, this frame would be filtered out entirely and the
      // stack would jump straight to LibraryIconSection.
      expect(clipboard).toMatch(/in\s+Square\b/);
      // The library frame should also be tagged with the originating package
      // (parsed from its node_modules file path) so the agent knows where the
      // component came from without us leaking the bundled file path.
      expect(clipboard).toMatch(/in\s+Square\s+\(lucide-react\)/);
      expect(clipboard).toContain("LibraryIconSection");
    });

    test("should preserve the scope when tagging frames from scoped packages", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();

      const trigger = "[data-testid='radix-dialog-trigger']";
      await reactGrab.hoverElement(trigger);
      await reactGrab.waitForSelectionBox();
      await reactGrab.clickElement(trigger);

      const clipboard = await reactGrab.getClipboardContent();
      // Vite's optimized-deps directory flattens scoped packages
      // (`@radix-ui_react-dialog.js`); the parser must round-trip that back
      // to the canonical `@scope/name` form, not drop the scope or the slash.
      expect(clipboard).toMatch(/\(@radix-ui\/react-dialog\)/);
      // The user's wrapper component must still survive the maxLines budget
      // even with a library frame consuming a slot — this is the coalescing
      // guarantee in action.
      expect(clipboard).toContain("RadixDialogSection");
    });
  });

  test.describe("Non-React Elements Fallback", () => {
    test("should fallback to HTML for plain DOM elements without React fiber", async ({
      reactGrab,
    }) => {
      await reactGrab.page.evaluate(() => {
        const wrapper = document.createElement("div");
        Object.assign(wrapper.style, {
          position: "fixed",
          top: "200px",
          left: "200px",
          width: "200px",
          height: "100px",
          zIndex: "999",
        });
        const plainElement = document.createElement("div");
        plainElement.id = "plain-dom-element";
        plainElement.className = "test-class";
        plainElement.textContent = "Plain DOM content";
        Object.assign(plainElement.style, { width: "100%", height: "100%", background: "#eee" });
        wrapper.appendChild(plainElement);
        document.body.appendChild(wrapper);
      });

      await reactGrab.activate();

      await reactGrab.hoverElement("#plain-dom-element");
      await reactGrab.waitForSelectionBox();
      await reactGrab.clickElement("#plain-dom-element");

      const clipboard = await reactGrab.getClipboardContent();
      expect(clipboard).toContain("plain-dom-element");
      expect(clipboard).toContain("Plain DOM content");
    });

    test("should include priority attrs for SVG elements", async ({ reactGrab }) => {
      await reactGrab.page.evaluate(() => {
        const wrapper = document.createElement("div");
        Object.assign(wrapper.style, {
          position: "fixed",
          top: "200px",
          left: "200px",
          zIndex: "999",
        });
        const svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svgElement.id = "test-svg-icon";
        svgElement.setAttribute("class", "icon-class");
        svgElement.setAttribute("aria-label", "Close the modal dialog");
        svgElement.setAttribute("viewBox", "0 0 24 24");
        svgElement.style.width = "50px";
        svgElement.style.height = "50px";
        wrapper.appendChild(svgElement);
        document.body.appendChild(wrapper);
      });

      await reactGrab.activate();

      await reactGrab.hoverElement("#test-svg-icon");
      await reactGrab.waitForSelectionBox();
      await reactGrab.clickElement("#test-svg-icon");

      const clipboard = await reactGrab.getClipboardContent();
      expect(clipboard).toContain("<svg");
      expect(clipboard).toContain('id="test-svg-icon"');
      expect(clipboard).toContain('class="icon-class"');
      expect(clipboard).toContain('aria-label="Close the modal dialog"');
      expect(clipboard).not.toContain("viewBox");
    });

    test("should truncate long outerHTML to max length", async ({ reactGrab }) => {
      await reactGrab.page.evaluate(() => {
        const wrapper = document.createElement("div");
        Object.assign(wrapper.style, {
          position: "fixed",
          top: "200px",
          left: "200px",
          width: "200px",
          height: "100px",
          zIndex: "999",
        });
        const longElement = document.createElement("div");
        longElement.id = "long-dom-element";
        longElement.className = "a".repeat(300);
        longElement.textContent = "b".repeat(300);
        wrapper.appendChild(longElement);
        document.body.appendChild(wrapper);
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

  test.describe("Source Snippet & Component Instance", () => {
    test("surfaces the literal JSX call site so the agent sees the props the user wrote", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();

      const todoItem = "[data-testid='todo-list'] ul li:first-child span";
      await reactGrab.hoverElement(todoItem);
      await reactGrab.waitForSelectionBox();
      await reactGrab.clickElement(todoItem);

      const clipboard = await reactGrab.getClipboardContent();
      // TodoItem is rendered with `<TodoItem key={todo.id} todo={todo} />`
      // in App.tsx. Either the source-snippet block or — when the source
      // map fetch fails — the JSX-call fallback on the stack line must
      // surface the call signature so the agent knows it's working with
      // a TodoItem component, not a bare `<li>`.
      expect(clipboard).toContain("TodoItem");
      expect(clipboard).toMatch(/<TodoItem\b|in <TodoItem\b/);
    });

    test("does not double-render the JSX-call signature when a trustworthy snippet is present", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();

      const todoItem = "[data-testid='todo-list'] ul li:first-child span";
      await reactGrab.hoverElement(todoItem);
      await reactGrab.waitForSelectionBox();
      await reactGrab.clickElement(todoItem);

      const clipboard = await reactGrab.getClipboardContent();
      // When a trustworthy source snippet is fetched, the literal JSX
      // already lives in the snippet block — re-emitting `in <TodoItem
      // ... />` on the stack line below is redundant noise. The stack
      // line should fall back to the bare component name.
      const hasSnippetBlock = /^\/\/ .+\.tsx?:\d+/m.test(clipboard);
      if (hasSnippetBlock) {
        expect(clipboard).toMatch(/in TodoItem \(at /);
        expect(clipboard).not.toMatch(/in <TodoItem/);
      }
    });

    test("does not paint props onto library frames whose name happens to match", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();

      const icon = "[data-testid='library-icon-host'] svg";
      await reactGrab.hoverElement(icon);
      await reactGrab.waitForSelectionBox();
      await reactGrab.clickElement(icon);

      const clipboard = await reactGrab.getClipboardContent();
      // Library frames stay in the bare `in Square (lucide-react)` shape
      // even if the closest composite fiber is the same library component.
      // Painting props onto a library frame would leak internal lucide-react
      // implementation details into the agent context.
      expect(clipboard).toMatch(/in Square \(lucide-react\)/);
      expect(clipboard).not.toMatch(/in <Square/);
    });
  });
});
