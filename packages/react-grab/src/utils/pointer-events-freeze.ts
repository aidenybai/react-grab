import { SAME_ORIGIN_FRAME_ATTRIBUTE } from "../constants.js";
import { createStyleElement } from "./create-style-element.js";

// We apply pointer-events:none on `html` rather than `*` because pointer-events
// is inherited, so toggling it on a single root element is O(1) style invalidation
// instead of O(N) for every DOM node, which caused visible lag on dense DOMs
// like GitHub diff viewers with 10k+ nodes.
// Same-origin iframe elements stay interactive for native viewport scrolling,
// while each accessible frame document receives this root freeze too. Their
// forwarded input can still drive selection without page descendants reacting.
// @see https://github.com/aidenybai/react-grab/pull/209
const POINTER_EVENTS_STYLES = `html { pointer-events: none !important; }
iframe[${SAME_ORIGIN_FRAME_ATTRIBUTE}] { pointer-events: auto !important; }`;

// Enabled only during a hit-test (between suspend/resume). It must override
// pointer-events:none that the PAGE applied, not just ours — e.g. Radix (and
// other modal layers) set `body { pointer-events: none }` while a dropdown/
// dialog is open so only the popover is interactive. Without this, our
// elementsFromPoint returns nothing outside the popover and react-grab can only
// select elements inside the open dropdown.
//
// Scoped to html/body (not `*`) on purpose: elements that set their OWN
// pointer-events:none — the click-through dev-tool overlays we deliberately skip
// in isValidGrabbableElement — must keep reading as "none". Overriding only the
// inherited root value restores hit-testability for normal page content while
// leaving those self-set overlays untouched. `!important` beats Radix's
// inline `body.style.pointerEvents = "none"` (inline without !important loses to
// an !important rule), and a later-inserted sheet wins our own freeze.
const HIT_TEST_OVERRIDE_STYLES = "html, body { pointer-events: auto !important; }";

interface PointerEventsFreezeStyles {
  pointerEventsStyle: HTMLStyleElement;
  hitTestOverrideStyle: HTMLStyleElement;
}

const registeredDocuments = new Set<Document>();
const stylesByDocument = new Map<Document, PointerEventsFreezeStyles>();
let isInstalled = false;

const installDocumentStyles = (targetDocument: Document): void => {
  if (stylesByDocument.has(targetDocument)) return;

  const pointerEventsStyle = createStyleElement(
    "data-react-grab-frozen-pseudo",
    POINTER_EVENTS_STYLES,
    targetDocument,
  );
  const hitTestOverrideStyle = createStyleElement(
    "data-react-grab-hittest-override",
    HIT_TEST_OVERRIDE_STYLES,
    targetDocument,
  );
  hitTestOverrideStyle.disabled = true;
  stylesByDocument.set(targetDocument, { pointerEventsStyle, hitTestOverrideStyle });
};

const uninstallDocumentStyles = (targetDocument: Document): void => {
  const styles = stylesByDocument.get(targetDocument);
  if (!styles) return;
  styles.pointerEventsStyle.remove();
  styles.hitTestOverrideStyle.remove();
  stylesByDocument.delete(targetDocument);
};

export const isPointerEventsFreezeInstalled = (): boolean => isInstalled;

export const registerPointerEventsFreezeDocument = (targetDocument: Document): (() => void) => {
  registeredDocuments.add(targetDocument);
  if (isInstalled) installDocumentStyles(targetDocument);

  return () => {
    registeredDocuments.delete(targetDocument);
    uninstallDocumentStyles(targetDocument);
  };
};

export const installPointerEventsFreeze = (): void => {
  if (isInstalled) return;
  isInstalled = true;
  registeredDocuments.add(document);
  for (const targetDocument of registeredDocuments) installDocumentStyles(targetDocument);
};

export const uninstallPointerEventsFreeze = (): void => {
  if (!isInstalled) return;
  isInstalled = false;
  for (const targetDocument of [...stylesByDocument.keys()]) {
    uninstallDocumentStyles(targetDocument);
  }
};

// Writing `.disabled` on a CSSStyleSheet element invalidates the affected
// selector tree even when the new value matches the old one in some engines,
// so we early-out when the desired state is already in effect. Continuous
// pointermove hits this hundreds of times per second.
export const suspendPointerEventsFreeze = (): void => {
  if (!isInstalled) return;
  for (const styles of stylesByDocument.values()) {
    if (!styles.pointerEventsStyle.disabled) styles.pointerEventsStyle.disabled = true;
    if (styles.hitTestOverrideStyle.disabled) styles.hitTestOverrideStyle.disabled = false;
  }
};

export const resumePointerEventsFreeze = (): void => {
  if (!isInstalled) return;
  for (const styles of stylesByDocument.values()) {
    if (styles.pointerEventsStyle.disabled) styles.pointerEventsStyle.disabled = false;
    if (!styles.hitTestOverrideStyle.disabled) styles.hitTestOverrideStyle.disabled = true;
  }
};
