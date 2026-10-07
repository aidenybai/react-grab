import type { Rect } from "../types.js";
import {
  ELEMENT_POSITION_CACHE_DISTANCE_THRESHOLD_PX,
  ELEMENT_POSITION_THROTTLE_MS,
} from "../constants.js";
import { createElementBounds } from "./create-element-bounds.js";
import { getAccessibleIframeDocument } from "./get-accessible-iframe-document.js";
import { getDeepElementAtPoint } from "./get-deep-element-at-point.js";
import { getDeepFallbackElementAtPoint } from "./get-deep-fallback-element-at-point.js";
import { getDeepElementsAtPoint } from "./get-deep-elements-at-point.js";
import { getComposedParentElement } from "./get-composed-parent-element.js";
import { getElementTextBounds } from "./get-element-text-bounds.js";
import { getLocalContentElementAtPoint } from "./get-local-content-element-at-point.js";
import { getScopeContainer, isWithinScope } from "./runtime-mode.js";
import { isIframeElement } from "./is-iframe-element.js";
import { isPointInsideRect } from "./is-point-inside-rect.js";
import { isElementPaintedAtPosition } from "./is-element-painted-at-position.js";
import { isValidGrabbableElement } from "./is-valid-grabbable-element.js";
import { resumePointerEventsFreeze, suspendPointerEventsFreeze } from "./pointer-events-freeze.js";
import { resolveThreeElementAtPoint } from "../core/three-selection.js";

interface PositionCache {
  clientX: number;
  clientY: number;
  element: Element | null;
  fallbackElement: Element | null;
  preciseHitElement: Element | null;
  usesTextHitTesting: boolean;
  timestamp: number;
}

interface InaccessibleIframePositionCache {
  bounds: Rect;
  element: HTMLIFrameElement;
  timestamp: number;
}

let positionCache: PositionCache | null = null;
let inaccessibleIframePositionCache: InaccessibleIframePositionCache | null = null;

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
  return isValidGrabbableElement(resolvedElement) &&
    isWithinScope(element) &&
    isElementPaintedAtPosition(element, clientX, clientY)
    ? resolvedElement
    : null;
};

export const getElementsAtPoint = (clientX: number, clientY: number): Element[] => {
  if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return [];
  suspendPointerEventsFreeze();
  try {
    const elements = getDeepElementsAtPoint(clientX, clientY);
    const scopedElements = getScopeContainer() ? elements.filter(isWithinScope) : elements;
    const resolvedElements: Element[] = [];
    const includedElements = new Set<Element>();
    let didResolveLocalContent = false;
    for (const element of scopedElements) {
      let preciseElement = element;
      let isPreciseElementPainted = isElementPaintedAtPosition(element, clientX, clientY);
      if (!didResolveLocalContent) {
        const localContentElement = getLocalContentElementAtPoint(element, clientX, clientY);
        if (
          localContentElement &&
          isWithinScope(localContentElement) &&
          isValidGrabbableElement(localContentElement) &&
          isElementPaintedAtPosition(localContentElement, clientX, clientY)
        ) {
          preciseElement = localContentElement;
          isPreciseElementPainted = true;
          didResolveLocalContent = true;
        } else if (isValidGrabbableElement(element) && isPreciseElementPainted) {
          didResolveLocalContent = true;
        }
      }
      const resolvedPreciseElement = resolveThreeElementAtPoint(preciseElement, clientX, clientY);
      if (isPreciseElementPainted && !includedElements.has(resolvedPreciseElement)) {
        includedElements.add(resolvedPreciseElement);
        resolvedElements.push(resolvedPreciseElement);
      }
      if (preciseElement === element) continue;

      let ancestorElement = getComposedParentElement(preciseElement);
      while (ancestorElement && isWithinScope(ancestorElement)) {
        const resolvedAncestorElement = resolveThreeElementAtPoint(
          ancestorElement,
          clientX,
          clientY,
        );
        if (
          isElementPaintedAtPosition(ancestorElement, clientX, clientY) &&
          !includedElements.has(resolvedAncestorElement)
        ) {
          includedElements.add(resolvedAncestorElement);
          resolvedElements.push(resolvedAncestorElement);
        }
        ancestorElement = getComposedParentElement(ancestorElement);
      }
      break;
    }
    return resolvedElements;
  } finally {
    resumePointerEventsFreeze();
  }
};

export const getElementAtPosition = (clientX: number, clientY: number): Element | null => {
  if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return null;
  const now = performance.now();
  // Hit testing needs the page interactive, so the shield comes down for the
  // whole detection: the cached fast paths below run caretPositionFromPoint,
  // which would otherwise resolve to the shield instead of page text. Gating it
  // synchronously (rather than on a debounce, as the old root pointer-events
  // flip required) is affordable because hiding the shield restyles one leaf
  // element instead of the whole document.
  // Alternatives explored and rejected:
  //   - IntersectionObserver pre-population: adds 1-frame latency to every poll
  //   - generic bounds-check cache: ignores z-index/stacking, causing hover
  //     detection misses; the cache below is limited to inaccessible iframes
  suspendPointerEventsFreeze();
  try {
    // Inaccessible iframes can only resolve to the iframe element itself. Reusing
    // its bounds avoids repeating the full hit test on every move.
    // Accessibility is checked again so a later same-origin navigation
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
        if (!positionCache.preciseHitElement) return positionCache.element;

        const localContentElement = getLocalContentElementAtPoint(
          positionCache.preciseHitElement,
          clientX,
          clientY,
        );
        if (localContentElement) {
          const localContentResult = resolveValidElementAtPoint(
            localContentElement,
            clientX,
            clientY,
          );
          if (localContentResult) return localContentResult;
        }
        if (!positionCache.usesTextHitTesting) return positionCache.fallbackElement;
        return (
          resolveValidElementAtPoint(positionCache.preciseHitElement, clientX, clientY) ??
          getDeepFallbackElementAtPoint(clientX, clientY)
        );
      }
    }

    let result: Element | null = null;

    // elementFromPoint returns the topmost element, but if it's not grabbable
    // (e.g. a transparent overlay) or out of scope (e.g. an external element
    // overlapping the scoped container) we fall back to elementsFromPoint, which
    // returns the full z-ordered stack, and take the first grabbable in-scope one.
    const topElement = getDeepElementAtPoint(clientX, clientY);
    const usesTextHitTesting = topElement ? getElementTextBounds(topElement) !== null : false;
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
      preciseHitElement:
        topElement?.namespaceURI === "http://www.w3.org/2000/svg" ||
        localContentElement ||
        usesTextHitTesting
          ? topElement
          : null,
      usesTextHitTesting,
      timestamp: now,
    };
    return result;
  } finally {
    resumePointerEventsFreeze();
  }
};

export const clearElementPositionCache = (): void => {
  positionCache = null;
  inaccessibleIframePositionCache = null;
};
