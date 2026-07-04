// Interference perf suite. Where perf-heavy.spec.ts measures react-grab over
// heavy-but-cooperative UI, this suite measures it against runtimes that
// actively fight for the same resources:
//
// - canvas: a rAF paint loop already owns every frame's budget.
// - animation-storm: 120 WAAPI animations (the freeze path must pause/resume
//   all of them) + 60 rAF style mutators (unfreezable; bounds change every
//   frame under selection).
// - kanban: dnd-kit-style pointer-capture drag — both sides contend for
//   pointerdown/move/up, and the app retargets events via setPointerCapture.
// - editor: contenteditable reprocessing on every input, plus a document-level
//   capture listener layer serializing ancestor paths on pointerdown/click and
//   swallowing pointermove below window level.
// - scroll-fx: Lenis-style wheel hijack (preventDefault + rAF lerp scrolling),
//   parallax transforms written from the scroll handler, IntersectionObserver
//   reveals mutating DOM mid-scroll.
// - toasts: portal churn under the pointer + backdrop-filter paint cost.
// - gauntlet: all of the above mounted at once.
import { expect, getElementCenters, goToHeavyView, test } from "./perf-fixtures.js";
import { idleFrame, recordScenario } from "./perf-recorder.js";

const EDITOR_TYPING_INP_SOFT_LIMIT_MS = 200;
// See perf-heavy.spec.ts: INP asserts only hold on dedicated perf runs.
const SHOULD_ASSERT_INP = Boolean(process.env.PERF_LABEL) && !process.env.COVERAGE;
const CANVAS_MARKER_SELECTOR = "[data-canvas-marker]";
const WAAPI_TILE_SELECTOR = "[data-waapi-tile]";
const RAF_MUTATOR_SELECTOR = "[data-raf-mutator]";
const KANBAN_CARD_SELECTOR = "[data-kanban-card]";
const EDITOR_PARAGRAPH_SELECTOR = "[data-editor-paragraph]";
const GLASS_CARD_SELECTOR = "[data-glass-card]";
const TOAST_SELECTOR = "[data-toast]";

test.describe.configure({ mode: "serial", retries: 0 });

