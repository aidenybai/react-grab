import type { Rect } from "../types.js";
import {
  HIT_TEST_SHIELD_ATTRIBUTE,
  HIT_TEST_SHIELD_MAX_PANELS,
  WHEEL_LINE_DELTA_PX,
  Z_INDEX_HIT_TEST_SHIELD,
} from "../constants.js";
import { findScrollableAncestor } from "./find-scrollable-ancestor.js";
import { getDeepElementInDocumentAtPoint } from "./get-deep-element-at-point.js";
import { hideFromThirdParties } from "./hide-from-third-parties.js";
import { subtractRect } from "./subtract-rect.js";

// A shield on top of the page absorbs hover, focus, and click instead of
// `html { pointer-events: none }`. Both suppress page interaction identically,
// but pointer-events is inherited, so flipping it on the root to run a hit test
// restyles every element in the document (profiled at 4.2ms on 5.6k elements and
// 31-35ms on 16k). The shield's panels are leaves, so gating pointer-events on
// them restyles at most a handful of elements and stays affordable to do
// synchronously around every hit test.
//
// The gate deliberately avoids `display`: the container is viewport-sized and
// position:fixed, so hiding it destroys and rebuilds its composited layer on
// every hit test. That is invisible on a GPU but showed up on CI's software
// rasterizer as p95 frame time climbing from 58ms to 292ms while deactivating
// with many frozen elements, plus GPU-process CPU regressions across scenarios.
//
// Same-origin iframes are cut out of the shield: they must keep receiving wheel
// events to scroll natively, and their own documents get their own shield.
export interface HitTestShield {
  /** Lets document hit-testing reach page content again. */
  openForHitTest: () => void;
  closeAfterHitTest: () => void;
  refreshHoles: () => void;
  remove: () => void;
}

// Any value a computed signature cannot produce, including the empty string that
// a viewport-covering frame leaves behind once every panel is subtracted away.
const FULL_VIEWPORT_PANEL_SIGNATURE = "full-viewport";

const createPanel = (targetDocument: Document, pointerEvents: string): HTMLDivElement => {
  const panel = targetDocument.createElement("div");
  // Marked individually so isReactGrabElement recognizes a panel on its own —
  // hover walks read the browser's :hover chain, which lands on a panel rather
  // than on the container.
  panel.setAttribute(HIT_TEST_SHIELD_ATTRIBUTE, "");
  panel.style.position = "absolute";
  panel.style.pointerEvents = pointerEvents;
  panel.style.background = "transparent";
  return panel;
};

const readHoleRects = (holeElements: Iterable<Element>): Rect[] => {
  const holeRects: Rect[] = [];
  for (const holeElement of holeElements) {
    const holeRect = holeElement.getBoundingClientRect();
    if (holeRect.width <= 0 || holeRect.height <= 0) continue;
    holeRects.push({
      left: holeRect.left,
      top: holeRect.top,
      right: holeRect.right,
      bottom: holeRect.bottom,
    });
  }
  return holeRects;
};

const boundingRect = (rects: readonly Rect[]): Rect => {
  const bounds: Rect = { ...rects[0] };
  for (const rect of rects) {
    if (rect.left < bounds.left) bounds.left = rect.left;
    if (rect.top < bounds.top) bounds.top = rect.top;
    if (rect.right > bounds.right) bounds.right = rect.right;
    if (rect.bottom > bounds.bottom) bounds.bottom = rect.bottom;
  }
  return bounds;
};

