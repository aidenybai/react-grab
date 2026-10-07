// Hover-revealed and invisible-while-mounted UI (opacity-0 toolbars, CSS
// tooltips, display-none dropdowns, ghost overlays). Pins how visibility
// filtering interacts with the pseudo-state freeze: revealed UI must stay
// grabbable while active, and UI that is invisible on screen must fall
// through to the visible content beneath it.
import { test, expect, type ReactGrabPageObject } from "./fixtures.js";

const FIXTURE_STYLE_ID = "hover-reveal-fixture-style";
const FIXTURE_ROOT_ID = "hover-reveal-fixture-root";
const TARGET_POLL_TIMEOUT_MS = 4_000;
const HOVER_SETTLE_MS = 350;

const installHoverRevealFixture = async (reactGrab: ReactGrabPageObject) => {
  await reactGrab.page.evaluate(
    ({ styleId, rootId }) => {
      document.getElementById(styleId)?.remove();
      document.getElementById(rootId)?.remove();

      const styleElement = document.createElement("style");
      styleElement.id = styleId;
      styleElement.textContent = `
        #${rootId} { position: fixed; left: 60px; top: 100px; z-index: 900; display: flex; flex-direction: column; gap: 24px; }
        [data-testid="reveal-row"] { position: relative; width: 420px; height: 56px; background: #dbeafe; }
        [data-testid="reveal-toolbar"] { opacity: 0; position: absolute; right: 8px; top: 12px; background: #1d4ed8; padding: 4px; }
        [data-testid="reveal-row"]:hover [data-testid="reveal-toolbar"] { opacity: 1; }
        [data-testid="tooltip-anchor"] { position: relative; width: 420px; height: 56px; background: #dcfce7; }
        [data-testid="css-tooltip"] { visibility: hidden; position: absolute; left: 120px; top: 8px; background: #166534; color: #fff; padding: 6px 10px; }
        [data-testid="tooltip-anchor"]:hover [data-testid="css-tooltip"] { visibility: visible; }
        [data-testid="dropdown-anchor"] { position: relative; width: 420px; height: 56px; background: #fef9c3; }
        [data-testid="hover-dropdown"] { display: none; position: absolute; left: 120px; top: 40px; background: #854d0e; color: #fff; padding: 6px 10px; z-index: 1; }
        [data-testid="dropdown-anchor"]:hover [data-testid="hover-dropdown"] { display: block; }
        [data-testid="ghost-stack"] { position: relative; width: 420px; height: 56px; }
        [data-testid="ghost-card"] { position: absolute; inset: 0; background: #fee2e2; }
        [data-testid="ghost-layer"] { opacity: 0; position: absolute; inset: 0; }
        [data-testid="js-tooltip"] { opacity: 0; position: absolute; left: 120px; top: 8px; background: #581c87; color: #fff; padding: 6px 10px; }
        [data-testid="js-anchor"] { position: relative; width: 420px; height: 56px; background: #f3e8ff; }
        [data-testid="js-anchor"].tooltip-shown [data-testid="js-tooltip"] { opacity: 1; }
        [data-testid="faint-card"] { opacity: 0.01; width: 420px; height: 56px; background: #0f172a; }
      `;
      document.head.appendChild(styleElement);

      const rootElement = document.createElement("div");
      rootElement.id = rootId;
      rootElement.innerHTML = `
        <div data-testid="reveal-row">row content
          <div data-testid="reveal-toolbar"><button data-testid="reveal-button">edit</button></div>
        </div>
        <div data-testid="tooltip-anchor">tooltip trigger
          <div data-testid="css-tooltip">css tooltip</div>
        </div>
        <div data-testid="dropdown-anchor">dropdown trigger
          <div data-testid="hover-dropdown"><button data-testid="dropdown-item">menu item</button></div>
        </div>
        <div data-testid="ghost-stack">
          <div data-testid="ghost-card">visible card</div>
          <div data-testid="ghost-layer"><button data-testid="ghost-button">ghost</button></div>
        </div>
        <div data-testid="js-anchor">js tooltip trigger
          <div data-testid="js-tooltip">js tooltip</div>
        </div>
        <div data-testid="faint-card">faint card</div>
      `;
      document.body.appendChild(rootElement);

      const jsAnchor = rootElement.querySelector("[data-testid='js-anchor']");
      jsAnchor?.addEventListener("mouseenter", () => jsAnchor.classList.add("tooltip-shown"));
      jsAnchor?.addEventListener("mouseleave", () => jsAnchor.classList.remove("tooltip-shown"));
    },
    { styleId: FIXTURE_STYLE_ID, rootId: FIXTURE_ROOT_ID },
  );
};

