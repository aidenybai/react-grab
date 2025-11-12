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

  const wrapInReferencedElement = (content: string) =>
    `\n\n<referenced_element>\n${content}\n</referenced_element>`;

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

  const handleSelectionClick = () => {
    if (state.isCopying) return;

    const targetElement = getElementAtPosition(state.mouseX, state.mouseY);
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
  };

  const activateOverlay = () => {
    if (!state.overlayRoot) {
      state.overlayRoot = mountRoot();
      state.selectionOverlay = createSelectionOverlay(
        state.overlayRoot,
        handleSelectionClick,
      );
      continuousRender();
    }
    handleRender();
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && state.isHoldingKeys) {
      state.isHoldingKeys = false;
      if (state.holdTimerId) window.clearTimeout(state.holdTimerId);
      return;
    }

    if (isKeyboardEventTriggeredByInput(event)) return;

    if (isTargetKeyCombination(event) && !state.isHoldingKeys) {
      state.isHoldingKeys = true;
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
    }
  };

  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
  window.addEventListener("mousemove", handleMouseMove);
  window.addEventListener("scroll", scheduleRender, true);
  window.addEventListener("resize", scheduleRender);
  document.addEventListener("visibilitychange", handleVisibilityChange);

  return () => {
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("keyup", handleKeyUp);
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("scroll", scheduleRender, true);
    window.removeEventListener("resize", scheduleRender);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    if (state.holdTimerId) window.clearTimeout(state.holdTimerId);
    if (state.renderFrameId) cancelAnimationFrame(state.renderFrameId);
    cleanupGrabbedIndicators();
    hideLabel();
  };
};
