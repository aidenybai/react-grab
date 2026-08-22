import { SAME_ORIGIN_FRAME_ATTRIBUTE } from "../constants.js";
import { createHitTestShield, type HitTestShield } from "./create-hit-test-shield.js";
import { createStyleElement } from "./create-style-element.js";
import { getWindowFrameElement } from "./get-window-frame-element.js";

// A per-document shield (see create-hit-test-shield) blocks page interaction,
// which leaves this sheet responsible for the opposite problem: the page
// neutralizing its own content. Radix (and other modal layers) set
// `body { pointer-events: none }` while a dropdown or dialog is open so only the
// popover is interactive, which would leave our hit test unable to see anything
// outside it. Forcing the page hit-testable is safe because the shield, not
// pointer-events, is what keeps the page from reacting.
//
// Scoped to html/body (not `*`) on purpose: elements that set their OWN
// pointer-events:none — the click-through dev-tool overlays we deliberately skip
// in isValidGrabbableElement — must keep reading as "none". `!important` beats
// Radix's inline `body.style.pointerEvents = "none"` (inline without !important
// loses to an !important rule).
//
// Same-origin iframes stay forced interactive so they keep scrolling natively
// through the shield's cut-outs.
// @see https://github.com/aidenybai/react-grab/pull/209
const POINTER_EVENTS_STYLES = `html, body { pointer-events: auto !important; }
iframe[${SAME_ORIGIN_FRAME_ATTRIBUTE}] { pointer-events: auto !important; }`;

interface PointerEventsFreezeLayer {
  style: HTMLStyleElement;
  shield: HitTestShield;
}

const registeredDocuments = new Set<Document>();
const layersByDocument = new Map<Document, PointerEventsFreezeLayer>();
let isInstalled = false;
// Counted rather than a boolean because hit tests nest: a drag scan holds the
// gate open while the helpers it calls open and close it themselves, and an
// inner close would leave the outer scan hit-testing the shield.
let hitTestDepth = 0;

const collectSameOriginFrames = (targetDocument: Document): Iterable<Element> => {
  const frames = new Set<Element>(
    targetDocument.querySelectorAll(`iframe[${SAME_ORIGIN_FRAME_ATTRIBUTE}]`),
  );
  // querySelectorAll cannot reach into shadow roots, so every registered frame
  // document also contributes the element hosting it — otherwise a frame inside
  // a shadow root keeps the shield over it and loses native scrolling.
  for (const registeredDocument of registeredDocuments) {
    const frameElement = getWindowFrameElement(registeredDocument.defaultView);
    if (frameElement?.ownerDocument === targetDocument) frames.add(frameElement);
  }
  return frames;
};

const installDocumentLayer = (targetDocument: Document): void => {
  if (layersByDocument.has(targetDocument)) return;

  const style = createStyleElement(
    "data-react-grab-frozen-pseudo",
    POINTER_EVENTS_STYLES,
    targetDocument,
  );
  const shield = createHitTestShield(targetDocument, () => collectSameOriginFrames(targetDocument));
  // Reads iframe rects, so it forces a style flush — but only on documents that
  // actually contain same-origin frames, which keeps the common case free of the
  // extra recalc that freezeGlobalInteractions batches its writes to avoid.
  shield.refreshHoles();
  if (hitTestDepth > 0) shield.openForHitTest();
  layersByDocument.set(targetDocument, { style, shield });
};

const uninstallDocumentLayer = (targetDocument: Document): void => {
  const layer = layersByDocument.get(targetDocument);
  if (!layer) return;
  layer.style.remove();
  layer.shield.remove();
  layersByDocument.delete(targetDocument);
};

export const isPointerEventsFreezeInstalled = (): boolean => isInstalled;

export const registerPointerEventsFreezeDocument = (targetDocument: Document): (() => void) => {
  registeredDocuments.add(targetDocument);
  if (isInstalled) {
    installDocumentLayer(targetDocument);
    // A frame appearing or leaving changes where the parent shield needs its
    // cut-outs, not just which documents carry a shield.
    refreshPointerEventsFreezeShields();
  }

  return () => {
    registeredDocuments.delete(targetDocument);
    uninstallDocumentLayer(targetDocument);
    refreshPointerEventsFreezeShields();
  };
};

export const installPointerEventsFreeze = (): void => {
  if (isInstalled) return;
  isInstalled = true;
  hitTestDepth = 0;
  registeredDocuments.add(document);
  for (const targetDocument of registeredDocuments) installDocumentLayer(targetDocument);
};

export const uninstallPointerEventsFreeze = (): void => {
  if (!isInstalled) return;
  isInstalled = false;
  hitTestDepth = 0;
  for (const targetDocument of [...layersByDocument.keys()]) {
    uninstallDocumentLayer(targetDocument);
  }
};

export const suspendPointerEventsFreeze = (): void => {
  if (!isInstalled) return;
  hitTestDepth++;
  if (hitTestDepth > 1) return;
  for (const layer of layersByDocument.values()) layer.shield.openForHitTest();
};

export const resumePointerEventsFreeze = (): void => {
  if (!isInstalled || hitTestDepth === 0) return;
  hitTestDepth--;
  if (hitTestDepth > 0) return;
  for (const layer of layersByDocument.values()) layer.shield.closeAfterHitTest();
};

// The shield's iframe cut-outs are viewport-relative, so scrolling or resizing
// moves the frames out from under their holes.
export const refreshPointerEventsFreezeShields = (): void => {
  if (!isInstalled) return;
  for (const layer of layersByDocument.values()) layer.shield.refreshHoles();
};
