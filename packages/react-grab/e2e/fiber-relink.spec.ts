import { test, expect } from "./fixtures.js";
import type { Page } from "@playwright/test";

interface FiberSwapWindow {
  __triggerFiberSwap?: () => void;
  __triggerInnerHtmlSwap?: () => void;
  __REACT_GRAB__?: {
    getState: () => { targetElement: Element | null };
  };
}

const SELECTION_TEXT_ATTEMPTS = 4;
const HOVER_MOVE_STEPS = 5;
const SELECTION_TEXT_POLL_TIMEOUT_MS = 1_000;

const getSelectionTargetText = () =>
  (window as unknown as FiberSwapWindow).__REACT_GRAB__
    ?.getState()
    .targetElement?.textContent?.trim();

// hoverUntilSelected resolves once ANY element is selected; when the synthetic
// hover races scroll-into-view the selection can land on a different element,
// and a single post-scroll pointermove can be swallowed entirely. Scroll the
// target into view first, then walk the pointer to it in steps (real
// intermediate pointermoves) until it is the actual selection target.
const hoverUntilSelectionTextIs = async (page: Page, selector: string, expectedText: string) => {
  const target = page.locator(selector).first();
  await target.scrollIntoViewIfNeeded();
  for (let attempt = 1; attempt <= SELECTION_TEXT_ATTEMPTS; attempt++) {
    const bounds = await target.boundingBox();
    if (bounds) {
      await page.mouse.move(bounds.x - 5, bounds.y - 5);
      await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2, {
        steps: HOVER_MOVE_STEPS,
      });
    }
    try {
      await expect
        .poll(() => page.evaluate(getSelectionTargetText), {
          timeout: SELECTION_TEXT_POLL_TIMEOUT_MS,
        })
        .toBe(expectedText);
      return;
    } catch (error) {
      if (attempt === SELECTION_TEXT_ATTEMPTS) throw error;
    }
  }
};

test.describe("Fiber-latched selection", () => {
  // When React swaps the DOM node backing a held selection (a keyed remount
  // here), the originally captured Element detaches. Without fiber latching the
  // selection drops; with it, react-grab re-resolves the live node from the
  // fiber and keeps the selection on the freshly mounted node.
  test("re-resolves the selection onto a swapped-out DOM node via its fiber", async ({
    reactGrab,
    page,
  }) => {
    // Let React commit the remount while react-grab holds the selection;
    // otherwise the freeze buffers the update and no swap is observable.
    await reactGrab.updateOptions({ freezeReactUpdates: false });

    await reactGrab.activate();
    await hoverUntilSelectionTextIs(
      page,
      "[data-testid='fiber-swap-target']",
      "Initial fiber node",
    );

    await page.evaluate(() => (window as unknown as FiberSwapWindow).__triggerFiberSwap?.());

    await expect.poll(() => page.evaluate(getSelectionTargetText)).toBe("Swapped fiber node");

    expect(await reactGrab.isSelectionBoxVisible()).toBe(true);
  });

  // The post-copy "Copied" label anchors to the grabbed element too, so it must
  // follow the same fiber latching. The swapped node is offset downward, so a
  // label that re-resolves onto it moves; a label stuck on the detached node
  // stays put.
  test("keeps the post-copy label anchored across a swapped-out DOM node", async ({
    reactGrab,
    page,
  }) => {
    await reactGrab.updateOptions({ freezeReactUpdates: false });

    await reactGrab.activate();
    await hoverUntilSelectionTextIs(
      page,
      "[data-testid='fiber-swap-target']",
      "Initial fiber node",
    );
    await reactGrab.clickElement("[data-testid='fiber-swap-target']");
    await expect.poll(() => reactGrab.getLabelStatusText(), { timeout: 2000 }).toBe("Copied");

    const labelBefore = await reactGrab.getSelectionLabelBounds();
    if (!labelBefore) throw new Error("Expected a post-copy label before the swap");

    await page.evaluate(() => (window as unknown as FiberSwapWindow).__triggerFiberSwap?.());

    await expect
      .poll(
        async () => {
          const labelAfter = await reactGrab.getSelectionLabelBounds();
          return labelAfter ? labelAfter.label.y - labelBefore.label.y : 0;
        },
        { timeout: 1200 },
      )
      .toBeGreaterThan(40);
  });

  // A keyed host element nested directly under another host element has a host
  // fiber as its fiber parent (no composite component in between), so recovery
  // cannot search a composite subtree — it must re-find the replacement at the
  // anchor's recorded child index under the surviving parent host node.
  test("re-resolves a swapped node whose fiber parent is itself a host fiber", async ({
    reactGrab,
    page,
  }) => {
    await reactGrab.updateOptions({ freezeReactUpdates: false });

    await reactGrab.activate();
    await hoverUntilSelectionTextIs(
      page,
      "[data-testid='host-swap-target']",
      "Initial host-under-host node",
    );

    await page.evaluate(() => (window as unknown as FiberSwapWindow).__triggerFiberSwap?.());

    await expect
      .poll(() => page.evaluate(getSelectionTargetText))
      .toBe("Swapped host-under-host node");

    expect(await reactGrab.isSelectionBoxVisible()).toBe(true);
  });

  // Tokens rendered through dangerouslySetInnerHTML (syntax-highlighted code on
  // the website) have no fiber of their own. Replacing the host's innerHTML
  // detaches the selected token; recovery must anchor to the fibered host div
  // and re-find the token by its DOM path.
  test("re-resolves a selected innerHTML node with no fiber of its own", async ({
    reactGrab,
    page,
  }) => {
    await reactGrab.updateOptions({ freezeReactUpdates: false });

    await reactGrab.activate();
    await hoverUntilSelectionTextIs(page, ".inner-html-token", "token-initial");

    await page.evaluate(() => (window as unknown as FiberSwapWindow).__triggerInnerHtmlSwap?.());

    await expect.poll(() => page.evaluate(getSelectionTargetText)).toBe("token-swapped");

    expect(await reactGrab.isSelectionBoxVisible()).toBe(true);
  });
});
