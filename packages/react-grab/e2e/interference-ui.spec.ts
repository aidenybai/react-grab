// Functional guarantees against hostile runtimes (perf-interference.spec.ts
// owns the timing side). Each group pins the behavior react-grab must keep
// when an app fights it for events, frames, or DOM stability.
import { expect, getElementCenters, goToHeavyView, test } from "./perf-fixtures.js";

test.describe("interference: canvas paint loop", () => {
  test("grabs a marker chip over a repainting canvas", async ({ reactGrab, page }) => {
    await goToHeavyView(page, "canvas");
    await reactGrab.activate();
    await reactGrab.hoverUntilSelected("[data-canvas-marker='0']");
    expect(await reactGrab.isSelectionBoxVisible()).toBe(true);
    await reactGrab.deactivate();
  });

  test("canvas keeps painting after activate/deactivate", async ({ reactGrab, page }) => {
    await goToHeavyView(page, "canvas");
    await reactGrab.activate();
    await reactGrab.deactivate();

    const readCanvasSnapshot = () =>
      page.evaluate(() => {
        const canvasElement = document.querySelector<HTMLCanvasElement>(
          "[data-testid='heavy-canvas']",
        );
        return canvasElement?.toDataURL().length ?? 0;
      });
    const firstSnapshotSize = await readCanvasSnapshot();
    await page.waitForTimeout(300);
    const secondSnapshotSize = await readCanvasSnapshot();
    expect(firstSnapshotSize).toBeGreaterThan(0);
    // Particle positions differ frame to frame, so the encoded frames differ.
    expect(secondSnapshotSize).not.toBe(firstSnapshotSize);
  });
});

test.describe("interference: animation storm", () => {
  test("activate pauses WAAPI animations and deactivate resumes them", async ({
    reactGrab,
    page,
  }) => {
    await goToHeavyView(page, "animation-storm");

    const countAnimationsByState = () =>
      page.evaluate(() => {
        const states = { running: 0, paused: 0 };
        for (const animation of document.getAnimations()) {
          if (animation.playState === "running") states.running += 1;
          if (animation.playState === "paused") states.paused += 1;
        }
        return states;
      });

    const beforeActivation = await countAnimationsByState();
    expect(beforeActivation.running).toBeGreaterThan(100);

    await reactGrab.activate();
    await page.waitForTimeout(200);
    const whileActive = await countAnimationsByState();
    expect(whileActive.paused).toBeGreaterThan(100);

    await reactGrab.deactivate();
    await page.waitForTimeout(200);
    const afterDeactivation = await countAnimationsByState();
    expect(afterDeactivation.running).toBeGreaterThan(100);
  });

  test("selects an element animated by a rAF style loop", async ({ reactGrab, page }) => {
    await goToHeavyView(page, "animation-storm");
    await reactGrab.activate();
    await reactGrab.hoverUntilSelected("[data-raf-mutator='5']");
    expect(await reactGrab.isSelectionBoxVisible()).toBe(true);
    await reactGrab.deactivate();
  });
});

