import type { Rect } from "../types.js";
import {
  HIT_TEST_SHIELD_ATTRIBUTE,
  SAME_ORIGIN_FRAME_ATTRIBUTE,
  Z_INDEX_HIT_TEST_SHIELD,
} from "../constants.js";
import { hideFromThirdParties } from "./hide-from-third-parties.js";
import { subtractRect } from "./subtract-rect.js";

// A shield on top of the page absorbs hover, focus, and click instead of
// `html { pointer-events: none }`. Both suppress page interaction identically,
// but pointer-events is inherited, so flipping it on the root to run a hit test
// restyles every element in the document (profiled at 4.2ms on 5.6k elements and
// 31-35ms on 16k). Hiding the shield costs nothing measurable, which is what
// makes gating it synchronously around every hit test affordable.
//
// Same-origin iframes are cut out of the shield: they must keep receiving wheel
// events to scroll natively, and their own documents get their own shield.
export interface HitTestShield {
  /** Hides the shield so document hit-testing reaches page content again. */
  openForHitTest: () => void;
  closeAfterHitTest: () => void;
  refreshHoles: () => void;
  remove: () => void;
}

const createPanel = (targetDocument: Document): HTMLDivElement => {
  const panel = targetDocument.createElement("div");
  // Marked individually so isReactGrabElement recognizes a panel on its own —
  // hover walks read the browser's :hover chain, which lands on a panel rather
  // than on the container.
  panel.setAttribute(HIT_TEST_SHIELD_ATTRIBUTE, "");
  panel.style.position = "absolute";
  panel.style.pointerEvents = "auto";
  panel.style.background = "transparent";
  return panel;
};

const readHoleRects = (targetDocument: Document): Rect[] => {
  const holeRects: Rect[] = [];
  const frames = targetDocument.querySelectorAll(`iframe[${SAME_ORIGIN_FRAME_ATTRIBUTE}]`);
  for (const frame of frames) {
    const frameRect = frame.getBoundingClientRect();
    if (frameRect.width <= 0 || frameRect.height <= 0) continue;
    holeRects.push({
      left: frameRect.left,
      top: frameRect.top,
      right: frameRect.right,
      bottom: frameRect.bottom,
    });
  }
  return holeRects;
};

export const createHitTestShield = (targetDocument: Document): HitTestShield => {
  const container = targetDocument.createElement("div");
  container.setAttribute(HIT_TEST_SHIELD_ATTRIBUTE, "");
  container.setAttribute("aria-hidden", "true");
  hideFromThirdParties(container);
  container.style.cssText =
    "position:fixed;inset:0;pointer-events:none;contain:strict;background:transparent;" +
    `z-index:${Z_INDEX_HIT_TEST_SHIELD};`;

  const fullViewportPanel = createPanel(targetDocument);
  fullViewportPanel.style.inset = "0";
  container.appendChild(fullViewportPanel);
  (targetDocument.body ?? targetDocument.documentElement).appendChild(container);

  let panelRectSignature = "";

  return {
    openForHitTest: () => {
      container.style.display = "none";
    },
    closeAfterHitTest: () => {
      container.style.removeProperty("display");
    },
    refreshHoles: () => {
      const holeRects = readHoleRects(targetDocument);
      if (holeRects.length === 0) {
        if (panelRectSignature === "") return;
        panelRectSignature = "";
        container.replaceChildren(fullViewportPanel);
        return;
      }

      const viewportRect: Rect = {
        left: 0,
        top: 0,
        right: targetDocument.documentElement.clientWidth,
        bottom: targetDocument.documentElement.clientHeight,
      };
      let panelRects: Rect[] = [viewportRect];
      for (const holeRect of holeRects) panelRects = subtractRect(panelRects, holeRect);

      const nextSignature = panelRects
        .map((rect) => `${rect.left},${rect.top},${rect.right},${rect.bottom}`)
        .join("|");
      if (nextSignature === panelRectSignature) return;
      panelRectSignature = nextSignature;

      const panels = panelRects.map((rect) => {
        const panel = createPanel(targetDocument);
        panel.style.left = `${rect.left}px`;
        panel.style.top = `${rect.top}px`;
        panel.style.width = `${rect.right - rect.left}px`;
        panel.style.height = `${rect.bottom - rect.top}px`;
        return panel;
      });
      container.replaceChildren(...panels);
    },
    remove: () => {
      container.remove();
    },
  };
};
