import { createStyleElement } from "./create-style-element.js";

// We apply pointer-events:none on `html` rather than `*` because pointer-events
// is inherited, so toggling it on a single root element is O(1) style invalidation
// instead of O(N) for every DOM node, which caused visible lag on dense DOMs
// like GitHub diff viewers with 10k+ nodes.
// @see https://github.com/aidenybai/react-grab/pull/209
const POINTER_EVENTS_STYLES = "html { pointer-events: none !important; }";

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

let pointerEventsStyle: HTMLStyleElement | null = null;
let hitTestOverrideStyle: HTMLStyleElement | null = null;

export const isPointerEventsFreezeInstalled = (): boolean => pointerEventsStyle !== null;

export const installPointerEventsFreeze = (): void => {
  if (pointerEventsStyle) return;
  pointerEventsStyle = createStyleElement("data-react-grab-frozen-pseudo", POINTER_EVENTS_STYLES);
  hitTestOverrideStyle = createStyleElement(
    "data-react-grab-hittest-override",
    HIT_TEST_OVERRIDE_STYLES,
  );
  hitTestOverrideStyle.disabled = true;
};

export const uninstallPointerEventsFreeze = (): void => {
  pointerEventsStyle?.remove();
  pointerEventsStyle = null;
  hitTestOverrideStyle?.remove();
  hitTestOverrideStyle = null;
};

// Writing `.disabled` on a CSSStyleSheet element invalidates the affected
// selector tree even when the new value matches the old one in some engines,
// so we early-out when the desired state is already in effect. Continuous
// pointermove hits this hundreds of times per second.
export const suspendPointerEventsFreeze = (): void => {
  if (!pointerEventsStyle) return;
  if (!pointerEventsStyle.disabled) pointerEventsStyle.disabled = true;
  if (hitTestOverrideStyle?.disabled) hitTestOverrideStyle.disabled = false;
};

export const resumePointerEventsFreeze = (): void => {
  if (!pointerEventsStyle) return;
  if (pointerEventsStyle.disabled) pointerEventsStyle.disabled = false;
  if (hitTestOverrideStyle && !hitTestOverrideStyle.disabled) hitTestOverrideStyle.disabled = true;
};