const getCenter = async (reactGrab: ReactGrabPageObject, testId: string) => {
  const center = await reactGrab.page.evaluate((targetTestId) => {
    const element = document.querySelector(`[data-testid='${targetTestId}']`);
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }, testId);
  expect(center).not.toBeNull();
  if (!center) throw new Error(`No element for test id ${testId}`);
  return center;
};

const getTargetOrAncestorTestId = (reactGrab: ReactGrabPageObject): Promise<string | null> =>
  reactGrab.page.evaluate(() => {
    const targetElement = window.__REACT_GRAB__?.getState?.()?.targetElement;
    if (!(targetElement instanceof Element)) return null;
    return (
      targetElement.getAttribute("data-testid") ??
      targetElement.closest("[data-testid]")?.getAttribute("data-testid") ??
      null
    );
  });

// Detection is throttled (32ms, no trailing re-run) and the element-position
// cache serves nearby points, so interpolated multi-step moves can leave the
// final position undetected. Two discrete moves — away, then onto the target —
// guarantee the landing pointermove schedules its own detection pass.
const moveAndPollTarget = async (
  reactGrab: ReactGrabPageObject,
  x: number,
  y: number,
): Promise<string | null> => {
  await reactGrab.page.mouse.move(900, 620);
  await reactGrab.page.waitForTimeout(100);
  await reactGrab.page.mouse.move(x, y);
  await reactGrab.page.waitForTimeout(HOVER_SETTLE_MS);
  return getTargetOrAncestorTestId(reactGrab);
};

