import { test, expect } from "./fixtures.js";

test.describe("Element Context Fallback", () => {
  test.describe("React Elements", () => {
    test("should copy a compact reference or verbose context for React elements", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();

      await reactGrab.hoverUntilSelected("[data-testid='todo-list'] h1");
      await reactGrab.clickElement("[data-testid='todo-list'] h1");

      const clipboard = await reactGrab.getClipboardContent();
      expect(clipboard).toMatch(/^\[<\w+[\s>]/);
      expect(clipboard).toContain("TodoList");
    });

    test("should produce useful context for nested elements", async ({ reactGrab }) => {
      await reactGrab.activate();

      await reactGrab.hoverUntilSelected("[data-testid='nested-button']");
      await reactGrab.clickElement("[data-testid='nested-button']");

      const clipboard = await reactGrab.getClipboardContent();
      expect(clipboard).toMatch(/^\[<\w+[\s>]/);
      expect(clipboard).toContain("DeeplyNested");
    });

    test("should produce useful context for todo items", async ({ reactGrab }) => {
      await reactGrab.activate();

      const todoItem = "[data-testid='todo-list'] ul li:first-child span";
      await reactGrab.hoverUntilSelected(todoItem);
      await reactGrab.clickElement(todoItem);

      const clipboard = await reactGrab.getClipboardContent();
      expect(clipboard).toMatch(/^\[<\w+[\s>]/);
      expect(clipboard).toContain("TodoItem");
    });

    test("should prefer an actionable ancestor over a weak role with trusted source", async ({
      reactGrab,
    }) => {
      const didCopy = await reactGrab.copyElementViaApi("[data-testid='production-icon-link'] svg");
      expect(didCopy).toBe(true);

      const clipboard = await reactGrab.getClipboardContent();
      expect(clipboard).toContain("<svg");
      expect(clipboard).toContain('selector: [data-testid="production-icon-link"]');
      expect(clipboard).not.toContain('selector: [role="img"]');
    });

    test("should surface the list-item key for mapped host elements", async ({ reactGrab }) => {
      await reactGrab.activate();

      const mappedItem = "[data-testid='dynamic-element-2']";
      await reactGrab.hoverUntilSelected(mappedItem);
      await reactGrab.clickElement(mappedItem);

      const clipboard = await reactGrab.getClipboardContent();
      expect(clipboard).toContain('key: "2"');
    });

    test("should surface the list-item key for mapped component instances", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();

      const todoItem = "[data-testid='todo-list'] ul li:nth-child(3) span";
      await reactGrab.hoverUntilSelected(todoItem);
      await reactGrab.clickElement(todoItem);

      const clipboard = await reactGrab.getClipboardContent();
      expect(clipboard).toContain('key: "3"');
    });

    test("should surface the wrapper key when picking inside a mapped child component", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();

      const cardBody = "[data-testid='mapped-card-bravo'] p";
      await reactGrab.hoverUntilSelected(cardBody);
      await reactGrab.clickElement(cardBody);

      const clipboard = await reactGrab.getClipboardContent();
      expect(clipboard).toContain('key: "bravo"');
    });

    test("should not surface a key for a keyed replacement outside a list", async ({
      reactGrab,
    }) => {
      const didCopy = await reactGrab.copyElementViaApi("[data-testid='fiber-swap-target']");

      expect(didCopy).toBe(true);
      expect(await reactGrab.getClipboardContent()).not.toContain("key:");
    });

    test("should not surface a key for an unkeyed owner target", async ({ reactGrab }) => {
      const didCopy = await reactGrab.copyElementViaApi("[data-testid='direct-owner-target']");

      expect(didCopy).toBe(true);
      expect(await reactGrab.getClipboardContent()).not.toContain("key:");
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

      await reactGrab.hoverUntilSelected("#plain-dom-element");
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

      await reactGrab.hoverUntilSelected("#test-svg-icon");
      await reactGrab.clickElement("#test-svg-icon");

      const clipboard = await reactGrab.getClipboardContent();
      expect(clipboard).toContain("<svg");
      expect(clipboard).toContain('id="test-svg-icon"');
      expect(clipboard).toContain('class="icon-class"');
      expect(clipboard).toContain('aria-label="Close the modal dialog"');
      expect(clipboard).not.toContain("viewBox");
    });

    test("should include visible text for SVG text elements", async ({ reactGrab }) => {
      await reactGrab.page.evaluate(() => {
        const svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        const textElement = document.createElementNS("http://www.w3.org/2000/svg", "text");
        const textSpanElement = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
        textElement.id = "svg-visible-label";
        textSpanElement.textContent = "Quarterly revenue";
        textElement.appendChild(textSpanElement);
        svgElement.appendChild(textElement);
        document.body.appendChild(svgElement);
      });

      const didCopy = await reactGrab.copyElementViaApi("#svg-visible-label");
      expect(didCopy).toBe(true);

      const clipboard = await reactGrab.getClipboardContent();
      expect(clipboard).toContain('<text id="svg-visible-label">Quarterly revenue</text>');
    });

    test("should hover and copy pointer-events-none SVG text instead of its chart root", async ({
      reactGrab,
    }) => {
      await reactGrab.page.evaluate(() => {
        const wrapperElement = document.createElement("div");
        Object.assign(wrapperElement.style, {
          left: "200px",
          position: "fixed",
          top: "200px",
          zIndex: "999",
        });
        const svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svgElement.setAttribute("height", "100");
        svgElement.setAttribute("width", "400");
        const textElement = document.createElementNS("http://www.w3.org/2000/svg", "text");
        textElement.id = "pointer-events-none-svg-label";
        textElement.setAttribute("font-size", "24");
        textElement.setAttribute("x", "20");
        textElement.setAttribute("y", "50");
        textElement.style.pointerEvents = "none";
        textElement.textContent = "composer-2.5";
        svgElement.appendChild(textElement);
        wrapperElement.appendChild(svgElement);
        document.body.appendChild(wrapperElement);
      });

      await reactGrab.activate();
      await reactGrab.hoverUntilTargetSelected("#pointer-events-none-svg-label");
      await reactGrab.clickElement("#pointer-events-none-svg-label");

      const clipboard = await reactGrab.getClipboardContent();
      expect(clipboard).toContain('<text id="pointer-events-none-svg-label">composer-2.5</text>');

      await reactGrab.activate();
      await reactGrab.hoverUntilTargetSelected("#pointer-events-none-svg-label");
      await reactGrab.pressArrowUp();
      await expect.poll(async () => (await reactGrab.getSelectionLabelInfo()).tagName).toBe("svg");
      await reactGrab.pressArrowDown();
      await expect.poll(async () => (await reactGrab.getSelectionLabelInfo()).tagName).toBe("text");
    });

    test("should refine a native container hit to pointer-events-none HTML text", async ({
      reactGrab,
    }) => {
      await reactGrab.page.evaluate(() => {
        const buttonElement = document.createElement("button");
        Object.assign(buttonElement.style, {
          fontSize: "24px",
          left: "200px",
          padding: "20px",
          position: "fixed",
          top: "200px",
          zIndex: "999",
        });
        const labelElement = document.createElement("span");
        labelElement.id = "pointer-events-none-html-label";
        labelElement.style.pointerEvents = "none";
        labelElement.textContent = "Nested label";
        buttonElement.appendChild(labelElement);
        document.body.appendChild(buttonElement);
      });

      await reactGrab.activate();
      await reactGrab.hoverUntilTargetSelected("#pointer-events-none-html-label");
      await reactGrab.clickElement("#pointer-events-none-html-label");

      const clipboard = await reactGrab.getClipboardContent();
      expect(clipboard).toContain('<span id="pointer-events-none-html-label">Nested label</span>');
    });

    test("should use a semantic link selector for a source-less SVG path", async ({
      reactGrab,
    }) => {
      await reactGrab.page.evaluate(() => {
        const wrapper = document.createElement("div");
        Object.assign(wrapper.style, {
          position: "fixed",
          top: "200px",
          left: "200px",
          zIndex: "999",
        });
        const link = document.createElement("a");
        link.href = "/source-less-icon";
        link.setAttribute("aria-label", "Source-less icon link");
        const svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svgElement.style.width = "50px";
        svgElement.style.height = "50px";
        svgElement.setAttribute("role", "img");
        const pathElement = document.createElementNS("http://www.w3.org/2000/svg", "path");
        pathElement.setAttribute("d", "M0 0h24v24H0z");
        svgElement.appendChild(pathElement);
        link.appendChild(svgElement);
        wrapper.appendChild(link);
        document.body.appendChild(wrapper);
      });

      const didCopy = await reactGrab.copyElementViaApi(
        "a[aria-label='Source-less icon link'] path",
      );
      expect(didCopy).toBe(true);

      const clipboard = await reactGrab.getClipboardContent();
      expect(clipboard).toContain("<path");
      expect(clipboard).toContain('selector: [aria-label="Source-less icon link"]');
    });

    test("should prefer a nearby control over a distant labeled region", async ({ reactGrab }) => {
      await reactGrab.page.evaluate(() => {
        const labeledRegion = document.createElement("section");
        labeledRegion.setAttribute("aria-label", "Distant labeled region");
        const button = document.createElement("button");
        button.className = "source-less-control";
        const span = document.createElement("span");
        span.className = "source-less-control-leaf";
        span.textContent = "Nested control";
        button.appendChild(span);
        labeledRegion.appendChild(button);
        document.body.appendChild(labeledRegion);
      });

      const didCopy = await reactGrab.copyElementViaApi(".source-less-control-leaf");
      expect(didCopy).toBe(true);

      const clipboard = await reactGrab.getClipboardContent();
      expect(clipboard).toContain(".source-less-control");
      expect(clipboard).not.toContain('selector: [aria-label="Distant labeled region"]');
    });

    test("should prefer a unique id over a distant labeled region", async ({ reactGrab }) => {
      await reactGrab.page.evaluate(() => {
        const labeledRegion = document.createElement("section");
        labeledRegion.setAttribute("aria-label", "Broad labeled region");
        const identifiedTarget = document.createElement("div");
        identifiedTarget.id = "source-less-identified-target";
        const span = document.createElement("span");
        span.className = "source-less-identified-leaf";
        span.textContent = "Identified target";
        identifiedTarget.appendChild(span);
        labeledRegion.appendChild(identifiedTarget);
        document.body.appendChild(labeledRegion);
      });

      const didCopy = await reactGrab.copyElementViaApi(".source-less-identified-leaf");
      expect(didCopy).toBe(true);

      const clipboard = await reactGrab.getClipboardContent();
      expect(clipboard).toContain("selector: #source-less-identified-target");
      expect(clipboard).not.toContain('selector: [aria-label="Broad labeled region"]');
    });

    test("should not elevate a leaf to the application mount root", async ({ reactGrab }) => {
      await reactGrab.page.evaluate(() => {
        const applicationRoot = document.getElementById("root");
        if (!applicationRoot) throw new Error("Missing application root");
        const leaf = document.createElement("div");
        leaf.className = "source-less-root-leaf";
        leaf.textContent = "Root-nested leaf";
        applicationRoot.appendChild(leaf);
      });

      const didCopy = await reactGrab.copyElementViaApi(".source-less-root-leaf");
      expect(didCopy).toBe(true);

      const clipboard = await reactGrab.getClipboardContent();
      expect(clipboard).toContain(".source-less-root-leaf");
      expect(clipboard).not.toMatch(/selector: #root\]$/);
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
        longElement.setAttribute("aria-label", "&".repeat(300));
        longElement.className = "a".repeat(300);
        longElement.textContent = "<".repeat(300);
        wrapper.appendChild(longElement);
        document.body.appendChild(wrapper);
      });

      await reactGrab.activate();

      await reactGrab.hoverUntilSelected("#long-dom-element");
      await reactGrab.clickElement("#long-dom-element");

      const clipboard = await reactGrab.getClipboardContent();
      expect(clipboard).toContain("long-dom-element");
      expect(clipboard.length).toBeLessThanOrEqual(510);
    });

    test("should retain class when other attributes fill the preview budget", async ({
      reactGrab,
    }) => {
      await reactGrab.page.evaluate(() => {
        const button = document.createElement("button");
        button.id = "preview-budget-target";
        button.className = "class-marker";
        button.setAttribute("aria-label", "Preview budget target");
        button.setAttribute("data-testid", "preview-budget-target");
        button.setAttribute("role", "button");
        button.setAttribute("name", "preview-budget");
        button.setAttribute("title", "Preview budget");
        button.setAttribute("type", "button");
        button.setAttribute("data-state", "open");
        button.setAttribute("data-value", "preview");
        button.setAttribute("tabindex", "0");
        button.textContent = "Preview budget target";
        document.body.appendChild(button);
      });

      const didCopy = await reactGrab.copyElementViaApi(".class-marker");
      expect(didCopy).toBe(true);

      const clipboard = await reactGrab.getClipboardContent();
      expect(clipboard).toContain(
        '<button id="preview-budget-target" class="class-marker" aria-label=',
      );
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
      expect(clipboard).toContain(
        'href="/docs/ci-and-prs/github-actions-setup">GitHub Actions setup',
      );
      expect(clipboard).toContain("GitHub Actions setup");
      expect(clipboard).not.toContain("# GitHub Actions setup");
      expect(clipboard).toContain('selector: [href="/docs/ci-and-prs/github-actions-setup"]');
      expect(clipboard).toContain("</a>");
    });

    test("should skip preview text for hidden selected roots", async ({ reactGrab }) => {
      await reactGrab.page.evaluate(() => {
        const wrapper = document.createElement("div");
        Object.assign(wrapper.style, {
          position: "fixed",
          top: "200px",
          left: "200px",
          width: "200px",
          height: "80px",
          zIndex: "999",
        });

        const hiddenLabel = document.createElement("span");
        hiddenLabel.setAttribute("aria-hidden", "true");
        hiddenLabel.setAttribute("data-testid", "decorative-hidden-label");
        hiddenLabel.textContent = "Decorative Hidden Label";

        wrapper.appendChild(hiddenLabel);
        document.body.appendChild(wrapper);
      });

      const didCopy = await reactGrab.copyElementViaApi("[data-testid='decorative-hidden-label']");
      expect(didCopy).toBe(true);

      const clipboard = await reactGrab.getClipboardContent();
      expect(clipboard).toContain('aria-hidden="true"');
      expect(clipboard).not.toContain("Decorative Hidden Label");
    });

    test("should keep child placeholders alongside direct text in element info", async ({
      reactGrab,
    }) => {
      await reactGrab.page.evaluate(() => {
        const wrapper = document.createElement("div");
        Object.assign(wrapper.style, {
          position: "fixed",
          top: "200px",
          left: "200px",
          width: "260px",
          height: "80px",
          zIndex: "999",
        });

        const card = document.createElement("div");
        card.id = "mixed-content-card";
        card.append("Hello ");
        const detail = document.createElement("span");
        detail.textContent = "world";
        card.appendChild(detail);

        wrapper.appendChild(card);
        document.body.appendChild(wrapper);
      });

      const elementInfo = await reactGrab.page.evaluate(() => {
        const formatInfo = (window as { formatElementInfo?: (element: Element) => Promise<string> })
          .formatElementInfo;
        const element = document.querySelector("#mixed-content-card");
        if (!element || !formatInfo) return null;
        return formatInfo(element);
      });

      expect(elementInfo).toContain("Hello");
      expect(elementInfo).toContain("<span ...>");
    });

    test("should encode structural characters inside attribute values", async ({ reactGrab }) => {
      await reactGrab.page.evaluate(() => {
        const wrapper = document.createElement("div");
        Object.assign(wrapper.style, {
          position: "fixed",
          top: "200px",
          left: "200px",
          width: "200px",
          height: "80px",
          zIndex: "999",
        });

        const saveButton = document.createElement("button");
        saveButton.id = "multiline-label-button";
        saveButton.setAttribute("aria-label", 'Save "draft" & close\n  next');
        saveButton.textContent = "Save";

        wrapper.appendChild(saveButton);
        document.body.appendChild(wrapper);
      });

      const didCopy = await reactGrab.copyElementViaApi("#multiline-label-button");
      expect(didCopy).toBe(true);

      const clipboard = await reactGrab.getClipboardContent();
      expect(clipboard).toContain('aria-label="Save &quot;draft&quot; &amp; close&#10;  next"');
      expect(clipboard).not.toContain('aria-label="Save "draft"');
    });

    test("should include nested text for mixed inline content", async ({ reactGrab }) => {
      await reactGrab.page.evaluate(() => {
        const wrapper = document.createElement("div");
        Object.assign(wrapper.style, {
          position: "fixed",
          top: "200px",
          left: "200px",
          width: "260px",
          height: "80px",
          zIndex: "999",
        });

        const link = document.createElement("a");
        link.href = "/docs/mixed-content";
        link.textContent = "Read ";
        const emphasizedText = document.createElement("em");
        emphasizedText.textContent = "the docs";
        link.appendChild(emphasizedText);

        wrapper.appendChild(link);
        document.body.appendChild(wrapper);
      });

      const didCopy = await reactGrab.copyElementViaApi("a[href='/docs/mixed-content']");
      expect(didCopy).toBe(true);

      const clipboard = await reactGrab.getClipboardContent();
      expect(clipboard).toContain("Read the docs");
      expect(clipboard).not.toContain("<em ...>");
    });
  });
});
