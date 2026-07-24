import { freezeAnimations } from "./utils/freeze-animations.js";
import {
  freezeGlobalInteractions,
  unfreezeGlobalInteractions,
} from "./utils/freeze-global-interactions.js";
import { FreezeError, RecoverableError } from "./errors.js";
import { freezeUpdatesOrThrow } from "./utils/freeze-updates.js";
import { reportRecoverableError } from "./utils/report-recoverable-error.js";
import {
  getComponentDisplayName,
  getStack,
  getStackContext,
  formatElementInfo,
  resolveSource,
} from "./core/context.js";
import { getHTMLPreview } from "./core/html-preview.js";
import type { Fiber } from "bippy";
import type { StackFrame } from "bippy/source";
export type { StackFrame };
import { createElementSelector } from "./utils/create-element-selector.js";
import { extractElementCss, disposeBaselineStyles } from "./utils/extract-element-css.js";
import { findSelectorTarget } from "./utils/find-selector-target.js";
import { requestOpenFile } from "./utils/open-file.js";
import { isValidGrabbableElement } from "./utils/is-valid-grabbable-element.js";
import { createElementBounds } from "./utils/create-element-bounds.js";
import { getUnfilteredElementsAtPoint } from "./utils/get-unfiltered-elements-at-point.js";
import { matchesElementAtPointOptions } from "./utils/matches-element-at-point-options.js";
import type { ElementAtPointOptions, ElementBounds } from "./types.js";
import { getReactFiberForElement } from "./core/element-adapter.js";
import { resolveThreeElementAtPoint } from "./core/three-selection.js";

export {
  registerThreeScene,
  type ThreeSceneRegistration,
  type ThreeSceneRenderingControls,
} from "./core/three-selection.js";

export type { ElementAtPointOptions, ElementBounds } from "./types.js";

export { OpenFileError } from "./errors.js";

export interface ReactGrabElementContext {
  element: Element;
  snippet: string;
  htmlPreview: string;
  stackString: string;
  stack: StackFrame[];
  componentName: string | null;
  filePath: string | null;
  lineNumber: number | null;
  columnNumber: number | null;
  fiber: Fiber | null;
  selector: string | null;
  styles: string;
}

/**
 * Returns whether an element is a useful selection target. Invisible elements,
 * document roots, React Grab UI, ignored subtrees, and transparent page-covering
 * overlays are excluded.
 */
export const isElementGrabbable = (element: Element): boolean => isValidGrabbableElement(element);

/**
 * Returns viewport bounds in the top-level window, including elements inside
 * transformed same-origin iframes.
 */
export const getElementBounds = (element: Element): ElementBounds => ({
  ...createElementBounds(element),
});

/**
 * Returns a stable selector, crossing open shadow roots and same-origin iframes
 * with `>>>` and `>>iframe>>` boundary markers.
 */
export const getElementSelector = (element: Element): string =>
  createElementSelector(findSelectorTarget(element));

/**
 * Gathers comprehensive context for a DOM element — the same context
 * React Grab copies to the clipboard, plus structured source location
 * and computed styles.
 *
 * @example
 * const ctx = await getElementContext(document.querySelector('.my-button')!);
 * ctx.snippet;       // formatted text identical to React Grab's clipboard output
 * ctx.componentName; // "SubmitButton"
 * ctx.filePath;      // "/src/components/Button.tsx"
 * ctx.lineNumber;    // 12
 */
export const getElementContext = async (element: Element): Promise<ReactGrabElementContext> => {
  const [snippet, source, stack] = await Promise.all([
    formatElementInfo(element),
    resolveSource(element),
    getStack(element).then((result) => result ?? []),
  ]);
  const stackString = await getStackContext(element);
  const htmlPreview = getHTMLPreview(element);
  const componentName = getComponentDisplayName(element);
  const fiber = getReactFiberForElement(element);
  const selector = getElementSelector(element);
  const styles = extractElementCss(element);

  return {
    element,
    snippet,
    htmlPreview,
    stackString,
    stack,
    componentName,
    filePath: source?.filePath ?? null,
    lineNumber: source?.lineNumber ?? null,
    columnNumber: source?.columnNumber ?? null,
    fiber,
    selector,
    styles,
  };
};

export { copyContent } from "./utils/copy-content.js";

/**
 * Returns the topmost selectable element at viewport coordinates. Hit testing
 * traverses open shadow roots and same-origin iframes and continues past
 * non-grabbable overlays. Pass a filter to replace the default grabbability
 * predicate or a container to confine selection to its composed subtree.
 *
 * @example
 * const element = getElementAtPoint(event.clientX, event.clientY, {
 *   container: canvas,
 *   filter: (candidate) => isElementGrabbable(candidate) && !toolbar.contains(candidate),
 * });
 */