test.describe("hover-revealed UI stays grabbable", () => {
  test.beforeEach(async ({ reactGrab }) => {
    await installHoverRevealFixture(reactGrab);
  });

  test("opacity-reveal toolbar: activate while it is revealed, then grab its button", async ({
    reactGrab,
    page,
  }) => {
    const buttonCenter = await getCenter(reactGrab, "reveal-button");
    await page.mouse.move(buttonCenter.x, buttonCenter.y, { steps: 4 });
    await page.waitForTimeout(HOVER_SETTLE_MS);
    await reactGrab.activate();

    await expect
      .poll(() => moveAndPollTarget(reactGrab, buttonCenter.x, buttonCenter.y), {
        timeout: TARGET_POLL_TIMEOUT_MS,
      })
      .toBe("reveal-button");
    await reactGrab.deactivate();
  });

  test("opacity-reveal toolbar: activate over the row, then move onto the button", async ({
    reactGrab,
    page,
  }) => {
    const rowCenter = await getCenter(reactGrab, "reveal-row");
    const buttonCenter = await getCenter(reactGrab, "reveal-button");

    // Cursor over the row's left half: the toolbar is revealed by :hover but
    // is NOT in the pinned pseudo-state chain at activation.
    await page.mouse.move(rowCenter.x - 150, rowCenter.y, { steps: 4 });
    await page.waitForTimeout(HOVER_SETTLE_MS);
    await reactGrab.activate();

    await expect
      .poll(() => moveAndPollTarget(reactGrab, buttonCenter.x, buttonCenter.y), {
        timeout: TARGET_POLL_TIMEOUT_MS,
      })
      .toBe("reveal-button");
    await reactGrab.deactivate();
  });

  // visibility:hidden / display:none reveals are not hit-testable while
  // hidden, so the supported flow is reveal-then-activate: the pseudo-state
  // freeze pins the hovered chain's visibility/display and the revealed UI
  // must stay grabbable for the whole active session.
  test("visibility-reveal css tooltip pinned at activation stays grabbable", async ({
    reactGrab,
    page,
  }) => {
    const tooltipCenter = await getCenter(reactGrab, "css-tooltip");
    await page.mouse.move(tooltipCenter.x, tooltipCenter.y, { steps: 4 });
    await page.waitForTimeout(HOVER_SETTLE_MS);
    await reactGrab.activate();

    await expect
      .poll(() => moveAndPollTarget(reactGrab, tooltipCenter.x, tooltipCenter.y), {
        timeout: TARGET_POLL_TIMEOUT_MS,
      })
      .toBe("css-tooltip");
    await reactGrab.deactivate();
  });

  test("display-reveal dropdown pinned at activation stays grabbable", async ({
    reactGrab,
    page,
  }) => {
    const anchorCenter = await getCenter(reactGrab, "dropdown-anchor");
    await page.mouse.move(anchorCenter.x, anchorCenter.y, { steps: 4 });
    await page.waitForTimeout(HOVER_SETTLE_MS);
    // The dropdown only has a box while revealed; hovering the item keeps the
    // anchor's :hover alive since the dropdown is inside the anchor.
    const itemCenter = await getCenter(reactGrab, "dropdown-item");
    await page.mouse.move(itemCenter.x, itemCenter.y, { steps: 4 });
    await page.waitForTimeout(HOVER_SETTLE_MS);
    await reactGrab.activate();

    await expect(page.locator("[data-testid='hover-dropdown']")).toBeVisible();
    await expect
      .poll(() => moveAndPollTarget(reactGrab, itemCenter.x, itemCenter.y), {
        timeout: TARGET_POLL_TIMEOUT_MS,
      })
      .toBe("dropdown-item");
    await reactGrab.deactivate();
  });

  test("js-revealed tooltip shown before activation stays grabbable", async ({
    reactGrab,
    page,
  }) => {
    const anchorCenter = await getCenter(reactGrab, "js-anchor");
    await page.mouse.move(anchorCenter.x - 150, anchorCenter.y, { steps: 4 });
    await page.waitForTimeout(HOVER_SETTLE_MS);
    await expect(page.locator("[data-testid='js-anchor']")).toHaveClass(/tooltip-shown/);
    await reactGrab.activate();

    const tooltipCenter = await getCenter(reactGrab, "js-tooltip");
    await expect
      .poll(() => moveAndPollTarget(reactGrab, tooltipCenter.x, tooltipCenter.y), {
        timeout: TARGET_POLL_TIMEOUT_MS,
      })
      .toBe("js-tooltip");
    await reactGrab.deactivate();
  });

  test("near-zero opacity element is still grabbable", async ({ reactGrab }) => {
    await reactGrab.activate();
    const faintCenter = await getCenter(reactGrab, "faint-card");
    await expect
      .poll(() => moveAndPollTarget(reactGrab, faintCenter.x, faintCenter.y), {
        timeout: TARGET_POLL_TIMEOUT_MS,
      })
      .toBe("faint-card");
    await reactGrab.deactivate();
  });
});

test.describe("opacity-0 mounted overlays", () => {
  test.beforeEach(async ({ reactGrab }) => {
    await installHoverRevealFixture(reactGrab);
  });

  // Ancestor opacity is deliberately NOT treated as invisibility: while the
  // freeze suppresses :hover, hover-revealed subtrees read opacity 0 and
  // would otherwise become unreachable. Children of an opacity-0 layer stay
  // targetable, exactly like the pre-checkVisibility getComputedStyle path.
  test("children of an opacity-0 ghost layer stay targetable", async ({ reactGrab }) => {
    await reactGrab.activate();
    const ghostCenter = await getCenter(reactGrab, "ghost-button");
    await expect
      .poll(() => moveAndPollTarget(reactGrab, ghostCenter.x, ghostCenter.y), {
        timeout: TARGET_POLL_TIMEOUT_MS,
      })
      .toBe("ghost-button");
    await reactGrab.deactivate();
  });

  test("an element that is itself opacity-0 is not targeted", async ({ reactGrab }) => {
    await reactGrab.activate();
    const layerCenter = await getCenter(reactGrab, "ghost-layer");
    // Point at the layer's lower half, away from the ghost button, so the
    // opacity-0 layer itself is the top hit-test candidate.
    await expect
      .poll(() => moveAndPollTarget(reactGrab, layerCenter.x, layerCenter.y + 14), {
        timeout: TARGET_POLL_TIMEOUT_MS,
      })
      .toBe("ghost-card");
    await reactGrab.deactivate();
  });
});
