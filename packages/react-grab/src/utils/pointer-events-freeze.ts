import { createStyleElement } from "./create-style-element.js";

// We apply pointer-events:none on `html` rather than `*` because pointer-events
// is inherited, so toggling it on a single root element is O(1) style invalidation
// instead of O(N) for every DOM node, which caused visible lag on dense DOMs
// like GitHub diff viewers with 10k+ nodes.
// @see https://github.com/aidenybai/react-grab/pull/209
const POINTER_EVENTS_STYLES = "html { pointer-events: none !important; }";

let pointerEventsStyle: HTMLStyleElement | null = null;

export const isPointerEventsFreezeInstalled = (): boolean => pointerEventsStyle !== null;

export const installPointerEventsFreeze = (): void => {
  if (pointerEventsStyle) return;
  pointerEventsStyle = createStyleElement("data-react-grab-frozen-pseudo", POINTER_EVENTS_STYLES);
};

export const uninstallPointerEventsFreeze = (): void => {
  pointerEventsStyle?.remove();
  pointerEventsStyle = null;
};

// Writing `.disabled` on a CSSStyleSheet element invalidates the affected
// selector tree even when the new value matches the old one in some engines,
// so we early-out when the desired state is already in effect. Continuous
// pointermove hits this hundreds of times per second.
export const suspendPointerEventsFreeze = (): void => {
  if (!pointerEventsStyle || pointerEventsStyle.disabled) return;
  pointerEventsStyle.disabled = true;
};

export const resumePointerEventsFreeze = (): void => {
  if (!pointerEventsStyle || !pointerEventsStyle.disabled) return;
  pointerEventsStyle.disabled = false;
};
