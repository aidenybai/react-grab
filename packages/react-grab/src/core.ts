import { isKeyboardEventTriggeredByInput } from "./utils/is-keyboard-event-triggered-by-input.js";
import { mountRoot, ATTRIBUTE_NAME } from "./utils/mount-root.js";
import { isElementVisible } from "./utils/is-element-visible.js";
import {
  createSelectionOverlay,
  showLabel,
  hideLabel,
  cleanupGrabbedIndicators,
  createGrabbedOverlay,
  updateLabelToProcessing,
  createMarqueeOverlay,
  showProgressIndicator,
  hideProgressIndicator,
} from "./overlay.js";
import { getHTMLSnippet, getSourceTrace } from "./instrumentation.js";
import { copyContent } from "./utils/copy-content.js";

interface Options {
  enabled?: boolean;
  keyHoldDuration?: number;
  onActivate?: () => void;
}

interface CoreState {
  holdTimerId: number | null;
  isHoldingKeys: boolean;
  overlayRoot: HTMLElement | null;
  selectionOverlay: ReturnType<typeof createSelectionOverlay> | null;
  renderFrameId: number | null;
  isCopying: boolean;
  lastGrabbedElement: Element | null;
  mouseX: number;
  mouseY: number;
  isDragging: boolean;
  dragStartX: number;
  dragStartY: number;
  marqueeOverlay: ReturnType<typeof createMarqueeOverlay> | null;
  selectedElements: Element[];
  progressStartTime: number | null;
  progressAnimationId: number | null;
}

