import type { Rect } from "../types.js";
import {
  ELEMENT_POSITION_CACHE_DISTANCE_THRESHOLD_PX,
  ELEMENT_POSITION_THROTTLE_MS,
  POINTER_EVENTS_RESUME_DEBOUNCE_MS,
} from "../constants.js";
import { createElementBounds } from "./create-element-bounds.js";
import { getAccessibleIframeDocument } from "./get-accessible-iframe-document.js";
import { getDeepElementAtPoint } from "./get-deep-element-at-point.js";
import { getDeepFallbackElementAtPoint } from "./get-deep-fallback-element-at-point.js";
import { getDeepElementsAtPoint } from "./get-deep-elements-at-point.js";
import { getLocalContentElementAtPoint } from "./get-local-content-element-at-point.js";
import { getScopeContainer, isWithinScope } from "./runtime-mode.js";
import { isIframeElement } from "./is-iframe-element.js";
import { isPointInsideRect } from "./is-point-inside-rect.js";
import { isValidGrabbableElement } from "./is-valid-grabbable-element.js";
import { resumePointerEventsFreeze, suspendPointerEventsFreeze } from "./pointer-events-freeze.js";
import { resolveThreeElementAtPoint } from "../core/three-selection.js";

interface PositionCache {
  clientX: number;
  clientY: number;
  element: Element | null;
  fallbackElement: Element | null;
  localHitElement: Element | null;
  timestamp: number;
}

interface InaccessibleIframePositionCache {
  bounds: Rect;
  element: HTMLIFrameElement;
  timestamp: number;
}

let positionCache: PositionCache | null = null;
let inaccessibleIframePositionCache: InaccessibleIframePositionCache | null = null;
let pointerEventsResumeTimerId: ReturnType<typeof setTimeout> | null = null;

const schedulePointerEventsResume = (): void => {
  if (pointerEventsResumeTimerId !== null) {
    clearTimeout(pointerEventsResumeTimerId);
  }
  pointerEventsResumeTimerId = setTimeout(() => {
    pointerEventsResumeTimerId = null;
    resumePointerEventsFreeze();
  }, POINTER_EVENTS_RESUME_DEBOUNCE_MS);
};

const cancelScheduledPointerEventsResume = (): void => {
  if (pointerEventsResumeTimerId !== null) {
    clearTimeout(pointerEventsResumeTimerId);
    pointerEventsResumeTimerId = null;
  }
};

const isWithinThreshold = (x1: number, y1: number, x2: number, y2: number): boolean => {
  const deltaX = Math.abs(x1 - x2);
  const deltaY = Math.abs(y1 - y2);
  return (
    deltaX <= ELEMENT_POSITION_CACHE_DISTANCE_THRESHOLD_PX &&
    deltaY <= ELEMENT_POSITION_CACHE_DISTANCE_THRESHOLD_PX
  );
};

const resolveValidElementAtPoint = (
  element: Element,
  clientX: number,
  clientY: number,
): Element | null => {
  const resolvedElement = resolveThreeElementAtPoint(element, clientX, clientY);
  return isValidGrabbableElement(resolvedElement) && isWithinScope(element)
    ? resolvedElement
    : null;
};

export const getElementsAtPoint = (clientX: number, clientY: number): Element[] => {
  if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return [];
  cancelScheduledPointerEventsResume();
  suspendPointerEventsFreeze();
  try {
    const elements = getDeepElementsAtPoint(clientX, clientY);
    const scopedElements = getScopeContainer() ? elements.filter(isWithinScope) : elements;
    const resolvedElements: Element[] = [];
    const includedElements = new Set<Element>();
    let didResolveLocalContent = false;
    for (const element of scopedElements) {
      let preciseElement = element;
      if (!didResolveLocalContent) {
        const localContentElement = getLocalContentElementAtPoint(element, clientX, clientY);
        if (
          localContentElement &&
          isWithinScope(localContentElement) &&
          isValidGrabbableElement(localContentElement)
        ) {
          preciseElement = localContentElement;
          didResolveLocalContent = true;
        } else if (isValidGrabbableElement(element)) {
          didResolveLocalContent = true;
        }
      }
      const resolvedPreciseElement = resolveThreeElementAtPoint(preciseElement, clientX, clientY);
      if (!includedElements.has(resolvedPreciseElement)) {
        includedElements.add(resolvedPreciseElement);
        resolvedElements.push(resolvedPreciseElement);
      }
      if (preciseElement === element) continue;

      if (element.contains(preciseElement)) {
        let ancestorElement = preciseElement.parentElement;
        while (ancestorElement && ancestorElement !== element) {
          const resolvedAncestorElement = resolveThreeElementAtPoint(
            ancestorElement,
            clientX,
            clientY,
          );
          if (!includedElements.has(resolvedAncestorElement)) {
            includedElements.add(resolvedAncestorElement);
            resolvedElements.push(resolvedAncestorElement);
          }
          ancestorElement = ancestorElement.parentElement;
        }
      }
      const resolvedNativeElement = resolveThreeElementAtPoint(element, clientX, clientY);
      if (!includedElements.has(resolvedNativeElement)) {
        includedElements.add(resolvedNativeElement);
        resolvedElements.push(resolvedNativeElement);
      }
    }
    return resolvedElements;
  } finally {
    schedulePointerEventsResume();
  }
};