export const getElementAtPoint = (
  clientX: number,
  clientY: number,
  options?: ElementAtPointOptions,
): Element | null => {
  const elements = getUnfilteredElementsAtPoint(clientX, clientY);
  for (const element of elements) {
    const resolvedElement = resolveThreeElementAtPoint(element, clientX, clientY);
    if (matchesElementAtPointOptions(resolvedElement, options)) {
      return resolvedElement;
    }
    if (resolvedElement !== element && matchesElementAtPointOptions(element, options))
      return element;
  }
  return null;
};

/**
 * Returns every selectable element at viewport coordinates in paint order,
 * from topmost to bottommost. Uses the same shadow-root, iframe, filter, and
 * container behavior as `getElementAtPoint`.
 */
export const getElementsAtPoint = (
  clientX: number,
  clientY: number,
  options?: ElementAtPointOptions,
): Element[] => {
  const elements = getUnfilteredElementsAtPoint(clientX, clientY);
  const matchingElements: Element[] = [];
  for (const element of elements) {
    const resolvedElement = resolveThreeElementAtPoint(element, clientX, clientY);
    if (matchesElementAtPointOptions(resolvedElement, options)) {
      matchingElements.push(resolvedElement);
      continue;
    }
    if (resolvedElement !== element && matchesElementAtPointOptions(element, options)) {
      matchingElements.push(element);
    }
  }
  return matchingElements;
};

/**
 * Returns all elements at the given viewport coordinates, temporarily
 * suspending the pointer-events freeze so `elementsFromPoint` can
 * reach real elements underneath.
 *
 * @example
 * freeze();
 * const elements = getElementsAtPosition(e.clientX, e.clientY);
 * // elements[0] is the topmost element under the cursor
 *
 * @deprecated Use `getElementsAtPoint` for selectable elements. Pass
 * `{ filter: () => true }` to preserve this function's raw-stack behavior.
 */
export const getElementsAtPosition = (clientX: number, clientY: number): Element[] => {
  return getUnfilteredElementsAtPoint(clientX, clientY);
};

const freezeCleanupFunctions = new Set<() => void>();
let _isFreezeActive = false;
let isFreezeInProgress = false;
let isUnfreezeInProgress = false;
let isUnfreezeRequested = false;

const unfreezeTargetAnimations = (): void => {
  freezeAnimations([]);
};

const runFreezeCleanups = (): unknown[] => {
  if (isUnfreezeInProgress) return [];
  isUnfreezeInProgress = true;
  const cleanupFunctions = Array.from(freezeCleanupFunctions).reverse();
  const failedCleanupFunctions: Array<() => void> = [];
  const cleanupErrors: unknown[] = [];
  freezeCleanupFunctions.clear();
  try {
    for (const cleanupFunction of cleanupFunctions) {
      try {
        cleanupFunction();
      } catch (error) {
        failedCleanupFunctions.unshift(cleanupFunction);
        cleanupErrors.push(error);
      }
    }
  } finally {
    for (const failedCleanupFunction of failedCleanupFunctions) {
      freezeCleanupFunctions.add(failedCleanupFunction);
    }
    isUnfreezeInProgress = false;
  }
  return cleanupErrors;
};

/**
 * Freezes the page by halting React updates, pausing CSS/JS animations,
 * and preserving pseudo-states (e.g. :hover, :focus) on the given elements.
 *
 * @example
 * freeze(); // freezes the entire page
 * freeze([document.querySelector('.modal')!]); // freezes only the modal subtree
 */
export const freeze = (elements?: Element[]): void => {
  if (_isFreezeActive || isFreezeInProgress) return;
  isFreezeInProgress = true;
  try {
    freezeCleanupFunctions.add(freezeUpdatesOrThrow());
    freezeCleanupFunctions.add(unfreezeGlobalInteractions);
    // Batched layout reads must run before freezeAnimations injects its
    // stylesheet and sets frozen attributes, or those writes force a second
    // full-document style recalc under the reads.
    freezeGlobalInteractions();
    freezeCleanupFunctions.add(unfreezeTargetAnimations);
    freezeAnimations(elements ?? [document.body]);
    _isFreezeActive = true;
  } catch (error) {
    const rollbackErrors = runFreezeCleanups();
    _isFreezeActive = freezeCleanupFunctions.size > 0;
    throw new FreezeError(
      rollbackErrors.length === 0
        ? error
        : new AggregateError([error, ...rollbackErrors], "Rolling back page freeze failed"),
    );
  } finally {
    isFreezeInProgress = false;
    if (isUnfreezeRequested) {
      isUnfreezeRequested = false;
      unfreeze();
    }
  }
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
  if (isFreezeInProgress) {
    isUnfreezeRequested = true;
    return;
  }
  if (isUnfreezeInProgress) return;
  const cleanupErrors = runFreezeCleanups();
  _isFreezeActive = freezeCleanupFunctions.size > 0;
  for (const error of cleanupErrors) {
    reportRecoverableError(new RecoverableError("Unfreezing page failed", error));
  }
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
export const openFile = async (filePath: string, lineNumber?: number): Promise<void> => {
  await requestOpenFile(filePath, lineNumber);
};

export { FreezeError };
export { disposeBaselineStyles };