export const init = (rawOptions?: Options) => {
  const options = {
    enabled: true,
    keyHoldDuration: 500,
    ...rawOptions,
  };
  if (options.enabled === false) {
    return;
  }

  const state: CoreState = {
    holdTimerId: null,
    isHoldingKeys: false,
    overlayRoot: null,
    selectionOverlay: null,
    renderFrameId: null,
    isCopying: false,
    lastGrabbedElement: null,
    mouseX: -1000,
    mouseY: -1000,
    isDragging: false,
    dragStartX: -1000,
    dragStartY: -1000,
    marqueeOverlay: null,
    selectedElements: [],
    progressStartTime: null,
    progressAnimationId: null,
  };

  const isOverlayActive = () => state.isHoldingKeys && !state.isCopying;

  const isTargetKeyCombination = (event: KeyboardEvent) =>
    (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "c";

  const getElementAtPosition = (x: number, y: number): Element | null => {
    const elementsAtPoint = document.elementsFromPoint(x, y);

    for (const candidateElement of elementsAtPoint) {
      if (candidateElement.closest(`[${ATTRIBUTE_NAME}]`)) {
        continue;
      }

      const computedStyle = window.getComputedStyle(candidateElement);
      if (!isElementVisible(candidateElement, computedStyle)) {
        continue;
      }

      return candidateElement;
    }

    return null;
  };

  const getElementsInMarquee = (marqueeRect: { x: number; y: number; width: number; height: number }): Element[] => {
    const elements: Element[] = [];
    const allElements = Array.from(document.querySelectorAll("*"));

    const marqueeLeft = marqueeRect.x;
    const marqueeTop = marqueeRect.y;
    const marqueeRight = marqueeRect.x + marqueeRect.width;
    const marqueeBottom = marqueeRect.y + marqueeRect.height;

    for (const candidateElement of allElements) {
      if (candidateElement.closest(`[${ATTRIBUTE_NAME}]`)) {
        continue;
      }

      const computedStyle = window.getComputedStyle(candidateElement);
      if (!isElementVisible(candidateElement, computedStyle)) {
        continue;
      }

      const rect = candidateElement.getBoundingClientRect();
      const elementLeft = rect.left;
      const elementTop = rect.top;
      const elementRight = rect.left + rect.width;
      const elementBottom = rect.top + rect.height;

      const intersects =
        elementLeft < marqueeRight &&
        elementRight > marqueeLeft &&
        elementTop < marqueeBottom &&
        elementBottom > marqueeTop;

      if (intersects) {
        elements.push(candidateElement);
      }
    }

    return elements;
  };

  const wrapInReferencedElement = (content: string) =>
    `\n\n<referenced_element>\n${content}\n</referenced_element>`;

  const wrapInReferencedElements = (content: string) =>
    `\n\n<referenced_elements>\n${content}\n</referenced_elements>`;

  const handleCopy = async (targetElement: Element) => {
    const tagName = (targetElement.tagName || "").toLowerCase();
    const elementBounds = targetElement.getBoundingClientRect();
    const showSuccessIndicator = updateLabelToProcessing(
      state.overlayRoot!,
      elementBounds.left,
      elementBounds.top,
    );

    try {
      const elementHtml = getHTMLSnippet(targetElement);
      await copyContent(wrapInReferencedElement(elementHtml));

      const componentStackTrace = await getSourceTrace(targetElement);
      if (componentStackTrace?.length) {
        const formattedStackTrace = componentStackTrace
          .map(
            (source) =>
              ` ${source.functionName} - ${source.fileName}:${source.lineNumber}:${source.columnNumber}`,
          )
          .join("\n");
        await copyContent(
          wrapInReferencedElement(
            `${elementHtml}\n\nComponent owner stack:\n${formattedStackTrace}`,
          ),
        );
      }

      showSuccessIndicator(tagName);
    } catch {
      showSuccessIndicator(tagName);
    }
  };

  const handleMultipleCopy = async (targetElements: Element[]) => {
    if (targetElements.length === 0) return;

    const showSuccessIndicator = updateLabelToProcessing(
      state.overlayRoot!,
    );

    try {
      const elementSnippets: string[] = [];

      for (const element of targetElements) {
        const elementHtml = getHTMLSnippet(element);
        const componentStackTrace = await getSourceTrace(element);

        if (componentStackTrace?.length) {
          const formattedStackTrace = componentStackTrace
            .map(
              (source) =>
                ` ${source.functionName} - ${source.fileName}:${source.lineNumber}:${source.columnNumber}`,
            )
            .join("\n");
          elementSnippets.push(
            `${elementHtml}\n\nComponent owner stack:\n${formattedStackTrace}`,
          );
        } else {
          elementSnippets.push(elementHtml);
        }
      }

      const combinedContent = elementSnippets.join("\n\n---\n\n");
      await copyContent(wrapInReferencedElements(combinedContent));

      showSuccessIndicator(`${targetElements.length} elements`);
    } catch {
      showSuccessIndicator(`${targetElements.length} elements`);
    }
  };

  const hideOverlayAndLabel = () => {
    state.selectionOverlay?.hide();
    if (!state.isCopying) hideLabel();
  };

  const handleRender = () => {
    if (!isOverlayActive()) {
      hideOverlayAndLabel();
      state.lastGrabbedElement = null;
      return;
    }

    if (state.isDragging) {
      state.selectionOverlay?.hide();
      hideLabel();

      const marqueeX = Math.min(state.dragStartX, state.mouseX);
      const marqueeY = Math.min(state.dragStartY, state.mouseY);
      const marqueeWidth = Math.abs(state.mouseX - state.dragStartX);
      const marqueeHeight = Math.abs(state.mouseY - state.dragStartY);

      state.marqueeOverlay?.update({
        x: marqueeX,
        y: marqueeY,
        width: marqueeWidth,
        height: marqueeHeight,
      });

      return;
    }

    const targetElement = getElementAtPosition(state.mouseX, state.mouseY);

    if (!targetElement) {
      hideOverlayAndLabel();
      return;
    }

    if (state.lastGrabbedElement) {
      if (targetElement !== state.lastGrabbedElement) {
        state.lastGrabbedElement = null;
      } else {
        hideOverlayAndLabel();
        return;
      }
    }

    const elementBounds = targetElement.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(targetElement);

    state.selectionOverlay?.update({
      borderRadius: computedStyle.borderRadius || "0px",
      height: elementBounds.height,
      transform: computedStyle.transform || "none",
      width: elementBounds.width,
      x: elementBounds.left,
      y: elementBounds.top,
    });

    if (!state.selectionOverlay?.isVisible()) state.selectionOverlay?.show();

    showLabel(
      state.overlayRoot!,
      elementBounds.left,
      elementBounds.top,
      (targetElement.tagName || "").toLowerCase(),
    );
  };

  const scheduleRender = () => {
    if (state.renderFrameId !== null) return;
    state.renderFrameId = requestAnimationFrame(() => {
      state.renderFrameId = null;
      handleRender();
    });
  };

  const continuousRender = () => {
    scheduleRender();
    requestAnimationFrame(continuousRender);
  };

  const handleMouseMove = (event: MouseEvent) => {
    state.mouseX = event.clientX;
    state.mouseY = event.clientY;
    scheduleRender();
  };

  const handleVisibilityChange = () => {
    if (document.hidden) {
      cleanupGrabbedIndicators();
      hideLabel();
    }
  };

  const handleMouseDown = (event: MouseEvent) => {
    if (!isOverlayActive() || state.isCopying) return;

    state.isDragging = true;
    state.dragStartX = event.clientX;
    state.dragStartY = event.clientY;
    state.selectedElements = [];

    if (!state.marqueeOverlay) {
      state.marqueeOverlay = createMarqueeOverlay(state.overlayRoot!);
    }
    state.marqueeOverlay.show();
  };

  const handleMouseUp = (event: MouseEvent) => {
    if (!state.isDragging) return;

    const dragDistanceX = Math.abs(event.clientX - state.dragStartX);
    const dragDistanceY = Math.abs(event.clientY - state.dragStartY);
    const DRAG_THRESHOLD = 5;

    const wasDrag = dragDistanceX > DRAG_THRESHOLD || dragDistanceY > DRAG_THRESHOLD;

    state.isDragging = false;
    state.marqueeOverlay?.hide();

    if (wasDrag) {
      const marqueeX = Math.min(state.dragStartX, event.clientX);
      const marqueeY = Math.min(state.dragStartY, event.clientY);
      const marqueeWidth = Math.abs(event.clientX - state.dragStartX);
      const marqueeHeight = Math.abs(event.clientY - state.dragStartY);

      const elements = getElementsInMarquee({
        x: marqueeX,
        y: marqueeY,
        width: marqueeWidth,
        height: marqueeHeight,
      });

      if (elements.length > 0) {
        state.isCopying = true;

        for (const element of elements) {
          const computedStyle = window.getComputedStyle(element);
          const elementBounds = element.getBoundingClientRect();

          createGrabbedOverlay(state.overlayRoot!, {
            borderRadius: computedStyle.borderRadius || "0px",
            height: elementBounds.height,
            transform: computedStyle.transform || "none",
            width: elementBounds.width,
            x: elementBounds.left,
            y: elementBounds.top,
          });
        }

        void handleMultipleCopy(elements).finally(() => {
          state.isCopying = false;
        });
      }
    } else {
      const targetElement = getElementAtPosition(event.clientX, event.clientY);
      if (!targetElement) return;

      state.isCopying = true;
      state.lastGrabbedElement = targetElement;
      const computedStyle = window.getComputedStyle(targetElement);
      const elementBounds = targetElement.getBoundingClientRect();

      createGrabbedOverlay(state.overlayRoot!, {
        borderRadius: computedStyle.borderRadius || "0px",
        height: elementBounds.height,
        transform: computedStyle.transform || "none",
        width: elementBounds.width,
        x: elementBounds.left,
        y: elementBounds.top,
      });

      void handleCopy(targetElement).finally(() => {
        state.isCopying = false;
      });
    }
  };

  const startProgressAnimation = () => {
    if (!state.overlayRoot) {
      state.overlayRoot = mountRoot();
    }

    state.progressStartTime = Date.now();

    const animateProgress = () => {
      if (state.progressStartTime === null) return;

      const elapsed = Date.now() - state.progressStartTime;
      const progress = Math.min(elapsed / options.keyHoldDuration, 1);

      showProgressIndicator(state.overlayRoot!, progress, state.mouseX, state.mouseY);

      if (progress < 1) {
        state.progressAnimationId = requestAnimationFrame(animateProgress);
      }
    };

    animateProgress();
  };

  const stopProgressAnimation = () => {
    if (state.progressAnimationId !== null) {
      cancelAnimationFrame(state.progressAnimationId);
      state.progressAnimationId = null;
    }
    state.progressStartTime = null;
    hideProgressIndicator();
  };

  const activateOverlay = () => {
    stopProgressAnimation();

    if (!state.overlayRoot) {
      state.overlayRoot = mountRoot();
    }

    if (!state.selectionOverlay) {
      state.selectionOverlay = createSelectionOverlay(state.overlayRoot);
    }

    if (!state.marqueeOverlay) {
      state.marqueeOverlay = createMarqueeOverlay(state.overlayRoot);
    }

    if (state.renderFrameId === null) {
      continuousRender();
    }

    handleRender();
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && state.isHoldingKeys) {
      state.isHoldingKeys = false;
      if (state.holdTimerId) window.clearTimeout(state.holdTimerId);
      stopProgressAnimation();
      return;
    }

    if (isKeyboardEventTriggeredByInput(event)) return;

    if (isTargetKeyCombination(event) && !state.isHoldingKeys) {
      state.isHoldingKeys = true;
      startProgressAnimation();
      state.holdTimerId = window.setTimeout(() => {
        activateOverlay();
        options.onActivate?.();
      }, options.keyHoldDuration);
    }
  };

  const handleKeyUp = (event: KeyboardEvent) => {
    if (
      state.isHoldingKeys &&
      (!isTargetKeyCombination(event) || event.key.toLowerCase() === "c")
    ) {
      state.isHoldingKeys = false;
      if (state.holdTimerId) window.clearTimeout(state.holdTimerId);
      stopProgressAnimation();
    }
  };

  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
  window.addEventListener("mousemove", handleMouseMove);
  window.addEventListener("mousedown", handleMouseDown);
  window.addEventListener("mouseup", handleMouseUp);
  window.addEventListener("scroll", scheduleRender, true);
  window.addEventListener("resize", scheduleRender);
  document.addEventListener("visibilitychange", handleVisibilityChange);

  return () => {
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("keyup", handleKeyUp);
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mousedown", handleMouseDown);
    window.removeEventListener("mouseup", handleMouseUp);
    window.removeEventListener("scroll", scheduleRender, true);
    window.removeEventListener("resize", scheduleRender);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    if (state.holdTimerId) window.clearTimeout(state.holdTimerId);
    if (state.renderFrameId) cancelAnimationFrame(state.renderFrameId);
    stopProgressAnimation();
    cleanupGrabbedIndicators();
    hideLabel();
  };
};