export const getElementAtPosition = (clientX: number, clientY: number): Element | null => {
  if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return null;
  const now = performance.now();

  // Inaccessible iframes can only resolve to the iframe element itself. Reusing
  // its bounds avoids repeating the pointer-events toggle and full hit test on
  // every move. Accessibility is checked again so a later same-origin navigation
  // immediately leaves this fast path and resumes deep element detection.
  if (inaccessibleIframePositionCache) {
    const cachedIframe = inaccessibleIframePositionCache.element;
    const isCacheFresh =
      now - inaccessibleIframePositionCache.timestamp < ELEMENT_POSITION_THROTTLE_MS;
    if (
      cachedIframe.isConnected &&
      isCacheFresh &&
      isPointInsideRect(clientX, clientY, inaccessibleIframePositionCache.bounds) &&
      !getAccessibleIframeDocument(cachedIframe)
    ) {
      return cachedIframe;
    }
    inaccessibleIframePositionCache = null;
    if (positionCache?.element === cachedIframe) positionCache = null;
  }

  if (positionCache) {
    const isPositionClose = isWithinThreshold(
      clientX,
      clientY,
      positionCache.clientX,
      positionCache.clientY,
    );
    const isWithinThrottle = now - positionCache.timestamp < ELEMENT_POSITION_THROTTLE_MS;

    if (isPositionClose && isWithinThrottle) {
      if (!positionCache.localHitElement) return positionCache.element;

      const localContentElement = getLocalContentElementAtPoint(
        positionCache.localHitElement,
        clientX,
        clientY,
      );
      return localContentElement
        ? (resolveValidElementAtPoint(localContentElement, clientX, clientY) ??
            positionCache.fallbackElement)
        : positionCache.fallbackElement;
    }
  }

  // PERF: suspendPointerEventsFreeze toggles the html { pointer-events: none }
  // stylesheet, which dirties the entire style tree. elementFromPoint then forces
  // a Recalculate Style. The 100ms debounced resume (schedulePointerEventsResume) ensures the
  // toggle is a no-op on rapid subsequent calls. The expensive recalc on those
  // calls comes from host-page CSS animations dirtying styles between frames,
  // which is unavoidable without removing pointer-events: none entirely.
  // Alternatives explored and rejected:
  //   - IntersectionObserver pre-population: adds 1-frame latency to every poll
  //   - event.target fast path: always html/document due to pointer-events: none
  //   - generic bounds-check cache: ignores z-index/stacking, causing hover
  //     detection misses; the cache below is limited to inaccessible iframes
  //   - transparent overlay instead of pointer-events: none: leaks CSS-only :hover
  //     dropdowns/tooltips during the hit-test toggle
  cancelScheduledPointerEventsResume();
  suspendPointerEventsFreeze();
  try {
    let result: Element | null = null;

    // elementFromPoint returns the topmost element, but if it's not grabbable
    // (e.g. a transparent overlay) or out of scope (e.g. an external element
    // overlapping the scoped container) we fall back to elementsFromPoint, which
    // returns the full z-ordered stack, and take the first grabbable in-scope one.
    const topElement = getDeepElementAtPoint(clientX, clientY);
    const localContentElement = topElement
      ? getLocalContentElementAtPoint(topElement, clientX, clientY)
      : null;
    const localContentResult = localContentElement
      ? resolveValidElementAtPoint(localContentElement, clientX, clientY)
      : null;
    const topResult = topElement ? resolveValidElementAtPoint(topElement, clientX, clientY) : null;
    const fallbackResult = topResult ?? getDeepFallbackElementAtPoint(clientX, clientY);
    result = localContentResult ?? fallbackResult;

    if (result && isIframeElement(result) && !getAccessibleIframeDocument(result)) {
      const iframeBounds = createElementBounds(result);
      inaccessibleIframePositionCache = {
        element: result,
        timestamp: now,
        bounds: {
          left: iframeBounds.x,
          top: iframeBounds.y,
          right: iframeBounds.x + iframeBounds.width,
          bottom: iframeBounds.y + iframeBounds.height,
        },
      };
    } else {
      inaccessibleIframePositionCache = null;
    }
    positionCache = {
      clientX,
      clientY,
      element: result,
      fallbackElement: fallbackResult,
      localHitElement:
        topElement?.namespaceURI === "http://www.w3.org/2000/svg" || localContentElement
          ? topElement
          : null,
      timestamp: now,
    };
    return result;
  } finally {
    schedulePointerEventsResume();
  }
};

export const clearElementPositionCache = (): void => {
  cancelScheduledPointerEventsResume();
  resumePointerEventsFreeze();
  positionCache = null;
  inaccessibleIframePositionCache = null;
};
