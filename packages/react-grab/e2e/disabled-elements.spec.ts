import { test, expect } from "./fixtures.js";

const CONTAINER_ID = "disabled-test-container";

test.describe("Disabled Element Selection", () => {
  test.beforeEach(async ({ reactGrab }) => {
    await reactGrab.page.evaluate((containerId) => {
      const container = document.createElement("div");
      container.id = containerId;
      container.innerHTML = `
        <div style="padding: 20px; margin: 20px; border: 1px solid #ccc;">
          <h3>Disabled Elements Test</h3>
          <button disabled data-testid="disabled-button" style="padding: 10px 20px;">
            Disabled Button
          </button>
          <input disabled data-testid="disabled-input" value="Disabled Input" style="margin-left: 10px; padding: 10px;" />
          <select disabled data-testid="disabled-select" style="margin-left: 10px; padding: 10px;">
            <option>Disabled Select</option>
          </select>
          <textarea disabled data-testid="disabled-textarea" style="margin-left: 10px; padding: 10px;">Disabled Textarea</textarea>
        </div>
      `;
      document.body.insertBefore(container, document.body.firstChild);
    }, CONTAINER_ID);
  });

  test.afterEach(async ({ reactGrab }) => {
    await reactGrab.page.evaluate((containerId) => {
      document.getElementById(containerId)?.remove();
    }, CONTAINER_ID);
  });

  test("should select disabled button element", async ({ reactGrab }) => {
    await reactGrab.activate();

    const bounds = await reactGrab.getElementBounds(
      "[data-testid='disabled-button']",
    );
    if (!bounds) throw new Error("Could not get element bounds");

    await reactGrab.page.mouse.move(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
    );
    await reactGrab.waitForSelectionBox();

    const isVisible = await reactGrab.isSelectionBoxVisible();
    expect(isVisible).toBe(true);
  });

  test("should select disabled input element", async ({ reactGrab }) => {
    await reactGrab.activate();

    const bounds = await reactGrab.getElementBounds(
      "[data-testid='disabled-input']",
    );
    if (!bounds) throw new Error("Could not get element bounds");

    await reactGrab.page.mouse.move(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
    );
    await reactGrab.waitForSelectionBox();

    const isVisible = await reactGrab.isSelectionBoxVisible();
    expect(isVisible).toBe(true);
  });

  test("should select disabled textarea element", async ({ reactGrab }) => {
    await reactGrab.activate();

    const bounds = await reactGrab.getElementBounds(
      "[data-testid='disabled-textarea']",
    );
    if (!bounds) throw new Error("Could not get element bounds");

    await reactGrab.page.mouse.move(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
    );
    await reactGrab.waitForSelectionBox();

    const isVisible = await reactGrab.isSelectionBoxVisible();
    expect(isVisible).toBe(true);
  });

  test("should select disabled select element", async ({ reactGrab }) => {
    await reactGrab.activate();

    const bounds = await reactGrab.getElementBounds(
      "[data-testid='disabled-select']",
    );
    if (!bounds) throw new Error("Could not get element bounds");

    await reactGrab.page.mouse.move(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
    );
    await reactGrab.waitForSelectionBox();

    const isVisible = await reactGrab.isSelectionBoxVisible();
    expect(isVisible).toBe(true);
  });

  test("should select element with pointer-events none", async ({
    reactGrab,
  }) => {
    await reactGrab.page.evaluate(() => {
      const container = document.getElementById("disabled-test-container");
      const pointerEventsNoneElement = document.createElement("div");
      pointerEventsNoneElement.setAttribute(
        "data-testid",
        "pointer-events-none",
      );
      pointerEventsNoneElement.style.cssText =
        "pointer-events: none; padding: 20px; background: #f0f0f0; margin-top: 10px;";
      pointerEventsNoneElement.textContent = "Pointer Events None Element";
      container?.appendChild(pointerEventsNoneElement);
    });

    await reactGrab.activate();

    const bounds = await reactGrab.getElementBounds(
      "[data-testid='pointer-events-none']",
    );
    if (!bounds) throw new Error("Could not get element bounds");

    await reactGrab.page.mouse.move(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
    );
    await reactGrab.waitForSelectionBox();

    const isVisible = await reactGrab.isSelectionBoxVisible();
    expect(isVisible).toBe(true);
  });

  test("should copy element with pointer-events none via click", async ({
    reactGrab,
  }) => {
    await reactGrab.page.evaluate(() => {
      const container = document.getElementById("disabled-test-container");
      const pointerEventsNoneElement = document.createElement("div");
      pointerEventsNoneElement.setAttribute(
        "data-testid",
        "pointer-events-none",
      );
      pointerEventsNoneElement.style.cssText =
        "pointer-events: none; padding: 20px; background: #f0f0f0; margin-top: 10px;";
      pointerEventsNoneElement.textContent = "Pointer Events None Content";
      container?.appendChild(pointerEventsNoneElement);
    });

    await reactGrab.activate();

    const bounds = await reactGrab.getElementBounds(
      "[data-testid='pointer-events-none']",
    );
    if (!bounds) throw new Error("Could not get element bounds");

    await reactGrab.page.mouse.move(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
    );
    await reactGrab.waitForSelectionBox();

    await reactGrab.page.mouse.click(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
    );
    await expect
      .poll(() => reactGrab.getClipboardContent())
      .toContain("Pointer Events None");
  });

  test("should select nested disabled element inside enabled parent", async ({
    reactGrab,
  }) => {
    await reactGrab.page.evaluate(() => {
      const container = document.getElementById("disabled-test-container");
      const wrapper = document.createElement("div");
      wrapper.setAttribute("data-testid", "enabled-wrapper");
      wrapper.style.cssText =
        "padding: 20px; background: #e0e0e0; margin-top: 10px;";
      wrapper.innerHTML = `
        <span>Enabled wrapper</span>
        <button disabled data-testid="nested-disabled-button" style="margin-left: 10px; padding: 10px;">
          Nested Disabled
        </button>
      `;
      container?.appendChild(wrapper);
    });

    await reactGrab.activate();

    const bounds = await reactGrab.getElementBounds(
      "[data-testid='nested-disabled-button']",
    );
    if (!bounds) throw new Error("Could not get element bounds");

    await reactGrab.page.mouse.move(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
    );
    await reactGrab.waitForSelectionBox();

    const isVisible = await reactGrab.isSelectionBoxVisible();
    expect(isVisible).toBe(true);
  });

  test("should include disabled elements in drag selection", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();

    const containerBounds = await reactGrab.getElementBounds(
      "#disabled-test-container",
    );
    if (!containerBounds) throw new Error("Could not get container bounds");

    await reactGrab.page.mouse.move(
      containerBounds.x - 10,
      containerBounds.y - 10,
    );
    await reactGrab.page.mouse.down();
    await reactGrab.page.mouse.move(
      containerBounds.x + containerBounds.width + 10,
      containerBounds.y + containerBounds.height + 10,
      { steps: 10 },
    );
    await reactGrab.page.mouse.up();

    await expect
      .poll(async () => {
        const info = await reactGrab.getGrabbedBoxInfo();
        return info.count;
      })
      .toBeGreaterThanOrEqual(1);
  });
});