test.describe("@perf interference benchmarks", () => {
  // ─── Canvas paint loop ─────────────────────────────────────────────

  test("interference-canvas-paint-passive @perf", async ({ reactGrab, page }, testInfo) => {
    // Baseline: the canvas loop's own frame cost with the library installed
    // but idle. The active variant below diffs against this shape.
    void reactGrab;
    await goToHeavyView(page, "canvas");

    await recordScenario(page, testInfo, "interference-canvas-paint-passive", async () => {
      await page.waitForTimeout(3000);
    });
  });

  test("interference-canvas-hover-markers @perf", async ({ reactGrab, page }, testInfo) => {
    // Selection-mode hovering over marker chips while the canvas repaints
    // underneath every frame — react-grab's per-move work has to fit in
    // whatever frame budget the paint loop leaves.
    await goToHeavyView(page, "canvas");
    const markerCenters = await getElementCenters(page, CANVAS_MARKER_SELECTOR);

    await reactGrab.activate();
    await idleFrame(page, 2);

    await recordScenario(page, testInfo, "interference-canvas-hover-markers", async () => {
      for (let passIndex = 0; passIndex < 10; passIndex++) {
        for (const center of markerCenters) {
          await page.mouse.move(center.x, center.y, { steps: 1 });
        }
      }
      await idleFrame(page, 4);
    });
    await reactGrab.deactivate();
  });

  // ─── Animation storm ───────────────────────────────────────────────

  test("interference-waapi-freeze-cycle @perf", async ({ reactGrab, page }, testInfo) => {
    // Every activate must collect + pause 120 WAAPI animations and every
    // deactivate must resume them, while 60 rAF mutators keep the style
    // system busy in between.
    void reactGrab;
    await goToHeavyView(page, "animation-storm");

    await recordScenario(
      page,
      testInfo,
      "interference-waapi-freeze-cycle",
      async () => {
        for (let cycleIndex = 0; cycleIndex < 20; cycleIndex++) {
          await page.evaluate(() => window.__REACT_GRAB__?.activate?.());
          await idleFrame(page, 1);
          await page.evaluate(() => window.__REACT_GRAB__?.deactivate?.());
          await idleFrame(page, 1);
        }
        await idleFrame(page, 4);
      },
      { samples: 2 },
    );
  });

  test("interference-raf-mutator-hover @perf", async ({ reactGrab, page }, testInfo) => {
    // Hovering elements whose transform is rewritten from a rAF loop every
    // frame: selection bounds can never settle, so this measures the cost
    // of continuous bounds re-tracking (the case freezing can't help).
    await goToHeavyView(page, "animation-storm");
    const mutatorCenters = await getElementCenters(page, RAF_MUTATOR_SELECTOR);

    await reactGrab.activate();
    await idleFrame(page, 2);

    await recordScenario(page, testInfo, "interference-raf-mutator-hover", async () => {
      for (let passIndex = 0; passIndex < 5; passIndex++) {
        for (const center of mutatorCenters) {
          await page.mouse.move(center.x, center.y, { steps: 1 });
        }
      }
      await idleFrame(page, 4);
    });
    await reactGrab.deactivate();
  });

  test("interference-waapi-hover-sweep @perf", async ({ reactGrab, page }, testInfo) => {
    await goToHeavyView(page, "animation-storm");
    const tileCenters = await getElementCenters(page, WAAPI_TILE_SELECTOR, 60);

    await reactGrab.activate();
    await idleFrame(page, 2);

    await recordScenario(page, testInfo, "interference-waapi-hover-sweep", async () => {
      for (let passIndex = 0; passIndex < 4; passIndex++) {
        for (const center of tileCenters) {
          await page.mouse.move(center.x, center.y, { steps: 1 });
        }
      }
      await idleFrame(page, 4);
    });
    await reactGrab.deactivate();
  });

  // ─── Kanban pointer-capture dnd ────────────────────────────────────

  test("interference-kanban-app-drag-passive @perf", async ({ reactGrab, page }, testInfo) => {
    // The app's own pointer-capture drags with the library idle: every
    // pointermove re-renders the drag ghost, and react-grab's passive
    // window listeners ride along on each retargeted event.
    void reactGrab;
    await goToHeavyView(page, "kanban");
    const cardCenters = await getElementCenters(page, KANBAN_CARD_SELECTOR, 10);
    if (cardCenters.length < 4) {
      test.skip(true, "not enough kanban cards visible");
      return;
    }

    await recordScenario(page, testInfo, "interference-kanban-app-drag-passive", async () => {
      for (let dragIndex = 0; dragIndex < 8; dragIndex++) {
        const startCenter = cardCenters[dragIndex % cardCenters.length];
        await page.mouse.move(startCenter.x, startCenter.y, { steps: 1 });
        await page.mouse.down();
        await page.mouse.move(startCenter.x + 240, startCenter.y + 60, { steps: 16 });
        await page.mouse.up();
        await page.waitForTimeout(60);
      }
      await idleFrame(page, 4);
    });
  });

  test("interference-kanban-hover-selection @perf", async ({ reactGrab, page }, testInfo) => {
    await goToHeavyView(page, "kanban");
    const cardCenters = await getElementCenters(page, KANBAN_CARD_SELECTOR);

    await reactGrab.activate();
    await idleFrame(page, 2);

    await recordScenario(page, testInfo, "interference-kanban-hover-selection", async () => {
      for (let passIndex = 0; passIndex < 3; passIndex++) {
        for (const center of cardCenters) {
          await page.mouse.move(center.x, center.y, { steps: 1 });
        }
      }
      await idleFrame(page, 4);
    });
    await reactGrab.deactivate();
  });

  test("interference-kanban-grab-drag-select @perf", async ({ reactGrab, page }, testInfo) => {
    // react-grab drag selection over cards that want to start their own
    // pointer-capture drag from the same pointerdown.
    await goToHeavyView(page, "kanban");

    await recordScenario(
      page,
      testInfo,
      "interference-kanban-grab-drag-select",
      async () => {
        for (let dragIndex = 0; dragIndex < 8; dragIndex++) {
          await page.mouse.move(60, 160, { steps: 1 });
          await page.mouse.down();
          await page.mouse.move(760, 520, { steps: 12 });
          await page.mouse.up();
          await page.waitForTimeout(60);
          await page.keyboard.press("Escape");
          await page.waitForTimeout(40);
        }
        await idleFrame(page, 4);
      },
      {
        beforeEachSample: async () => {
          await reactGrab.activate();
          await idleFrame(page, 2);
        },
      },
    );
  });

  // ─── Editor + capture-layer listeners ──────────────────────────────

  test("interference-editor-typing-passive @perf", async ({ reactGrab, page }, testInfo) => {
    // Typing into the contenteditable: each keystroke re-walks the whole
    // document for stats while the capture-layer listeners serialize event
    // paths. Measures the library's added cost on an input-bound page.
    void reactGrab;
    await goToHeavyView(page, "editor");
    await page.locator("[data-editor-paragraph='0']").click();

    const aggregate = await recordScenario(
      page,
      testInfo,
      "interference-editor-typing-passive",
      async () => {
        const typedSentence = "Grabbing context should never block the editor. ";
        for (const character of typedSentence.repeat(2)) {
          await page.keyboard.type(character);
          await page.waitForTimeout(12);
        }
        await idleFrame(page, 4);
      },
      { samples: 2 },
    );
    if (SHOULD_ASSERT_INP) expect.soft(aggregate.inp).toBeLessThan(EDITOR_TYPING_INP_SOFT_LIMIT_MS);
  });

  test("interference-editor-hover-with-swallowed-pointermove @perf", async ({
    reactGrab,
    page,
  }, testInfo) => {
    // The app swallows pointermove at document-capture; react-grab detects
    // from window-capture above it. Measures detection cost when the page
    // also runs selectionchange work on every grab click.
    await goToHeavyView(page, "editor");
    const paragraphCenters = await getElementCenters(page, EDITOR_PARAGRAPH_SELECTOR, 20);

    await reactGrab.activate();
    await idleFrame(page, 2);

    await recordScenario(
      page,
      testInfo,
      "interference-editor-hover-with-swallowed-pointermove",
      async () => {
        for (let passIndex = 0; passIndex < 6; passIndex++) {
          for (const center of paragraphCenters) {
            await page.mouse.move(center.x, center.y, { steps: 1 });
          }
        }
        await idleFrame(page, 4);
      },
    );
    await reactGrab.deactivate();
  });

  // ─── Hijacked scroll ───────────────────────────────────────────────

  test("interference-hijacked-scroll-passive @perf", async ({ reactGrab, page }, testInfo) => {
    void reactGrab;
    await goToHeavyView(page, "scroll-fx");
    await page.mouse.move(640, 400);

    await recordScenario(page, testInfo, "interference-hijacked-scroll-passive", async () => {
      for (let wheelIndex = 0; wheelIndex < 100; wheelIndex++) {
        await page.mouse.wheel(0, wheelIndex % 8 < 6 ? 240 : -500);
        await page.waitForTimeout(12);
      }
      await idleFrame(page, 10);
    });
  });

  test("interference-hijacked-scroll-during-selection @perf", async ({
    reactGrab,
    page,
  }, testInfo) => {
    // Scroll-during-selection where scrolling is animated by the app's rAF
    // lerp long after each wheel event, parallax transforms are rewritten in
    // the scroll handler, and reveal sections mutate class lists mid-flight.
    await goToHeavyView(page, "scroll-fx");
    await reactGrab.activate();
    await page.mouse.move(640, 400, { steps: 2 });
    await idleFrame(page, 2);

    await recordScenario(
      page,
      testInfo,
      "interference-hijacked-scroll-during-selection",
      async () => {
        for (let wheelIndex = 0; wheelIndex < 100; wheelIndex++) {
          await page.mouse.wheel(0, wheelIndex % 8 < 6 ? 240 : -500);
          await page.waitForTimeout(12);
        }
        await idleFrame(page, 10);
      },
    );
    await page.keyboard.press("Escape");
  });

  // ─── Toast storm + glass ───────────────────────────────────────────

  test("interference-toast-storm-idle-selection @perf", async ({ reactGrab, page }, testInfo) => {
    // Selection held on a static glass card while toasts churn in a body
    // portal: the library should not do per-toast work for DOM it is not
    // selecting.
    await goToHeavyView(page, "toasts");
    const cardCenters = await getElementCenters(page, GLASS_CARD_SELECTOR, 1);
    if (cardCenters.length === 0) {
      test.skip(true, "no glass cards");
      return;
    }

    await reactGrab.activate();
    await page.mouse.move(cardCenters[0].x, cardCenters[0].y, { steps: 2 });
    await idleFrame(page, 2);

    await recordScenario(
      page,
      testInfo,
      "interference-toast-storm-idle-selection",
      async () => {
        await page.waitForTimeout(3000);
      },
      { samples: 2 },
    );
    await reactGrab.deactivate();
  });

  test("interference-toast-hover-churn @perf", async ({ reactGrab, page }, testInfo) => {
    // Hover the toast stack itself: targets expire and re-spawn underneath
    // the pointer, so detection keeps re-resolving against vanishing DOM
    // composited through backdrop-filter.
    await goToHeavyView(page, "toasts");
    await page.waitForSelector(TOAST_SELECTOR, { timeout: 10_000 });

    await reactGrab.activate();
    await idleFrame(page, 2);

    await recordScenario(page, testInfo, "interference-toast-hover-churn", async () => {
      const viewport = page.viewportSize() ?? { width: 1280, height: 720 };
      for (let moveIndex = 0; moveIndex < 250; moveIndex++) {
        await page.mouse.move(
          viewport.width - 150 + (moveIndex % 9),
          viewport.height - 60 - (moveIndex % 160),
          { steps: 1 },
        );
        await page.waitForTimeout(10);
      }
      await idleFrame(page, 4);
    });
    await reactGrab.deactivate();
  });

  // ─── Gauntlet (everything at once) ─────────────────────────────────

  test("interference-gauntlet-activate-toggle @perf", async ({ reactGrab, page }, testInfo) => {
    // Freeze/unfreeze with every interference source live: WAAPI storm,
    // rAF mutators, canvas paint loop, toast portals, capture listeners.
    void reactGrab;
    await goToHeavyView(page, "gauntlet");

    await recordScenario(
      page,
      testInfo,
      "interference-gauntlet-activate-toggle",
      async () => {
        for (let cycleIndex = 0; cycleIndex < 15; cycleIndex++) {
          await page.evaluate(() => window.__REACT_GRAB__?.activate?.());
          await idleFrame(page, 1);
          await page.evaluate(() => window.__REACT_GRAB__?.deactivate?.());
          await idleFrame(page, 1);
        }
        await idleFrame(page, 4);
      },
      { samples: 2 },
    );
  });

  test("interference-gauntlet-hover-sweep @perf", async ({ reactGrab, page }, testInfo) => {
    // Sections stack vertically, so sweep each interference source in turn:
    // scroll it into view (programmatic, so the wheel hijacker stays out of
    // the way), then hover its targets while everything else keeps running.
    await goToHeavyView(page, "gauntlet");
    const sweepTargetSelectors = [
      CANVAS_MARKER_SELECTOR,
      KANBAN_CARD_SELECTOR,
      RAF_MUTATOR_SELECTOR,
    ];

    await reactGrab.activate();
    await idleFrame(page, 2);

    await recordScenario(page, testInfo, "interference-gauntlet-hover-sweep", async () => {
      for (const targetSelector of sweepTargetSelectors) {
        // Not scrollIntoViewIfNeeded: it waits for a stable bounding box,
        // and the rAF mutator tiles move every frame by design.
        await page.evaluate((selector) => {
          document.querySelector(selector)?.scrollIntoView({ block: "center" });
        }, targetSelector);
        await idleFrame(page, 2);
        const sectionCenters = await getElementCenters(page, targetSelector, 15);
        for (let passIndex = 0; passIndex < 4; passIndex++) {
          for (const center of sectionCenters) {
            await page.mouse.move(center.x, center.y, { steps: 1 });
          }
        }
      }
      await idleFrame(page, 4);
    });
    await reactGrab.deactivate();
  });

  test("interference-gauntlet-drag-sweep @perf", async ({ reactGrab, page }, testInfo) => {
    await goToHeavyView(page, "gauntlet");

    await recordScenario(
      page,
      testInfo,
      "interference-gauntlet-drag-sweep",
      async () => {
        const viewport = page.viewportSize() ?? { width: 1280, height: 720 };
        for (let dragIndex = 0; dragIndex < 4; dragIndex++) {
          await page.mouse.move(30, 100, { steps: 1 });
          await page.mouse.down();
          await page.mouse.move(viewport.width - 50, viewport.height - 60, { steps: 14 });
          await page.mouse.up();
          await page.waitForTimeout(100);
          await page.keyboard.press("Escape");
          await page.waitForTimeout(40);
        }
        await idleFrame(page, 4);
      },
      {
        samples: 2,
        beforeEachSample: async () => {
          await reactGrab.activate();
          await idleFrame(page, 2);
        },
      },
    );
  });
});