test.describe("interference: kanban pointer-capture dnd", () => {
  test("app drag works while react-grab is idle", async ({ reactGrab, page }) => {
    void reactGrab;
    await goToHeavyView(page, "kanban");

    const readFirstColumnCount = () =>
      page.locator("[data-testid='kanban-column-1'] [data-kanban-card]").count();
    const targetColumnCountBefore = await readFirstColumnCount();

    const sourceCard = page.locator("[data-testid='kanban-column-0'] [data-kanban-card]").first();
    const sourceBounds = await sourceCard.boundingBox();
    const targetColumn = page.locator("[data-testid='kanban-column-1']");
    const targetBounds = await targetColumn.boundingBox();
    expect(sourceBounds).not.toBeNull();
    expect(targetBounds).not.toBeNull();
    if (!sourceBounds || !targetBounds) return;

    await page.mouse.move(
      sourceBounds.x + sourceBounds.width / 2,
      sourceBounds.y + sourceBounds.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(targetBounds.x + targetBounds.width / 2, targetBounds.y + 100, {
      steps: 10,
    });
    await page.mouse.up();

    expect(await readFirstColumnCount()).toBe(targetColumnCountBefore + 1);
  });

  test("grab-active drag selects instead of moving cards", async ({ reactGrab, page }) => {
    await goToHeavyView(page, "kanban");
    const readColumnSignature = () =>
      page.evaluate(() =>
        Array.from(document.querySelectorAll("[data-testid^='kanban-column-']")).map(
          (columnElement) => columnElement.querySelectorAll("[data-kanban-card]").length,
        ),
      );
    const columnSignatureBefore = await readColumnSignature();

    await reactGrab.activate();
    const cardCenters = await getElementCenters(page, "[data-kanban-card]", 6);
    const firstCard = cardCenters[0];
    const lastCard = cardCenters[cardCenters.length - 1];
    await page.mouse.move(firstCard.x - 30, firstCard.y - 10, { steps: 1 });
    await page.mouse.down();
    await page.mouse.move(lastCard.x + 30, lastCard.y + 10, { steps: 8 });
    const dragBounds = await reactGrab.getDragBoxBounds();
    await page.mouse.up();
    await page.keyboard.press("Escape");

    expect(dragBounds).not.toBeNull();
    // The pointer-capture dnd must not have fired: no card changed column.
    expect(await readColumnSignature()).toEqual(columnSignatureBefore);
    // No orphaned drag ghost left behind by a half-started app drag.
    expect(await page.locator("[data-testid='kanban-drag-ghost']").count()).toBe(0);
  });

  test("app drag works again after deactivate (no leaked suppression)", async ({
    reactGrab,
    page,
  }) => {
    await goToHeavyView(page, "kanban");
    await reactGrab.activate();
    await reactGrab.deactivate();

    const sourceCard = page.locator("[data-testid='kanban-column-0'] [data-kanban-card]").first();
    const sourceBounds = await sourceCard.boundingBox();
    expect(sourceBounds).not.toBeNull();
    if (!sourceBounds) return;
    await page.mouse.move(
      sourceBounds.x + sourceBounds.width / 2,
      sourceBounds.y + sourceBounds.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(sourceBounds.x + 240, sourceBounds.y + 40, { steps: 8 });
    await expect(page.locator("[data-testid='kanban-drag-ghost']")).toBeVisible();
    await page.mouse.up();
  });

  test("selection bounds match a card inside a scaled container", async ({ reactGrab, page }) => {
    await goToHeavyView(page, "kanban");
    await reactGrab.activate();

    const zoomedCard = page
      .locator("[data-testid='kanban-zoomed-wrapper'] [data-kanban-card]")
      .first();
    const zoomedCardBounds = await zoomedCard.boundingBox();
    expect(zoomedCardBounds).not.toBeNull();
    if (!zoomedCardBounds) return;

    const zoomedCardId = await zoomedCard.getAttribute("data-kanban-card");
    // Aim at the card's bottom padding strip so the card div itself (not a
    // text span inside it) is the deepest element under the pointer, and
    // re-approach until it is the detected target — the very first synthetic
    // move after activation can land on a stale ancestor.
    const paddingTargetX = zoomedCardBounds.x + zoomedCardBounds.width / 2;
    const paddingTargetY = zoomedCardBounds.y + zoomedCardBounds.height - 3;
    const HOVER_ATTEMPTS = 3;
    for (let attemptIndex = 1; attemptIndex <= HOVER_ATTEMPTS; attemptIndex++) {
      if (attemptIndex > 1) await page.mouse.move(0, 0);
      await page.mouse.move(paddingTargetX, paddingTargetY, { steps: 4 });
      try {
        await page.waitForFunction(
          (cardId) => {
            const state = window.__REACT_GRAB__?.getState?.();
            const targetElement = state?.targetElement;
            if (!(targetElement instanceof Element)) return false;
            return targetElement.getAttribute("data-kanban-card") === cardId;
          },
          zoomedCardId,
          { timeout: 2000 },
        );
        break;
      } catch (hoverError) {
        if (attemptIndex === HOVER_ATTEMPTS) throw hoverError;
      }
    }
    const selectionBounds = await reactGrab.getSelectionBoxBounds();
    expect(selectionBounds).not.toBeNull();
    if (!selectionBounds) return;
    // The detected target IS the card, so its selection rect must equal the
    // card's *visual* (scale-transformed) geometry, not its untransformed
    // layout size — the layout rect is ~8% wider under KANBAN_ZOOM_SCALE.
    expect(Math.abs(selectionBounds.x - zoomedCardBounds.x)).toBeLessThan(2);
    expect(Math.abs(selectionBounds.y - zoomedCardBounds.y)).toBeLessThan(2);
    expect(Math.abs(selectionBounds.width - zoomedCardBounds.width)).toBeLessThan(2);
    expect(Math.abs(selectionBounds.height - zoomedCardBounds.height)).toBeLessThan(2);
    await reactGrab.deactivate();
  });
});

test.describe("interference: editor capture layer", () => {
  test("detection survives pointermove swallowed at document capture", async ({
    reactGrab,
    page,
  }) => {
    await goToHeavyView(page, "editor");
    await reactGrab.activate();
    await reactGrab.hoverUntilSelected("[data-editor-paragraph='3']");
    expect(await reactGrab.isSelectionBoxVisible()).toBe(true);
    await reactGrab.deactivate();
  });

  test("typing still updates document stats after activate/deactivate", async ({
    reactGrab,
    page,
  }) => {
    await goToHeavyView(page, "editor");
    const wordCountBefore = await page.locator("[data-testid='editor-word-count']").innerText();

    await reactGrab.activate();
    await reactGrab.deactivate();

    await page.locator("[data-editor-paragraph='0']").click();
    await page.keyboard.type(" appended words here");
    await expect(page.locator("[data-testid='editor-word-count']")).not.toHaveText(wordCountBefore);
  });
});

test.describe("interference: hijacked scroll", () => {
  test("selection stays alive through rAF-animated scrolling", async ({ reactGrab, page }) => {
    await goToHeavyView(page, "scroll-fx");
    await reactGrab.activate();
    await page.mouse.move(640, 400, { steps: 2 });
    await page.waitForTimeout(300);

    for (let wheelIndex = 0; wheelIndex < 20; wheelIndex++) {
      await page.mouse.wheel(0, 300);
      await page.waitForTimeout(20);
    }
    // Let the lerp loop finish animating toward the target offset.
    await page.waitForTimeout(800);

    expect(await reactGrab.isOverlayVisible()).toBe(true);
    await page.mouse.move(640, 380, { steps: 2 });
    await reactGrab.waitForSelectionBox();
    expect(await reactGrab.isSelectionBoxVisible()).toBe(true);
    await page.keyboard.press("Escape");
  });
});

test.describe("interference: toast storm", () => {
  test("grabs a toast from the portal stack", async ({ reactGrab, page }) => {
    await goToHeavyView(page, "toasts");
    await page.waitForSelector("[data-toast]", { timeout: 10_000 });
    await reactGrab.activate();
    await reactGrab.hoverUntilSelected("[data-toast]");
    expect(await reactGrab.isSelectionBoxVisible()).toBe(true);
    await reactGrab.deactivate();
  });

  test("overlay recovers when the hovered toast expires", async ({ reactGrab, page }) => {
    await goToHeavyView(page, "toasts");
    await page.waitForSelector("[data-toast]", { timeout: 10_000 });
    await reactGrab.activate();
    await reactGrab.hoverUntilSelected("[data-toast]");

    // Outlive TOAST_LIFETIME_MS so the selected toast unmounts under the
    // pointer; the overlay must stay functional and re-select on move.
    await page.waitForTimeout(3000);
    expect(await reactGrab.isOverlayVisible()).toBe(true);

    await reactGrab.hoverUntilSelected("[data-glass-card='0']");
    expect(await reactGrab.isSelectionBoxVisible()).toBe(true);
    await reactGrab.deactivate();
  });

  test("grabs a glass card composited through backdrop-filter", async ({ reactGrab, page }) => {
    await goToHeavyView(page, "toasts");
    await reactGrab.activate();
    await reactGrab.hoverUntilSelected("[data-glass-card='2']");
    await reactGrab.clickElement("[data-glass-card='2']");
    await page.waitForFunction(
      () => {
        const instances = window.__REACT_GRAB__?.getState?.()?.labelInstances ?? [];
        return instances.some(
          (instance) => instance.status === "copied" || instance.status === "fading",
        );
      },
      undefined,
      { timeout: 10_000 },
    );
    const clipboardContent = await reactGrab.getClipboardContent();
    expect(clipboardContent).toContain("toast-storm");
  });
});
