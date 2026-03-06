import {
  freezeAnimations,
  freezeGlobalAnimations,
  unfreezeGlobalAnimations,
} from "./utils/freeze-animations.js";
import { freezePseudoStates } from "./utils/freeze-pseudo-states.js";
import { freezeUpdates } from "./utils/freeze-updates.js";
import { unfreezePseudoStates } from "./utils/freeze-pseudo-states.js";
import {
  getComponentDisplayName,
  getHTMLPreview,
  getStackContext,
} from "./core/context.js";
import { Fiber, getFiberFromHostInstance } from "bippy";
import { createElementSelector } from "./utils/create-element-selector.js";
import { extractElementCss } from "./utils/extract-element-css.js";

export interface ReactGrabElementContext {
  element: Element;
  htmlPreview: string;
  stackContext: string;
  componentName: string | null;
  fiber: Fiber | null;
  selector: string | null;
  styles: string;
}

/**
 * Gathers comprehensive context for a DOM element, including its React fiber,
 * component name, source stack, HTML preview, CSS selector, and computed styles.
 *
 * @example
 * const context = await getElementContext(document.querySelector('.my-button')!);
 * console.log(context.componentName); // "SubmitButton"
 * console.log(context.selector);      // "button.my-button"
 * console.log(context.stackContext);  // "SubmitButton > Form > App"
 */
export const getElementContext = async (
  element: Element,
): Promise<ReactGrabElementContext> => {
  const stackContext = await getStackContext(element);
  const htmlPreview = getHTMLPreview(element);
  const componentName = getComponentDisplayName(element);
  const fiber = getFiberFromHostInstance(element);
  const selector = createElementSelector(element);
  const styles = extractElementCss(element);

  return {
    element,
    htmlPreview,
    stackContext,
    componentName,
    fiber,
    selector,
    styles,
  };
};

const freezeCleanupFns = new Set<() => void>();
let _isFreezeActive = false;

/**
 * Freezes the page by halting React updates, pausing CSS/JS animations,
 * and preserving pseudo-states (e.g. :hover, :focus) on the given elements.
 *
 * @example
 * freeze(); // freezes the entire page
 * freeze([document.querySelector('.modal')!]); // freezes only the modal subtree
 */
export const freeze = (elements?: Element[]): void => {
  _isFreezeActive = true;
  freezeUpdates();
  freezeCleanupFns.add(freezeAnimations(elements ?? [document.body]));
  freezeGlobalAnimations();
  freezePseudoStates();
};

/**
 * Restores normal page behavior by re-enabling React updates, resuming
 * animations, and releasing preserved pseudo-states.
 *
 * @example
 * freeze();
 * // ... capture a snapshot ...
 * unfreeze(); // page resumes normal behavior
 */
export const unfreeze = (): void => {
  _isFreezeActive = false;
  for (const cleanup of Array.from(freezeCleanupFns)) {
    cleanup();
  }
  freezeCleanupFns.clear();
  freezeAnimations([]);
  unfreezeGlobalAnimations();
  unfreezePseudoStates();
};

/**
 * Returns whether the page is currently in a frozen state.
 *
 * @example
 * if (isFreezeActive()) {
 *   console.log('Page is frozen, skipping update');
 * }
 */
export const isFreezeActive = (): boolean => {
  return _isFreezeActive;
};
