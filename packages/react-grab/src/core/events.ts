import { grab } from "./state.js";
import {
  startHold,
  cancelHold,
  activate,
  deactivate,
  updatePointer,
  setHoveredElement,
  copy,
} from "./actions.js";
import { createEventListenerManager } from "./event-listener-manager.js";
import { createArrowNavigator } from "./arrow-navigation.js";
import { isKeyboardEventTriggeredByInput } from "../utils/is-keyboard-event-triggered-by-input.js";
import { isValidGrabbableElement } from "../utils/is-valid-grabbable-element.js";
import { createElementBounds } from "../utils/create-element-bounds.js";
import { getElementsInDrag } from "../utils/get-elements-in-drag.js";
import { ELEMENT_DETECTION_THROTTLE_MS } from "../constants.js";

interface EventBindingOptions {
  activationShortcut?: (event: KeyboardEvent) => boolean;
  allowActivationInsideInput?: boolean;
  onActivate?: () => void;
  onDeactivate?: () => void;
  onElementHover?: (element: Element) => void;
  onCopySuccess?: (elements: Element[], content: string) => void;
}

let eventManager: ReturnType<typeof createEventListenerManager> | null = null;
let lastElementDetectionTime = 0;
let currentOptions: EventBindingOptions = {};
let arrowNavigator: ReturnType<typeof createArrowNavigator> | null = null;

let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
const DRAG_THRESHOLD = 5;

const defaultActivationShortcut = (event: KeyboardEvent): boolean => {
  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const modifierPressed = isMac ? event.metaKey : event.ctrlKey;
  return modifierPressed && event.shiftKey;
};

const handleKeyDown = (event: KeyboardEvent) => {
  const state = grab();
  const opts = currentOptions;

  if (!opts.allowActivationInsideInput && isKeyboardEventTriggeredByInput(event)) {
    return;
  }

  const shortcutFn = opts.activationShortcut ?? defaultActivationShortcut;

  if (shortcutFn(event)) {
    event.preventDefault();
    event.stopPropagation();

    if (state.state === "idle") {
      startHold();
    }
    return;
  }

  if (state.state === "active") {
    if (event.key === "Escape") {
      event.preventDefault();
      isDragging = false;
      deactivate();
      opts.onDeactivate?.();
      return;
    }

    if (event.key === "ArrowUp" || event.key === "ArrowDown" || event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      const currentElement = state.lockedEl ?? state.hoveredEl;
      if (currentElement && arrowNavigator) {
        const nextElement = arrowNavigator.findNext(event.key, currentElement);
        if (nextElement) {
          setHoveredElement(nextElement);
          opts.onElementHover?.(nextElement);
        }
      }
      return;
    }

    if ((event.key === "c" || event.key === "C") && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void copy();
      return;
    }
  }
};

const handleKeyUp = () => {
  const state = grab();
  const opts = currentOptions;

  if (state.state === "holding") {
    cancelHold();
    activate({ x: 0, y: 0 });
    opts.onActivate?.();
  }
};

const handlePointerMove = (event: PointerEvent) => {
  const state = grab();
  const opts = currentOptions;

  if (state.state !== "active") return;

  if (isDragging) {
    return;
  }

  if (state.lockedEl) return;

  const now = Date.now();
  if (now - lastElementDetectionTime < ELEMENT_DETECTION_THROTTLE_MS) {
    return;
  }
  lastElementDetectionTime = now;

  const previousHoveredEl = state.hoveredEl;
  updatePointer(event.clientX, event.clientY);

  const newState = grab();
  if (newState.state === "active" && newState.hoveredEl !== previousHoveredEl && newState.hoveredEl) {
    opts.onElementHover?.(newState.hoveredEl);
  }
};

const handlePointerDown = (event: PointerEvent) => {
  const state = grab();

  if (state.state !== "active") return;
  if (event.button !== 0) return;

  dragStartX = event.clientX;
  dragStartY = event.clientY;
};

const handlePointerUp = (event: PointerEvent) => {
  const state = grab();

  if (state.state !== "active") return;

  const deltaX = Math.abs(event.clientX - dragStartX);
  const deltaY = Math.abs(event.clientY - dragStartY);
  const wasDragging = isDragging || (deltaX > DRAG_THRESHOLD || deltaY > DRAG_THRESHOLD);

  if (wasDragging && (deltaX > DRAG_THRESHOLD || deltaY > DRAG_THRESHOLD)) {
    const dragRect = {
      x: Math.min(dragStartX, event.clientX),
      y: Math.min(dragStartY, event.clientY),
      width: Math.abs(event.clientX - dragStartX),
      height: Math.abs(event.clientY - dragStartY),
    };

    const elementsInDrag = getElementsInDrag(dragRect, isValidGrabbableElement, true);

    if (elementsInDrag.length > 0) {
      void copy(elementsInDrag);
    }
  } else {
    const target = state.lockedEl ?? state.hoveredEl;
    if (target) {
      void copy();
    }
  }

  isDragging = false;
};

const handlePointerLeave = () => {
  const state = grab();

  if (state.state === "active" && !state.lockedEl && !isDragging) {
    updatePointer(-9999, -9999);
  }
};

const handleBlur = () => {
  const state = grab();

  if (state.state === "holding") {
    cancelHold();
  }
  isDragging = false;
};

const bindEventListeners = (options: EventBindingOptions = {}) => {
  if (eventManager) {
    eventManager.abort();
  }

  currentOptions = options;
  eventManager = createEventListenerManager();
  arrowNavigator = createArrowNavigator(isValidGrabbableElement, createElementBounds);
  isDragging = false;

  eventManager.addWindowListener("keydown", handleKeyDown, { capture: true });
  eventManager.addWindowListener("keyup", handleKeyUp, { capture: true });
  eventManager.addWindowListener("pointermove", handlePointerMove);
  eventManager.addWindowListener("pointerdown", handlePointerDown);
  eventManager.addWindowListener("pointerup", handlePointerUp);
  eventManager.addDocumentListener("pointerleave", handlePointerLeave);
  eventManager.addWindowListener("blur", handleBlur);
};

const unbindEventListeners = () => {
  if (eventManager) {
    eventManager.abort();
    eventManager = null;
  }
  arrowNavigator = null;
  currentOptions = {};
  isDragging = false;
};

export { bindEventListeners, unbindEventListeners };

export type { EventBindingOptions };
