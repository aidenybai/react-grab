import {
  freezeAnimations,
  freezeGlobalAnimations,
  unfreezeGlobalAnimations,
} from "./utils/freeze-animations.js";
import { freezePseudoStates } from "./utils/freeze-pseudo-states.js";
import { freezeUpdates } from "./utils/freeze-updates.js";
import { unfreezePseudoStates } from "./utils/freeze-pseudo-states.js";
import { getHTMLPreview } from "./core/context.js";
import { getReactStack } from "./core/source/react.js";
import {
  resolveElementComponentName,
  resolveElementStack,
} from "./core/source/index.js";
import { formatElementStack } from "./utils/format-element-stack.js";
import { Fiber, getFiberFromHostInstance } from "bippy";
import type { StackFrame } from "bippy/source";
export type { StackFrame };
import { createElementSelector } from "./utils/create-element-selector.js";
import { extractElementCss } from "./utils/extract-element-css.js";
import { openFile as openFileAsync } from "./utils/open-file.js";

export interface ReactGrabElementContext {
  element: Element;
  htmlPreview: string;
  stackString: string;
  stack: StackFrame[];
  componentName: string | null;
  fiber: Fiber | null;
  selector: string | null;
  styles: string;
}

/**
 * Gathers comprehensive context for a DOM element across all supported frameworks
 * (React, Vue, Svelte, Solid), including component name, source stack, HTML preview,
 * CSS selector, and computed styles. The `fiber` field is React-specific.
 *
 * @example
 * const context = await getElementContext(document.querySelector('.my-button')!);
 * console.log(context.componentName); // "SubmitButton"
 * console.log(context.selector);      // "button.my-button"
 * console.log(context.stackString);   // "\n  in SubmitButton (at Button.tsx:12:5)"
 */
export const getElementContext = async (
  element: Element,
): Promise<ReactGrabElementContext> => {
  const stack = (await getReactStack(element)) ?? [];
  const elementStack = await resolveElementStack(element);
  const stackString = formatElementStack(elementStack);
  const htmlPreview = getHTMLPreview(element);
  const componentName = await resolveElementComponentName(element);
  const fiber = getFiberFromHostInstance(element);
  const selector = createElementSelector(element);
  const styles = extractElementCss(element);

  return {
    element,
    htmlPreview,
    stackString,
    stack,
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
  freezeCleanupFns.add(freezeUpdates());
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

/**
 * Opens the source file at the given path in the user's editor.
 * Tries the dev-server endpoint first (Vite / Next.js), then falls back
 * to a protocol URL (e.g. vscode://file/…).
 *
 * @example
 * openFile("/src/components/Button.tsx");
 * openFile("/src/components/Button.tsx", 42);
 */
export const openFile = async (
  filePath: string,
  lineNumber?: number,
): Promise<void> => {
  await openFileAsync(filePath, lineNumber);
};
