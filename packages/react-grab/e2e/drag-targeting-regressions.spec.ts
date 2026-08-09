import { expect, test } from "./fixtures.js";

test.describe("drag targeting regressions", () => {
  test("keeps the candidate preview visible during continuous movement", async ({ reactGrab }) => {
    await reactGrab.page.evaluate(() => {
      const targetElement = document.createElement("button");
      targetElement.textContent = "Continuous drag target";
      targetElement.style.cssText =
        "position:fixed;left:100px;top:100px;width:160px;height:120px;z-index:2147480000";
      document.body.append(targetElement);
    });

    await reactGrab.activate();
    await reactGrab.page.mouse.move(80, 80);
    await reactGrab.page.mouse.down();

    for (let stepIndex = 1; stepIndex <= 15; stepIndex += 1) {
      await reactGrab.page.mouse.move(80 + stepIndex * 8, 80 + stepIndex * 6);
      await reactGrab.page.waitForTimeout(10);
    }

    expect(
      await reactGrab.page.evaluate(
        () => window.__REACT_GRAB__?.getState().isSelectionBoxVisible ?? false,
      ),
    ).toBe(true);

    await reactGrab.page.mouse.up();
  });

  test("uses release direction to choose between equal partial candidates", async ({
    reactGrab,
  }) => {
    await reactGrab.page.evaluate(() => {
      const leftElement = document.createElement("div");
      leftElement.dataset.testid = "direction-left";
      leftElement.style.cssText =
        "position:fixed;left:50px;top:80px;width:120px;height:140px;background:#ef4444;z-index:2147480000";

      const rightElement = document.createElement("div");
      rightElement.dataset.testid = "direction-right";
      rightElement.style.cssText =
        "position:fixed;left:130px;top:80px;width:120px;height:140px;background:#3b82f6;z-index:2147480000";

      document.body.append(leftElement, rightElement);
      window.__REACT_GRAB__?.registerPlugin({
        name: "drag-direction-regression",
        hooks: {
          onDragEnd: (elements) => {
            document.documentElement.dataset.dragDirectionTargets = elements
              .map((element) => element.getAttribute("data-testid") ?? element.tagName)
              .join(",");
          },
        },
      });
    });

    await reactGrab.activate();
    await reactGrab.page.mouse.move(100, 100);
    await reactGrab.page.mouse.down();
    await reactGrab.page.mouse.move(200, 200, { steps: 10 });
    await reactGrab.page.mouse.up();
    await expect
      .poll(() =>
        reactGrab.page.evaluate(() => document.documentElement.dataset.dragDirectionTargets ?? ""),
      )
      .toBe("direction-right");

    await reactGrab.page.evaluate(() => {
      delete document.documentElement.dataset.dragDirectionTargets;
    });
    await reactGrab.activate();
    await reactGrab.page.mouse.move(200, 200);
    await reactGrab.page.mouse.down();
    await reactGrab.page.mouse.move(100, 100, { steps: 10 });
    await reactGrab.page.mouse.up();
    await expect
      .poll(() =>
        reactGrab.page.evaluate(() => document.documentElement.dataset.dragDirectionTargets ?? ""),
      )
      .toBe("direction-left");
  });

  test("selects pointer-events-none text at the release point", async ({ reactGrab }) => {
    await reactGrab.page.evaluate(() => {
      const containerElement = document.createElement("div");
      containerElement.dataset.testid = "pointer-none-container";
      containerElement.style.cssText =
        "position:fixed;left:40px;top:80px;width:220px;height:80px;background:#111827;z-index:2147480000";

      const labelElement = document.createElement("span");
      labelElement.dataset.testid = "pointer-none-release-label";
      labelElement.textContent = "composer-2.5";
      labelElement.style.cssText =
        "position:absolute;left:110px;top:30px;width:120px;height:30px;pointer-events:none;font-size:20px;line-height:30px;color:white";
      containerElement.append(labelElement);
      document.body.append(containerElement);

      window.__REACT_GRAB__?.registerPlugin({
        name: "pointer-none-release-regression",
        hooks: {
          onDragEnd: (elements) => {
            document.documentElement.dataset.pointerNoneDragTargets = elements
              .map((element) => element.getAttribute("data-testid") ?? element.tagName)
              .join(",");
          },
        },
      });
    });

    await reactGrab.activate();
    await reactGrab.page.mouse.move(100, 90);
    await reactGrab.page.mouse.down();
    await reactGrab.page.mouse.move(190, 125, { steps: 10 });
    await reactGrab.page.mouse.up();

    await expect
      .poll(() =>
        reactGrab.page.evaluate(
          () => document.documentElement.dataset.pointerNoneDragTargets ?? "",
        ),
      )
      .toBe("pointer-none-release-label");
  });

  test("falls through an ignored top layer during drag selection", async ({ reactGrab }) => {
    await reactGrab.page.evaluate(() => {
      const targetElement = document.createElement("button");
      targetElement.dataset.testid = "under-overlay-drag-target";
      targetElement.textContent = "Target";
      targetElement.style.cssText =
        "position:fixed;left:100px;top:100px;width:100px;height:100px;z-index:2147480000";

      const overlayElement = document.createElement("div");
      overlayElement.dataset.testid = "ignored-drag-overlay";
      overlayElement.setAttribute("data-react-grab-ignore", "");
      overlayElement.style.cssText =
        "position:fixed;left:100px;top:100px;width:100px;height:100px;background:transparent;z-index:2147480001";
      document.body.append(targetElement, overlayElement);

      window.__REACT_GRAB__?.registerPlugin({
        name: "ignored-overlay-drag-regression",
        hooks: {
          onDragEnd: (elements) => {
            document.documentElement.dataset.overlayDragTargets = elements
              .map((element) => element.getAttribute("data-testid") ?? element.tagName)
              .join(",");
          },
        },
      });
    });

    await reactGrab.activate();
    await reactGrab.page.mouse.move(90, 90);
    await reactGrab.page.mouse.down();
    await reactGrab.page.mouse.move(190, 190, { steps: 10 });
    await reactGrab.page.mouse.up();

    await expect
      .poll(() =>
        reactGrab.page.evaluate(() => document.documentElement.dataset.overlayDragTargets ?? ""),
      )
      .toBe("under-overlay-drag-target");
  });

  test("fills unsampled table rows without selecting the table shell", async ({ reactGrab }) => {
    await reactGrab.page.evaluate(() => {
      const tableElement = document.createElement("table");
      tableElement.style.cssText =
        "position:fixed;left:100px;top:100px;width:120px;height:200px;border-collapse:collapse;font-size:0;line-height:0;z-index:2147480000";
      const tableBodyElement = document.createElement("tbody");
      for (let rowIndex = 0; rowIndex < 20; rowIndex += 1) {
        const rowElement = document.createElement("tr");
        rowElement.dataset.testid = `sparse-row-${rowIndex + 1}`;
        rowElement.style.height = "10px";
        const cellElement = document.createElement("td");
        cellElement.textContent = String(rowIndex + 1);
        cellElement.style.cssText = "height:10px;padding:0";
        rowElement.append(cellElement);
        tableBodyElement.append(rowElement);
      }
      tableElement.append(tableBodyElement);
      document.body.append(tableElement);

      window.__REACT_GRAB__?.registerPlugin({
        name: "sparse-table-drag-regression",
        hooks: {
          onDragEnd: (elements) => {
            document.documentElement.dataset.sparseTableDragTargets = elements
              .map((element) => element.getAttribute("data-testid") ?? element.tagName)
              .join(",");
          },
        },
      });
    });

    const firstRowBounds = await reactGrab.page
      .locator("[data-testid='sparse-row-1']")
      .boundingBox();
    const tenthRowBounds = await reactGrab.page
      .locator("[data-testid='sparse-row-10']")
      .boundingBox();
    if (!firstRowBounds || !tenthRowBounds) throw new Error("Could not measure sparse table rows");

    await reactGrab.activate();
    await reactGrab.page.mouse.move(firstRowBounds.x + 1, firstRowBounds.y + 1);
    await reactGrab.page.mouse.down();
    await reactGrab.page.mouse.move(
      tenthRowBounds.x + tenthRowBounds.width - 1,
      tenthRowBounds.y + tenthRowBounds.height - 1,
      { steps: 10 },
    );
    await reactGrab.page.mouse.up();

    await expect
      .poll(() =>
        reactGrab.page.evaluate(
          () => document.documentElement.dataset.sparseTableDragTargets?.split(",") ?? [],
        ),
      )
      .toEqual(Array.from({ length: 10 }, (_, rowIndex) => `sparse-row-${rowIndex + 1}`));
  });
});