test.describe("Pointer Events None - Arrow Navigation", () => {
  test.beforeEach(async ({ reactGrab }) => {
    await reactGrab.page.evaluate((containerId) => {
      const container = document.createElement("div");
      container.id = containerId;
      document.body.insertBefore(container, document.body.firstChild);
    }, CONTAINER_ID);
  });

  test.afterEach(async ({ reactGrab }) => {
    await reactGrab.page.evaluate((containerId) => {
      document.getElementById(containerId)?.remove();
    }, CONTAINER_ID);
  });

  test("should support ArrowUp from pointer-events none element", async ({
    reactGrab,
  }) => {
    await reactGrab.page.evaluate((containerId) => {
      const container = document.getElementById(containerId);
      const parent = document.createElement("div");
      parent.setAttribute("data-testid", "arrow-up-parent");
      parent.style.cssText =
        "padding: 40px; background: #d0d0d0; margin-top: 10px;";
      const child = document.createElement("div");
      child.setAttribute("data-testid", "arrow-up-child");
      child.style.cssText =
        "pointer-events: none; padding: 20px; background: #f0f0f0;";
      child.textContent = "Pointer Events None Child";
      parent.appendChild(child);
      container?.appendChild(parent);
    }, CONTAINER_ID);

    await reactGrab.activate();

    const bounds = await reactGrab.getElementBounds(
      "[data-testid='arrow-up-child']",
    );
    if (!bounds) throw new Error("Could not get element bounds");
    await reactGrab.page.mouse.move(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
    );
    await reactGrab.waitForSelectionBox();
    expect(await reactGrab.isSelectionBoxVisible()).toBe(true);

    await reactGrab.pressArrowUp();
    await reactGrab.waitForSelectionBox();
    expect(await reactGrab.isSelectionBoxVisible()).toBe(true);
  });

  test("should support ArrowDown back to pointer-events none element", async ({
    reactGrab,
  }) => {
    await reactGrab.page.evaluate((containerId) => {
      const container = document.getElementById(containerId);
      const parent = document.createElement("div");
      parent.setAttribute("data-testid", "arrow-down-parent");
      parent.style.cssText =
        "padding: 40px; background: #d0d0d0; margin-top: 10px;";
      const child = document.createElement("div");
      child.setAttribute("data-testid", "arrow-down-child");
      child.style.cssText =
        "pointer-events: none; padding: 20px; background: #f0f0f0;";
      child.textContent = "Pointer Events None Child";
      parent.appendChild(child);
      container?.appendChild(parent);
    }, CONTAINER_ID);

    await reactGrab.activate();

    const bounds = await reactGrab.getElementBounds(
      "[data-testid='arrow-down-child']",
    );
    if (!bounds) throw new Error("Could not get element bounds");
    await reactGrab.page.mouse.move(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
    );
    await reactGrab.waitForSelectionBox();

    await reactGrab.pressArrowUp();
    await reactGrab.waitForSelectionBox();

    await reactGrab.pressArrowDown();
    await reactGrab.waitForSelectionBox();
    expect(await reactGrab.isSelectionBoxVisible()).toBe(true);
  });

  test("should support round-trip navigation", async ({ reactGrab }) => {
    await reactGrab.page.evaluate((containerId) => {
      const container = document.getElementById(containerId);
      const parent = document.createElement("div");
      parent.setAttribute("data-testid", "round-trip-parent");
      parent.style.cssText =
        "padding: 40px; background: #d0d0d0; margin-top: 10px;";
      const child = document.createElement("div");
      child.setAttribute("data-testid", "round-trip-child");
      child.style.cssText =
        "pointer-events: none; padding: 20px; background: #f0f0f0;";
      child.textContent = "Pointer Events None Child";
      parent.appendChild(child);
      container?.appendChild(parent);
    }, CONTAINER_ID);

    await reactGrab.activate();

    const bounds = await reactGrab.getElementBounds(
      "[data-testid='round-trip-child']",
    );
    if (!bounds) throw new Error("Could not get element bounds");
    await reactGrab.page.mouse.move(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
    );
    await reactGrab.waitForSelectionBox();

    await reactGrab.pressArrowUp();
    await reactGrab.waitForSelectionBox();
    expect(await reactGrab.isSelectionBoxVisible()).toBe(true);

    await reactGrab.pressArrowDown();
    await reactGrab.waitForSelectionBox();
    expect(await reactGrab.isSelectionBoxVisible()).toBe(true);

    await reactGrab.pressArrowUp();
    await reactGrab.waitForSelectionBox();
    expect(await reactGrab.isSelectionBoxVisible()).toBe(true);
  });

  test("should navigate through nested pointer-events none elements", async ({
    reactGrab,
  }) => {
    await reactGrab.page.evaluate((containerId) => {
      const container = document.getElementById(containerId);
      const grandparent = document.createElement("div");
      grandparent.setAttribute("data-testid", "nested-grandparent");
      grandparent.style.cssText =
        "padding: 60px; background: #c0c0c0; margin-top: 10px;";
      const parent = document.createElement("div");
      parent.setAttribute("data-testid", "nested-parent");
      parent.style.cssText =
        "pointer-events: none; padding: 40px; background: #d0d0d0;";
      const child = document.createElement("div");
      child.setAttribute("data-testid", "nested-child");
      child.style.cssText =
        "pointer-events: none; padding: 20px; background: #f0f0f0;";
      child.textContent = "Deeply Nested Pointer Events None";
      parent.appendChild(child);
      grandparent.appendChild(parent);
      container?.appendChild(grandparent);
    }, CONTAINER_ID);

    await reactGrab.activate();

    const bounds = await reactGrab.getElementBounds(
      "[data-testid='nested-child']",
    );
    if (!bounds) throw new Error("Could not get element bounds");
    await reactGrab.page.mouse.move(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
    );
    await reactGrab.waitForSelectionBox();
    expect(await reactGrab.isSelectionBoxVisible()).toBe(true);

    await reactGrab.pressArrowUp();
    await reactGrab.waitForSelectionBox();
    expect(await reactGrab.isSelectionBoxVisible()).toBe(true);

    await reactGrab.pressArrowUp();
    await reactGrab.waitForSelectionBox();
    expect(await reactGrab.isSelectionBoxVisible()).toBe(true);
  });
});
