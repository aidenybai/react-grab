import {
  createSignal,
  createMemo,
  createRoot,
  onCleanup,
  createEffect,
  on,
} from "solid-js";
import { render } from "solid-js/web";
import { isKeyboardEventTriggeredByInput } from "./utils/is-keyboard-event-triggered-by-input.js";
import { mountRoot } from "./utils/mount-root.js";
import { ReactGrabRenderer } from "./components/renderer.js";
import { getHTMLSnippet } from "./instrumentation.js";
import {
  getFiberFromHostInstance,
  getDisplayName,
  isCompositeFiber,
  traverseFiber,
} from "bippy";
import { copyContent } from "./utils/copy-content.js";
import { playCopySound } from "./utils/play-copy-sound.js";
import { getElementAtPosition } from "./utils/get-element-at-position.js";
import { isValidGrabbableElement } from "./utils/is-valid-grabbable-element.js";
import {
  getElementsInDrag,
  getElementsInDragLoose,
} from "./utils/get-elements-in-drag.js";
import { createElementBounds } from "./utils/create-element-bounds.js";
import { SUCCESS_LABEL_DURATION_MS } from "./constants.js";
import { isCapitalized } from "./utils/is-capitalized.js";
import { isLocalhost } from "./utils/is-localhost.js";
import { elementToMarkdown } from "./utils/html-to-markdown.js";
import type {
  Options,
  OverlayBounds,
  GrabbedBox,
  ReactGrabAPI,
} from "./types.js";

declare global {
  interface Window {
    __REACT_GRAB_EXTENSION_ACTIVE__?: boolean;
  }
}

const PROGRESS_INDICATOR_DELAY_MS = 150;

