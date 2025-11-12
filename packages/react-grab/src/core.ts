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

export const init = (rawOptions?: Options) => {
  const options = {
    enabled: true,
    keyHoldDuration: 500,
    ...rawOptions,
  };
  if (options.enabled === false) {
    return;
  }

  let holdTimer: null | number = null;
  let isHoldingKeys = false;
  let overlayRoot: HTMLElement | null = null;
  let selectionOverlay: ReturnType<typeof createSelectionOverlay> | null = null;
  let renderFrameId: number | null = null;
  let isActive = false;
  let isCopying = false;
  let hoveredElement: Element | null = null;
  let lastGrabbedElement: Element | null = null;
  let mouseX = -1000;
  let mouseY = -1000;

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
      overlayRoot!,
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
    selectionOverlay?.hide();
    if (!isCopying) hideLabel();
  };

  const handleRender = () => {
    if (!isActive) {
      hideOverlayAndLabel();
      hoveredElement = null;
      lastGrabbedElement = null;
      return;
    }

    if (isCopying) return;

    const targetElement = getElementAtPosition(mouseX, mouseY);

    if (!targetElement) {
      hideOverlayAndLabel();
      hoveredElement = null;
      return;
    }

    if (lastGrabbedElement) {
      if (targetElement !== lastGrabbedElement) {
        lastGrabbedElement = null;
      } else {
        hideOverlayAndLabel();
        hoveredElement = targetElement;
        return;
      }
    }

    hoveredElement = targetElement;
    const elementBounds = targetElement.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(targetElement);

    selectionOverlay?.update({
      borderRadius: computedStyle.borderRadius || "0px",
      height: elementBounds.height,
      transform: computedStyle.transform || "none",
      width: elementBounds.width,
      x: elementBounds.left,
      y: elementBounds.top,
    });

    if (!selectionOverlay?.isVisible()) selectionOverlay?.show();

    showLabel(
      overlayRoot!,
      elementBounds.left,
      elementBounds.top,
      (targetElement.tagName || "").toLowerCase(),
    );
  };

  const scheduleRender = () => {
    if (renderFrameId !== null) return;
    renderFrameId = requestAnimationFrame(() => {
      renderFrameId = null;
      handleRender();
    });
  };

  const continuousRender = () => {
    scheduleRender();
    requestAnimationFrame(continuousRender);
  };

  const handleMouseMove = (event: MouseEvent) => {
    mouseX = event.clientX;
    mouseY = event.clientY;
    scheduleRender();
  };

  const handleVisibilityChange = () => {
    if (document.hidden) {
      cleanupGrabbedIndicators();
      hideLabel();
    }
  };

  const handleSelectionClick = () => {
    if (!hoveredElement || isCopying) return;

    isCopying = true;
    lastGrabbedElement = hoveredElement;
    const targetElement = hoveredElement;
    const computedStyle = window.getComputedStyle(targetElement);
    const elementBounds = targetElement.getBoundingClientRect();

    createGrabbedOverlay(overlayRoot!, {
      borderRadius: computedStyle.borderRadius || "0px",
      height: elementBounds.height,
      transform: computedStyle.transform || "none",
      width: elementBounds.width,
      x: elementBounds.left,
      y: elementBounds.top,
    });

    void handleCopy(targetElement).finally(() => {
      isCopying = false;
      isActive = isHoldingKeys;
    });
  };

  const activateOverlay = () => {
    if (!overlayRoot) {
      overlayRoot = mountRoot();
      selectionOverlay = createSelectionOverlay(
        overlayRoot,
        handleSelectionClick,
      );
      continuousRender();
    }
    isActive = true;
    handleRender();
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && isHoldingKeys) {
      isHoldingKeys = false;
      if (holdTimer) window.clearTimeout(holdTimer);
      isActive = false;
      return;
    }

    if (isKeyboardEventTriggeredByInput(event)) return;

    if (isTargetKeyCombination(event) && !isHoldingKeys) {
      isHoldingKeys = true;
      holdTimer = window.setTimeout(() => {
        activateOverlay();
        options.onActivate?.();
      }, options.keyHoldDuration);
    }
  };

  const handleKeyUp = (event: KeyboardEvent) => {
    if (
      isHoldingKeys &&
      (!isTargetKeyCombination(event) || event.key.toLowerCase() === "c")
    ) {
      isHoldingKeys = false;
      if (holdTimer) window.clearTimeout(holdTimer);
      isActive = false;
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
    if (holdTimer) window.clearTimeout(holdTimer);
    if (renderFrameId) cancelAnimationFrame(renderFrameId);
    cleanupGrabbedIndicators();
    hideLabel();
  };
};
