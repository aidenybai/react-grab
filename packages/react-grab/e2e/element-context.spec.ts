import { test, expect } from "./fixtures.js";

test.describe("Element Context Fallback", () => {
  test.describe("React Elements", () => {
    test("should copy a compact reference or verbose context for React elements", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();

      await reactGrab.hoverElement("[data-testid='todo-list'] h1");
      await reactGrab.waitForSelectionBox();
      await reactGrab.clickElement("[data-testid='todo-list'] h1");

      const clipboard = await reactGrab.getClipboardContent();
      expect(clipboard).toMatch(/^\[<\w+[\s>]/);
      expect(clipboard).toContain("TodoList");
    });

    test("should produce useful context for nested elements", async ({ reactGrab }) => {
      await reactGrab.activate();

      await reactGrab.hoverElement("[data-testid='nested-button']");
      await reactGrab.waitForSelectionBox();
      await reactGrab.clickElement("[data-testid='nested-button']");

      const clipboard = await reactGrab.getClipboardContent();
      expect(clipboard).toMatch(/^\[<\w+[\s>]/);
      expect(clipboard).toContain("NestedCard");
    });

    test("should produce useful context for todo items", async ({ reactGrab }) => {
      await reactGrab.activate();

      const todoItem = "[data-testid='todo-list'] ul li:first-child span";
      await reactGrab.hoverElement(todoItem);
      await reactGrab.waitForSelectionBox();
      await reactGrab.clickElement(todoItem);

      const clipboard = await reactGrab.getClipboardContent();
      expect(clipboard).toMatch(/^\[<\w+[\s>]/);
      expect(clipboard).toContain("TodoItem");
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

    test("should include descendant text for syntax highlighted code blocks", async ({
      reactGrab,
    }) => {
      await reactGrab.page.evaluate(() => {
        const wrapper = document.createElement("div");
        Object.assign(wrapper.style, {
          position: "fixed",
          top: "200px",
          left: "200px",
          width: "600px",
          height: "160px",
          zIndex: "999",
        });

        const codeBlock = document.createElement("pre");
        codeBlock.className = "shiki shiki-themes github-light github-dark";
        codeBlock.tabIndex = 0;
        codeBlock.innerHTML = `
          <code>
            <span class="line"><span>git</span><span> add</span><span> .github/workflows/react-doctor.yml</span></span>
            <span class="line"><span>git</span><span> commit</span><span> -m</span><span> "Add React Doctor to CI"</span></span>
            <span class="line"><span>git</span><span> push</span></span>
          </code>
        `;

        wrapper.appendChild(codeBlock);
        document.body.appendChild(wrapper);
      });

      const didCopy = await reactGrab.copyElementViaApi("pre.shiki");
      expect(didCopy).toBe(true);

      const clipboard = await reactGrab.getClipboardContent();
      expect(clipboard).toContain("<pre");
      expect(clipboard).toContain("git add .github/workflows/react-doctor.yml");
      expect(clipboard).toContain('git commit -m "Add React Doctor to CI"');
      expect(clipboard).toContain("</pre>");
    });

    test("should include descendant text for nested link labels", async ({ reactGrab }) => {
      await reactGrab.page.evaluate(() => {
        const wrapper = document.createElement("div");
        Object.assign(wrapper.style, {
          position: "fixed",
          top: "200px",
          left: "200px",
          width: "320px",
          height: "80px",
          zIndex: "999",
        });

        const link = document.createElement("a");
        link.href = "/docs/ci-and-prs/github-actions-setup";
        link.className = "flex h-8 w-full items-center gap-2 rounded-md px-2";
        link.innerHTML = `
          <span aria-hidden="true">#</span>
          <span><span>GitHub Actions setup</span></span>
        `;

        wrapper.appendChild(link);
        document.body.appendChild(wrapper);
      });

      const didCopy = await reactGrab.copyElementViaApi(
        "a[href='/docs/ci-and-prs/github-actions-setup']",
      );
      expect(didCopy).toBe(true);

      const clipboard = await reactGrab.getClipboardContent();
      expect(clipboard).toContain('<a href="/docs/ci-and-prs/github-actions-setup"');
      expect(clipboard).toContain("GitHub Actions setup");
      expect(clipboard).not.toContain("# GitHub Actions setup");
      expect(clipboard).toContain('selector: [href="/docs/ci-and-prs/github-actions-setup"]');
      expect(clipboard).toContain("</a>");
    });
  });
});
