import { freezeAnimations } from "./utils/freeze-animations.js";
import {
  freezeGlobalInteractions,
  unfreezeGlobalInteractions,
} from "./utils/freeze-global-interactions.js";
import { FreezeError, RecoverableError } from "./errors.js";
import { freezeUpdatesOrThrow } from "./utils/freeze-updates.js";
import { reportRecoverableError } from "./utils/report-recoverable-error.js";
import {
  suspendPointerEventsFreeze,
  resumePointerEventsFreeze,
} from "./utils/pointer-events-freeze.js";
import {
  getComponentDisplayName,
  getStack,
  getStackContext,
  formatElementInfo,
  resolveSource,
} from "./core/context.js";
import { getHTMLPreview } from "./core/html-preview.js";
import { Fiber, getFiberFromHostInstance } from "bippy";
import type { StackFrame } from "bippy/source";
export type { StackFrame };
import { createElementSelector } from "./utils/create-element-selector.js";
import { extractElementCss, disposeBaselineStyles } from "./utils/extract-element-css.js";
import { findSelectorTarget } from "./utils/find-selector-target.js";
import { requestOpenFile } from "./utils/open-file.js";

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
  const fiber = getFiberFromHostInstance(element);
  const selector = createElementSelector(findSelectorTarget(element));
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
 * Returns all elements at the given viewport coordinates, temporarily
 * suspending the pointer-events freeze so `elementsFromPoint` can
 * reach real elements underneath.
 *
 * @example
 * freeze();
 * const elements = getElementsAtPosition(e.clientX, e.clientY);
 * // elements[0] is the topmost element under the cursor
 */
export const getElementsAtPosition = (clientX: number, clientY: number): Element[] => {
  if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return [];
  suspendPointerEventsFreeze();
  try {
    return Array.from(document.elementsFromPoint(clientX, clientY));
  } finally {
    resumePointerEventsFreeze();
  }
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
