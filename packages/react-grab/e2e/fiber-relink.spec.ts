import { test, expect } from "./fixtures.js";

interface FiberSwapWindow {
  __triggerFiberSwap?: () => void;
  __REACT_GRAB__?: {
    getState: () => { targetElement: Element | null };
  };
}

const getSelectionTargetText = () =>
  (window as unknown as FiberSwapWindow).__REACT_GRAB__
    ?.getState()
    .targetElement?.textContent?.trim();

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
    await reactGrab.hoverUntilSelected("[data-testid='fiber-swap-target']");

    await expect.poll(() => page.evaluate(getSelectionTargetText)).toBe("Initial fiber node");

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
    await reactGrab.hoverUntilSelected("[data-testid='fiber-swap-target']");
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
});
