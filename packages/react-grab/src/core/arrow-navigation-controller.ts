import { type Accessor, createMemo, createSignal } from "solid-js";
import { ARROW_KEYS } from "../constants.js";
import { createArrowNavigator } from "./arrow-navigation.js";
import { createElementBounds } from "../utils/create-element-bounds.js";
import { getBoundsCenter } from "../utils/get-bounds-center.js";
import { getComponentDisplayName } from "./context.js";
import { getElementAtPosition, getElementsAtPoint } from "../utils/get-element-at-position.js";
import { getTagName } from "../utils/get-tag-name.js";
import { getVisibleBoundsCenter } from "../utils/get-visible-bounds-center.js";
import { isValidGrabbableElement } from "../utils/is-valid-grabbable-element.js";
import type { ArrowNavigationState } from "../types.js";
import type { createGrabStore } from "./store.js";
import type { GrabPhaseSelectors } from "./selectors.js";

type GrabStoreHandle = ReturnType<typeof createGrabStore>;

interface ArrowNavigationInput {
  grab: GrabStoreHandle;
  phase: GrabPhaseSelectors;
  /** Live element currently focused/selected by the overlay. */
  effectiveElement: Accessor<Element | null>;
  /** Whether shift-multi-select is in progress; arrow nav is suppressed in that mode. */
  isShiftMultiSelecting: Accessor<boolean>;
  /** Setter for the shared `keyboardSelectedElement` flag in init(). */
  setKeyboardSelectedElement: (element: Element | null) => void;
}

export interface ArrowNavigationController {
  /** Reactive arrow-navigation state passed to the renderer. */
  state: Accessor<ArrowNavigationState>;
  /**
   * Handle an arrow keydown. Returns true if the event was consumed.
   * Caller still owns calling preventDefault/stopPropagation on the handled path.
   */
  handleArrowNavigation: (event: KeyboardEvent) => boolean;
  /** Click a menu item by index. */
  handleArrowNavigationSelect: (index: number) => void;
  /** Reset menu state and the underlying navigator history. */
  clearArrowNavigation: () => void;
}

/**
 * Owns the arrow-key element navigation: tracks the active candidate list,
 * the active index, and the underlying spatial navigator. The controller is
 * intentionally stateless about which element is "selected" — it pushes the
 * choice back into the grab store via actions and notifies the caller via
 * `setKeyboardSelectedElement` so the click handler can use it as a fallback.
 */
export const createArrowNavigationController = (
  input: ArrowNavigationInput,
): ArrowNavigationController => {
  const { grab, phase, effectiveElement, isShiftMultiSelecting, setKeyboardSelectedElement } =
    input;
  const { store, actions } = grab;
  const { isActivated, isPromptMode } = phase;

  const [arrowNavigationElements, setArrowNavigationElements] = createSignal<Element[]>([]);
  const [arrowNavigationActiveIndex, setArrowNavigationActiveIndex] = createSignal(0);

  const arrowNavigator = createArrowNavigator(isValidGrabbableElement, createElementBounds);

  const clearArrowNavigation = () => {
    setArrowNavigationElements([]);
    setArrowNavigationActiveIndex(0);
    arrowNavigator.clearHistory();
  };

  const selectAndFocusElement = (element: Element) => {
    actions.setFrozenElement(element);
    actions.freeze();
    setKeyboardSelectedElement(element);

    const center = getBoundsCenter(createElementBounds(element));
    actions.setPointer(center);

    if (store.contextMenuPosition !== null) {
      actions.showContextMenu(center, element);
    }
  };

  const openArrowNavigationMenu = (anchorElement: Element) => {
    const bounds = createElementBounds(anchorElement);
    const probePoint = getVisibleBoundsCenter(bounds);
    const elementsAtPoint = getElementsAtPoint(probePoint.x, probePoint.y)
      .filter(isValidGrabbableElement)
      .reverse();

    setArrowNavigationElements(elementsAtPoint);
    setArrowNavigationActiveIndex(Math.max(0, elementsAtPoint.indexOf(anchorElement)));
  };

  const handleArrowNavigationSelect = (index: number) => {
    const targetElement = arrowNavigationElements()[index];
    if (!targetElement) return;

    setArrowNavigationActiveIndex(index);
    arrowNavigator.clearHistory();
    selectAndFocusElement(targetElement);
  };

  const handleArrowNavigation = (event: KeyboardEvent): boolean => {
    if (!isActivated() || isPromptMode()) return false;
    if (isShiftMultiSelecting()) return false;
    if (!ARROW_KEYS.has(event.key)) return false;
    // While the context menu is open, arrow keys belong to its own
    // roving-tabindex navigation. Both listeners fire for the same
    // event (both window+capture), so without bowing out here arrow
    // keys also re-select a different page element and reposition
    // the menu over it.
    if (store.contextMenuPosition !== null) return false;

    let currentElement = effectiveElement();
    const isInitialSelection = !currentElement;

    if (!currentElement) {
      currentElement = getElementAtPosition(window.innerWidth / 2, window.innerHeight / 2);
    }

    if (!currentElement) return false;

    const isVertical = event.key === "ArrowUp" || event.key === "ArrowDown";

    if (!isVertical) {
      clearArrowNavigation();
      const nextElement = arrowNavigator.findNext(event.key, currentElement);
      if (!nextElement && !isInitialSelection) return false;
      event.preventDefault();
      event.stopPropagation();
      selectAndFocusElement(nextElement ?? currentElement);
      return true;
    }

    if (arrowNavigationElements().length === 0) {
      openArrowNavigationMenu(currentElement);
    }

    const nextElement = arrowNavigator.findNext(event.key, currentElement);
    const elementToSelect = nextElement ?? currentElement;

    event.preventDefault();
    event.stopPropagation();
    selectAndFocusElement(elementToSelect);

    const newIndex = arrowNavigationElements().indexOf(elementToSelect);
    if (newIndex !== -1) {
      setArrowNavigationActiveIndex(newIndex);
    } else {
      openArrowNavigationMenu(elementToSelect);
    }

    return true;
  };

  const arrowNavigationItems = createMemo(() =>
    arrowNavigationElements().map((element) => ({
      tagName: getTagName(element) || "element",
      componentName: getComponentDisplayName(element) ?? undefined,
    })),
  );

  const state = createMemo<ArrowNavigationState>(() => ({
    items: arrowNavigationItems(),
    activeIndex: arrowNavigationActiveIndex(),
    isVisible: arrowNavigationElements().length > 0,
  }));

  return {
    state,
    handleArrowNavigation,
    handleArrowNavigationSelect,
    clearArrowNavigation,
  };
};