export const init = (rawOptions?: Options): ReactGrabAPI => {
  const options = {
    enabled: true,
    keyHoldDuration: 300,
    allowActivationInsideInput: true,
    playCopySound: false,
    ...rawOptions,
  };

  if (options.enabled === false) {
    return {
      activate: () => {},
      deactivate: () => {},
      toggle: () => {},
      isActive: () => false,
      dispose: () => {},
    };
  }

  return createRoot((dispose) => {
    const OFFSCREEN_POSITION = -1000;

    const [isHoldingKeys, setIsHoldingKeys] = createSignal(false);
    const [mouseX, setMouseX] = createSignal(OFFSCREEN_POSITION);
    const [mouseY, setMouseY] = createSignal(OFFSCREEN_POSITION);
    const [isDragging, setIsDragging] = createSignal(false);
    const [dragStartX, setDragStartX] = createSignal(OFFSCREEN_POSITION);
    const [dragStartY, setDragStartY] = createSignal(OFFSCREEN_POSITION);
    const [isCopying, setIsCopying] = createSignal(false);
    const [lastGrabbedElement, setLastGrabbedElement] =
      createSignal<Element | null>(null);
    const [progressStartTime, setProgressStartTime] = createSignal<
      number | null
    >(null);
    const [progressTick, setProgressTick] = createSignal(0);
    const [grabbedBoxes, setGrabbedBoxes] = createSignal<GrabbedBox[]>([]);
    const [successLabels, setSuccessLabels] = createSignal<
      Array<{ id: string; text: string }>
    >([]);
    const [isActivated, setIsActivated] = createSignal(false);
    const [showProgressIndicator, setShowProgressIndicator] =
      createSignal(false);
    const [didJustDrag, setDidJustDrag] = createSignal(false);
    const [copyStartX, setCopyStartX] = createSignal(OFFSCREEN_POSITION);
    const [copyStartY, setCopyStartY] = createSignal(OFFSCREEN_POSITION);
    const [mouseHasSettled, setMouseHasSettled] = createSignal(false);

    let holdTimerId: number | null = null;
    let progressAnimationId: number | null = null;
    let progressDelayTimerId: number | null = null;
    let keydownSpamTimerId: number | null = null;
    let mouseSettleTimerId: number | null = null;
    let referenceMouseX = OFFSCREEN_POSITION;
    let referenceMouseY = OFFSCREEN_POSITION;

    const isRendererActive = createMemo(() => isActivated() && !isCopying());

    const hasValidMousePosition = createMemo(
      () => mouseX() > OFFSCREEN_POSITION && mouseY() > OFFSCREEN_POSITION,
    );

    const isTargetKeyCombination = (event: KeyboardEvent) =>
      (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "c";

    const showTemporaryGrabbedBox = (bounds: OverlayBounds) => {
      const boxId = `grabbed-${Date.now()}-${Math.random()}`;
      const createdAt = Date.now();
      const newBox: GrabbedBox = { id: boxId, bounds, createdAt };
      const currentBoxes: GrabbedBox[] = grabbedBoxes();
      setGrabbedBoxes([...currentBoxes, newBox]);

      setTimeout(() => {
        setGrabbedBoxes((previousBoxes) =>
          previousBoxes.filter((box) => box.id !== boxId),
        );
      }, SUCCESS_LABEL_DURATION_MS);
    };

    const showTemporarySuccessLabel = (text: string) => {
      const labelId = `success-${Date.now()}-${Math.random()}`;
      setSuccessLabels((previousLabels) => [
        ...previousLabels,
        { id: labelId, text },
      ]);

      setTimeout(() => {
        setSuccessLabels((previousLabels) =>
          previousLabels.filter((label) => label.id !== labelId),
        );
      }, SUCCESS_LABEL_DURATION_MS);
    };

    const wrapInSelectedElementTags = (context: string) =>
      `<selected_element>\n${context}\n</selected_element>`;

    const extractRelevantComputedStyles = (element: Element) => {
      const computed = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        width: `${Math.round(rect.width)}px`,
        height: `${Math.round(rect.height)}px`,
        paddingTop: computed.paddingTop,
        paddingRight: computed.paddingRight,
        paddingBottom: computed.paddingBottom,
        paddingLeft: computed.paddingLeft,
        background: computed.background,
        opacity: computed.opacity,
      };
    };

    const createStructuredClipboardHtmlBlob = (
      elements: Array<{
        tagName: string;
        content: string;
        computedStyles: ReturnType<typeof extractRelevantComputedStyles>;
      }>,
    ) => {
      const structuredData = {
        elements: elements.map((element) => ({
          tagName: element.tagName,
          content: element.content,
          computedStyles: element.computedStyles,
        })),
      };

      const jsonString = JSON.stringify(structuredData);
      const base64Data = btoa(
        encodeURIComponent(jsonString).replace(
          /%([0-9A-F]{2})/g,
          (_match, p1: string) => String.fromCharCode(parseInt(p1, 16)),
        ),
      );
      const htmlContent = `<div data-react-grab="${base64Data}"></div>`;

      return new Blob([htmlContent], { type: "text/html" });
    };

    const extractElementTagName = (element: Element) =>
      (element.tagName || "").toLowerCase();

    const extractNearestComponentName = (element: Element): string | null => {
      const fiber = getFiberFromHostInstance(element);
      if (!fiber) return null;

      let componentName: string | null = null;
      traverseFiber(
        fiber,
        (currentFiber) => {
          if (isCompositeFiber(currentFiber)) {
            const displayName = getDisplayName(currentFiber);
            if (
              displayName &&
              isCapitalized(displayName) &&
              !displayName.startsWith("_")
            ) {
              componentName = displayName;
              return true;
            }
          }
          return false;
        },
        true,
      );

      return componentName;
    };

    const extractElementLabelText = (element: Element) => {
      const tagName = extractElementTagName(element);
      const componentName = extractNearestComponentName(element);

      if (tagName && componentName) {
        return `<${tagName}> in ${componentName}`;
      }

      if (tagName) {
        return `<${tagName}>`;
      }

      return "<element>";
    };

    const notifyElementsSelected = (elements: Element[]) => {
      try {
        const elementsPayload = elements.map((element) => ({
          tagName: extractElementTagName(element),
        }));

        window.dispatchEvent(
          new CustomEvent("react-grab:element-selected", {
            detail: {
              elements: elementsPayload,
            },
          }),
        );
      } catch {}
    };

    const isExtensionEnvironment = () =>
      window.__REACT_GRAB_EXTENSION_ACTIVE__ === true ||
      options.isExtension === true;

    const isExtensionTextOnlyMode = () =>
      isExtensionEnvironment() && !isLocalhost();

    const executeCopyOperation = async (
      positionX: number,
      positionY: number,
      operation: () => Promise<void>,
    ) => {
      setCopyStartX(positionX);
      setCopyStartY(positionY);
      setIsCopying(true);
      startProgressAnimation();
      await operation().finally(() => {
        setIsCopying(false);
        stopProgressAnimation();
      });
    };

    const hasInnerText = (
      element: Element,
    ): element is Element & { innerText: string } => "innerText" in element;

    const extractElementTextContent = (element: Element): string => {
      if (hasInnerText(element)) {
        return element.innerText;
      }

      return element.textContent ?? "";
    };

    const createCombinedTextContent = (elements: Element[]): string =>
      elements
        .map((element) => extractElementTextContent(element).trim())
        .filter((textContent) => textContent.length > 0)
        .join("\n\n");

    const createCombinedMarkdownContent = (elements: Element[]): string =>
      elements
        .map((element) => elementToMarkdown(element).trim())
        .filter((markdownContent) => markdownContent.length > 0)
        .join("\n\n");

    const copySingleElementToClipboard = async (targetElement: Element) => {
      showTemporaryGrabbedBox(createElementBounds(targetElement));

      await new Promise((resolve) => requestAnimationFrame(resolve));

      let didCopy = false;

      try {
        if (isExtensionTextOnlyMode()) {
          const markdownContent = createCombinedMarkdownContent([targetElement]);

          if (markdownContent.length > 0) {
            didCopy = await copyContent(
              markdownContent,
              options.playCopySound ? playCopySound : undefined,
            );
          }
        } else {
          const content = await getHTMLSnippet(targetElement);
          const plainTextContent = wrapInSelectedElementTags(content);
          const htmlContent = createStructuredClipboardHtmlBlob([
            {
              tagName: extractElementTagName(targetElement),
              content,
              computedStyles: extractRelevantComputedStyles(targetElement),
            },
          ]);

          didCopy = await copyContent(
            [plainTextContent, htmlContent],
            options.playCopySound ? playCopySound : undefined,
          );

          if (!didCopy) {
            const plainTextContentOnly = createCombinedTextContent([
              targetElement,
            ]);
            if (plainTextContentOnly.length > 0) {
              didCopy = await copyContent(
                plainTextContentOnly,
                options.playCopySound ? playCopySound : undefined,
              );
            }
          }
        }
      } catch {
        const plainTextContentOnly = createCombinedTextContent([targetElement]);
        if (plainTextContentOnly.length > 0) {
          didCopy = await copyContent(
            plainTextContentOnly,
            options.playCopySound ? playCopySound : undefined,
          );
        }
      }

      if (didCopy) {
        showTemporarySuccessLabel(extractElementLabelText(targetElement));
      }

      notifyElementsSelected([targetElement]);
    };

    const copyMultipleElementsToClipboard = async (
      targetElements: Element[],
    ) => {
      if (targetElements.length === 0) return;

      for (const element of targetElements) {
        showTemporaryGrabbedBox(createElementBounds(element));
      }

      await new Promise((resolve) => requestAnimationFrame(resolve));

      let didCopy = false;

      try {
        if (isExtensionTextOnlyMode()) {
          const markdownContent = createCombinedMarkdownContent(targetElements);

          if (markdownContent.length > 0) {
            didCopy = await copyContent(
              markdownContent,
              options.playCopySound ? playCopySound : undefined,
            );
          }
        } else {
          const elementSnippetResults = await Promise.allSettled(
            targetElements.map((element) => getHTMLSnippet(element)),
          );

          const elementSnippets = elementSnippetResults
            .map((result) =>
              result.status === "fulfilled" ? result.value : "",
            )
            .filter((snippet) => snippet.trim());

          if (elementSnippets.length > 0) {
            const plainTextContent = elementSnippets
              .map((snippet) => wrapInSelectedElementTags(snippet))
              .join("\n\n");

            const structuredElements = elementSnippets.map(
              (content, elementIndex) => ({
                tagName: extractElementTagName(targetElements[elementIndex]),
                content,
                computedStyles: extractRelevantComputedStyles(
                  targetElements[elementIndex],
                ),
              }),
            );
            const htmlContent =
              createStructuredClipboardHtmlBlob(structuredElements);

            didCopy = await copyContent(
              [plainTextContent, htmlContent],
              options.playCopySound ? playCopySound : undefined,
            );

            if (!didCopy) {
              const plainTextContentOnly =
                createCombinedTextContent(targetElements);
              if (plainTextContentOnly.length > 0) {
                didCopy = await copyContent(
                  plainTextContentOnly,
                  options.playCopySound ? playCopySound : undefined,
                );
              }
            }
          } else {
            const plainTextContentOnly =
              createCombinedTextContent(targetElements);
            if (plainTextContentOnly.length > 0) {
              didCopy = await copyContent(
                plainTextContentOnly,
                options.playCopySound ? playCopySound : undefined,
              );
            }
          }
        }
      } catch {}

      if (didCopy) {
        showTemporarySuccessLabel(`${targetElements.length} elements`);
      }

      notifyElementsSelected(targetElements);
    };

    const targetElement = createMemo(() => {
      if (!isRendererActive() || isDragging()) return null;
      return getElementAtPosition(mouseX(), mouseY());
    });

    const selectionBounds = createMemo((): OverlayBounds | undefined => {
      const element = targetElement();
      if (!element) return undefined;

      const elementBounds = element.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(element);

      return {
        borderRadius: computedStyle.borderRadius || "0px",
        height: elementBounds.height,
        transform: computedStyle.transform || "none",
        width: elementBounds.width,
        x: elementBounds.left,
        y: elementBounds.top,
      };
    });

    const DRAG_THRESHOLD_PX = 2;

    const calculateDragDistance = (endX: number, endY: number) => ({
      x: Math.abs(endX - dragStartX()),
      y: Math.abs(endY - dragStartY()),
    });

    const isDraggingBeyondThreshold = createMemo(() => {
      if (!isDragging()) return false;

      const dragDistance = calculateDragDistance(mouseX(), mouseY());

      return (
        dragDistance.x > DRAG_THRESHOLD_PX || dragDistance.y > DRAG_THRESHOLD_PX
      );
    });

    const calculateDragRectangle = (endX: number, endY: number) => {
      const dragX = Math.min(dragStartX(), endX);
      const dragY = Math.min(dragStartY(), endY);
      const dragWidth = Math.abs(endX - dragStartX());
      const dragHeight = Math.abs(endY - dragStartY());

      return {
        x: dragX,
        y: dragY,
        width: dragWidth,
        height: dragHeight,
      };
    };

    const dragBounds = createMemo((): OverlayBounds | undefined => {
      if (!isDraggingBeyondThreshold()) return undefined;

      const drag = calculateDragRectangle(mouseX(), mouseY());

      return {
        borderRadius: "0px",
        height: drag.height,
        transform: "none",
        width: drag.width,
        x: drag.x,
        y: drag.y,
      };
    });

    const labelText = createMemo(() => {
      const element = targetElement();
      return element ? extractElementLabelText(element) : "<element>";
    });

    const labelPosition = createMemo(() =>
      isCopying()
        ? { x: copyStartX(), y: copyStartY() }
        : { x: mouseX(), y: mouseY() },
    );

    const progressPosition = createMemo(() =>
      isCopying()
        ? { x: copyStartX(), y: copyStartY() }
        : { x: mouseX(), y: mouseY() },
    );

    const isSameAsLast = createMemo(() =>
      Boolean(targetElement() && targetElement() === lastGrabbedElement()),
    );

    createEffect(
      on(
        () => [targetElement(), lastGrabbedElement()] as const,
        ([currentElement, lastElement]) => {
          if (lastElement && currentElement && lastElement !== currentElement) {
            setLastGrabbedElement(null);
          }
        },
      ),
    );

    const progress = createMemo(() => {
      const startTime = progressStartTime();
      progressTick();
      if (startTime === null) return 0;

      const elapsedTime = Date.now() - startTime;
      const normalizedTime = elapsedTime / options.keyHoldDuration;
      const easedProgress = 1 - Math.exp(-normalizedTime);
      const maxProgressBeforeCompletion = 0.95;

      if (isCopying()) {
        return Math.min(easedProgress, maxProgressBeforeCompletion);
      }

      return 1;
    });

    const startProgressAnimation = () => {
      setProgressStartTime(Date.now());
      setShowProgressIndicator(false);

      progressDelayTimerId = window.setTimeout(() => {
        setShowProgressIndicator(true);
        progressDelayTimerId = null;
      }, PROGRESS_INDICATOR_DELAY_MS);

      const animateProgress = () => {
        if (progressStartTime() === null) return;

        setProgressTick((tick) => tick + 1);
        const currentProgress = progress();
        if (currentProgress < 1) {
          progressAnimationId = requestAnimationFrame(animateProgress);
        }
      };

      animateProgress();
    };

    const stopProgressAnimation = () => {
      if (progressAnimationId !== null) {
        cancelAnimationFrame(progressAnimationId);
        progressAnimationId = null;
      }
      if (progressDelayTimerId !== null) {
        window.clearTimeout(progressDelayTimerId);
        progressDelayTimerId = null;
      }
      setProgressStartTime(null);
      setShowProgressIndicator(false);
    };

    const activateRenderer = () => {
      stopProgressAnimation();
      setIsActivated(true);
      document.body.style.cursor = "crosshair";
    };

    const deactivateRenderer = () => {
      setIsHoldingKeys(false);
      setIsActivated(false);
      document.body.style.cursor = "";
      if (isDragging()) {
        setIsDragging(false);
        document.body.style.userSelect = "";
      }
      if (holdTimerId) window.clearTimeout(holdTimerId);
      if (keydownSpamTimerId) window.clearTimeout(keydownSpamTimerId);
      if (mouseSettleTimerId) {
        window.clearTimeout(mouseSettleTimerId);
        mouseSettleTimerId = null;
      }
      setMouseHasSettled(false);
      referenceMouseX = OFFSCREEN_POSITION;
      referenceMouseY = OFFSCREEN_POSITION;
      stopProgressAnimation();
    };

    const abortController = new AbortController();
    const eventListenerSignal = abortController.signal;

    window.addEventListener(
      "keydown",
      (event: KeyboardEvent) => {
        if (event.key === "Escape" && isHoldingKeys()) {
          deactivateRenderer();
          return;
        }

        if (
          !options.allowActivationInsideInput &&
          isKeyboardEventTriggeredByInput(event)
        ) {
          return;
        }

        if (!isTargetKeyCombination(event)) return;

        if (isActivated()) {
          if (keydownSpamTimerId !== null) {
            window.clearTimeout(keydownSpamTimerId);
          }
          keydownSpamTimerId = window.setTimeout(() => {
            deactivateRenderer();
          }, 200);
          return;
        }

        if (event.repeat) return;

        if (holdTimerId !== null) {
          window.clearTimeout(holdTimerId);
        }

        if (!isHoldingKeys()) {
          setIsHoldingKeys(true);
        }

        holdTimerId = window.setTimeout(() => {
          activateRenderer();
          options.onActivate?.();
        }, options.keyHoldDuration);
      },
      { signal: eventListenerSignal, capture: true },
    );

    window.addEventListener(
      "keyup",
      (event: KeyboardEvent) => {
        if (!isHoldingKeys() && !isActivated()) return;

        const isReleasingModifier = !event.metaKey && !event.ctrlKey;
        const isReleasingC = event.key.toLowerCase() === "c";

        if (isReleasingC || isReleasingModifier) {
          deactivateRenderer();
        }
      },
      { signal: eventListenerSignal, capture: true },
    );

    window.addEventListener(
      "mousemove",
      (event: MouseEvent) => {
        setMouseX(event.clientX);
        setMouseY(event.clientY);

        if (referenceMouseX === OFFSCREEN_POSITION) {
          referenceMouseX = event.clientX;
          referenceMouseY = event.clientY;
        }

        const deltaX = event.clientX - referenceMouseX;
        const deltaY = event.clientY - referenceMouseY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        if (distance >= 200) {
          if (mouseSettleTimerId !== null) {
            window.clearTimeout(mouseSettleTimerId);
          }
          setMouseHasSettled(false);
          referenceMouseX = event.clientX;
          referenceMouseY = event.clientY;

          mouseSettleTimerId = window.setTimeout(() => {
            setMouseHasSettled(true);
            referenceMouseX = mouseX();
            referenceMouseY = mouseY();
            mouseSettleTimerId = null;
          }, 100);
        } else if (mouseSettleTimerId === null && !mouseHasSettled()) {
          mouseSettleTimerId = window.setTimeout(() => {
            setMouseHasSettled(true);
            referenceMouseX = mouseX();
            referenceMouseY = mouseY();
            mouseSettleTimerId = null;
          }, 100);
        }
      },
      { signal: eventListenerSignal },
    );

    window.addEventListener(
      "mousedown",
      (event: MouseEvent) => {
        if (!isRendererActive() || isCopying()) return;

        event.preventDefault();
        setIsDragging(true);
        setDragStartX(event.clientX);
        setDragStartY(event.clientY);
        document.body.style.userSelect = "none";
      },
      { signal: eventListenerSignal },
    );

    window.addEventListener(
      "mouseup",
      (event: MouseEvent) => {
        if (!isDragging()) return;

        const dragDistance = calculateDragDistance(
          event.clientX,
          event.clientY,
        );

        const wasDragGesture =
          dragDistance.x > DRAG_THRESHOLD_PX ||
          dragDistance.y > DRAG_THRESHOLD_PX;

        setIsDragging(false);
        document.body.style.userSelect = "";

        if (wasDragGesture) {
          setDidJustDrag(true);
          const dragRect = calculateDragRectangle(event.clientX, event.clientY);

          const elements = getElementsInDrag(dragRect, isValidGrabbableElement);

          if (elements.length > 0) {
            void executeCopyOperation(event.clientX, event.clientY, () =>
              copyMultipleElementsToClipboard(elements),
            );
          } else {
            const fallbackElements = getElementsInDragLoose(
              dragRect,
              isValidGrabbableElement,
            );

            if (fallbackElements.length > 0) {
              void executeCopyOperation(event.clientX, event.clientY, () =>
                copyMultipleElementsToClipboard(fallbackElements),
              );
            }
          }
        } else {
          const element = getElementAtPosition(event.clientX, event.clientY);
          if (!element) return;

          setLastGrabbedElement(element);
          void executeCopyOperation(event.clientX, event.clientY, () =>
            copySingleElementToClipboard(element),
          );
        }
      },
      { signal: eventListenerSignal },
    );

    window.addEventListener(
      "click",
      (event: MouseEvent) => {
        if (isRendererActive() || isCopying() || didJustDrag()) {
          event.preventDefault();
          event.stopPropagation();
          if (didJustDrag()) {
            setDidJustDrag(false);
          }
        }
      },
      { signal: eventListenerSignal, capture: true },
    );

    document.addEventListener(
      "visibilitychange",
      () => {
        if (document.hidden) {
          setGrabbedBoxes([]);
        }
      },
      { signal: eventListenerSignal },
    );

    onCleanup(() => {
      abortController.abort();
      if (holdTimerId) window.clearTimeout(holdTimerId);
      if (keydownSpamTimerId) window.clearTimeout(keydownSpamTimerId);
      if (mouseSettleTimerId) window.clearTimeout(mouseSettleTimerId);
      stopProgressAnimation();
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    });

    const rendererRoot = mountRoot();

    const selectionVisible = createMemo(() => false);

    const dragVisible = createMemo(
      () => isRendererActive() && isDraggingBeyondThreshold(),
    );

    const labelVariant = createMemo(() =>
      isCopying() ? "processing" : "hover",
    );

    const labelVisible = createMemo(
      () =>
        (isRendererActive() &&
          !isDragging() &&
          mouseHasSettled() &&
          ((Boolean(targetElement()) && !isSameAsLast()) ||
            !targetElement())) ||
        isCopying(),
    );

    const progressVisible = createMemo(
      () => isCopying() && showProgressIndicator() && hasValidMousePosition(),
    );

    const crosshairVisible = createMemo(
      () => isRendererActive() && !isDragging(),
    );

    render(
      () => (
        <ReactGrabRenderer
          selectionVisible={selectionVisible()}
          selectionBounds={selectionBounds()}
          dragVisible={dragVisible()}
          dragBounds={dragBounds()}
          grabbedBoxes={grabbedBoxes()}
          successLabels={successLabels()}
          labelVariant={labelVariant()}
          labelText={labelText()}
          labelX={labelPosition().x}
          labelY={labelPosition().y}
          labelVisible={labelVisible()}
          progressVisible={progressVisible()}
          progress={progress()}
          mouseX={progressPosition().x}
          mouseY={progressPosition().y}
          crosshairVisible={crosshairVisible()}
        />
      ),
      rendererRoot,
    );

    return {
      activate: () => {
        if (!isActivated()) {
          activateRenderer();
          options.onActivate?.();
        }
      },
      deactivate: () => {
        if (isActivated()) {
          deactivateRenderer();
        }
      },
      toggle: () => {
        if (isActivated()) {
          deactivateRenderer();
        } else {
          activateRenderer();
          options.onActivate?.();
        }
      },
      isActive: () => isActivated(),
      dispose,
    };
  });
};