export const createHitTestShield = (
  targetDocument: Document,
  collectHoleElements: () => Iterable<Element>,
): HitTestShield => {
  const container = targetDocument.createElement("div");
  container.setAttribute(HIT_TEST_SHIELD_ATTRIBUTE, "");
  container.setAttribute("aria-hidden", "true");
  hideFromThirdParties(container);
  container.style.cssText =
    "position:fixed;inset:0;pointer-events:none;contain:strict;background:transparent;" +
    `z-index:${Z_INDEX_HIT_TEST_SHIELD};`;

  let isOpenForHitTest = false;
  const panelPointerEvents = (): string => (isOpenForHitTest ? "none" : "auto");

  const fullViewportPanel = createPanel(targetDocument, panelPointerEvents());
  fullViewportPanel.style.inset = "0";
  container.appendChild(fullViewportPanel);
  (targetDocument.body ?? targetDocument.documentElement).appendChild(container);

  let panels: HTMLDivElement[] = [fullViewportPanel];
  let appliedPanelSignature = FULL_VIEWPORT_PANEL_SIGNATURE;

  const setGateOpen = (isOpen: boolean): void => {
    if (isOpenForHitTest === isOpen) return;
    isOpenForHitTest = isOpen;
    const pointerEvents = panelPointerEvents();
    for (const panel of panels) panel.style.pointerEvents = pointerEvents;
  };

  const readElementBeneathShield = (clientX: number, clientY: number): Element | null => {
    const wasOpenForHitTest = isOpenForHitTest;
    setGateOpen(true);
    const element = getDeepElementInDocumentAtPoint(targetDocument, clientX, clientY);
    setGateOpen(wasOpenForHitTest);
    return element;
  };

  // A wheel event hit-tests to the shield, so the browser would scroll the
  // shield's own chain — the page — instead of the container under the pointer.
  // Re-applying the delta to the real scroll target keeps nested scrollers
  // working; when the page is the only thing that can scroll we stay out of the
  // way and let the native compositor scroll run.
  const handleWheel = (event: WheelEvent): void => {
    let deltaX = event.deltaX;
    let deltaY = event.deltaY;
    if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
      deltaX *= WHEEL_LINE_DELTA_PX;
      deltaY *= WHEEL_LINE_DELTA_PX;
    } else if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
      deltaX *= targetDocument.documentElement.clientWidth;
      deltaY *= targetDocument.documentElement.clientHeight;
    }
    if (deltaX === 0 && deltaY === 0) return;

    const elementBeneathShield = readElementBeneathShield(event.clientX, event.clientY);
    if (!elementBeneathShield) return;

    const scrollTarget = findScrollableAncestor(elementBeneathShield, deltaX, deltaY);
    if (!scrollTarget) return;

    event.preventDefault();
    scrollTarget.scrollBy({ left: deltaX, top: deltaY, behavior: "instant" });
  };

  container.addEventListener("wheel", handleWheel, { passive: false });

  return {
    openForHitTest: () => {
      setGateOpen(true);
    },
    closeAfterHitTest: () => {
      setGateOpen(false);
    },
    refreshHoles: () => {
      const holeRects = readHoleRects(collectHoleElements());
      if (holeRects.length === 0) {
        if (appliedPanelSignature === FULL_VIEWPORT_PANEL_SIGNATURE) return;
        appliedPanelSignature = FULL_VIEWPORT_PANEL_SIGNATURE;
        fullViewportPanel.style.pointerEvents = panelPointerEvents();
        panels = [fullViewportPanel];
        container.replaceChildren(fullViewportPanel);
        return;
      }

      const viewportRect: Rect = {
        left: 0,
        top: 0,
        right: targetDocument.documentElement.clientWidth,
        bottom: targetDocument.documentElement.clientHeight,
      };
      let panelRects = subtractRect([viewportRect], holeRects[0]);
      for (let index = 1; index < holeRects.length; index++) {
        panelRects = subtractRect(panelRects, holeRects[index]);
      }
      if (panelRects.length > HIT_TEST_SHIELD_MAX_PANELS) {
        panelRects = subtractRect([viewportRect], boundingRect(holeRects));
      }

      const nextSignature = panelRects
        .map((rect) => `${rect.left},${rect.top},${rect.right},${rect.bottom}`)
        .join("|");
      if (nextSignature === appliedPanelSignature) return;
      appliedPanelSignature = nextSignature;

      const pointerEvents = panelPointerEvents();
      panels = panelRects.map((rect) => {
        const panel = createPanel(targetDocument, pointerEvents);
        panel.style.left = `${rect.left}px`;
        panel.style.top = `${rect.top}px`;
        panel.style.width = `${rect.right - rect.left}px`;
        panel.style.height = `${rect.bottom - rect.top}px`;
        return panel;
      });
      container.replaceChildren(...panels);
    },
    remove: () => {
      container.removeEventListener("wheel", handleWheel);
      container.remove();
    },
  };
};
