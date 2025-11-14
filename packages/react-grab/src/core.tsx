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
import { getHTMLSnippet, getSourceTrace } from "./instrumentation.js";
import { copyContent } from "./utils/copy-content.js";
import { getElementAtPosition } from "./utils/get-element-at-position.js";
import { isValidGrabbableElement } from "./utils/is-valid-grabbable-element.js";
import {
  getElementsInDrag,
  getElementsInDragLoose,
} from "./utils/get-elements-in-drag.js";
import { createElementBounds } from "./utils/create-element-bounds.js";
import { SUCCESS_LABEL_DURATION_MS } from "./constants.js";
import type {
  Options,
  OverlayBounds,
  GrabbedBox,
  SourceTrace,
} from "./types.js";

const PROGRESS_INDICATOR_DELAY_MS = 150;
const QUICK_REPRESS_THRESHOLD_MS = 150;

export const init = (rawOptions?: Options) => {
  const options = {
    enabled: true,
    keyHoldDuration: 300,
    ...rawOptions,
  };

  if (options.enabled === false) {
    return;
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
      Array<{ id: string; text: string; x: number; y: number }>
    >([]);
    const [isActivated, setIsActivated] = createSignal(false);
    const [showProgressIndicator, setShowProgressIndicator] =
      createSignal(false);
    const [didJustDrag, setDidJustDrag] = createSignal(false);
    const [isModifierHeld, setIsModifierHeld] = createSignal(false);
    const [copyStartX, setCopyStartX] = createSignal(OFFSCREEN_POSITION);
    const [copyStartY, setCopyStartY] = createSignal(OFFSCREEN_POSITION);

    let holdTimerId: number | null = null;
    let progressAnimationId: number | null = null;
    let progressDelayTimerId: number | null = null;
    let keydownSpamTimerId: number | null = null;
    let lastDeactivationTime: number | null = null;

    const isRendererActive = createMemo(() => isActivated() && !isCopying());

    const hasValidMousePosition = createMemo(
      () => mouseX() > OFFSCREEN_POSITION && mouseY() > OFFSCREEN_POSITION,
    );

    const isTargetKeyCombination = (event: KeyboardEvent) =>
      (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "c";

    const addGrabbedBox = (bounds: OverlayBounds) => {
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

    const addSuccessLabel = (
      text: string,
      positionX: number,
      positionY: number,
    ) => {
      const labelId = `success-${Date.now()}-${Math.random()}`;
      setSuccessLabels((previousLabels) => [
        ...previousLabels,
        { id: labelId, text, x: positionX, y: positionY },
      ]);

      setTimeout(() => {
        setSuccessLabels((previousLabels) =>
          previousLabels.filter((label) => label.id !== labelId),
        );
      }, SUCCESS_LABEL_DURATION_MS);
    };

    const formatStackTrace = (stackTrace: SourceTrace[]) => {
      return stackTrace
        .map((source) => {
          const functionName = source.functionName ?? "anonymous";
          const fileName = source.fileName ?? "unknown";
          const lineNumber = source.lineNumber ?? 0;
          const columnNumber = source.columnNumber ?? 0;
          return `    at ${functionName} (${fileName}:${lineNumber}:${columnNumber})`;
        })
        .join("\n");
    };

    const wrapContextInXmlTags = (context: string) => {
      return `<selected_element>\n${context}\n</selected_element>`;
    };

    const getComputedStyles = (element: Element) => {
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

    const createStructuredClipboardHtml = (
      elements: Array<{
        tagName: string;
        content: string;
        computedStyles: ReturnType<typeof getComputedStyles>;
      }>,
    ) => {
      const structuredData = {
        elements: elements.map((element) => ({
          tagName: element.tagName,
          content: element.content,
          computedStyles: element.computedStyles,
        })),
      };

      const base64Data = btoa(JSON.stringify(structuredData));
      const htmlContent = `<div data-react-grab="${base64Data}"></div>`;

      return new Blob([htmlContent], { type: "text/html" });
    };

    const getElementContentWithTrace = async (element: Element) => {
      const elementHtml = await getHTMLSnippet(element);
      return elementHtml;
    };

    const getElementTagName = (element: Element) =>
      (element.tagName || "").toLowerCase();

    const handleCopy = async (targetElement: Element) => {
      const tagName = getElementTagName(targetElement);

      addGrabbedBox(createElementBounds(targetElement));

      try {
        const content = await getElementContentWithTrace(targetElement);
        const plainTextContent = wrapContextInXmlTags(content);
        const htmlContent = createStructuredClipboardHtml([
          {
            tagName,
            content: await getElementContentWithTrace(targetElement),
            computedStyles: getComputedStyles(targetElement),
          },
        ]);

        await copyContent([plainTextContent, htmlContent]);
      } catch {}

      addSuccessLabel(
        tagName ? `<${tagName}>` : "<element>",
        copyStartX(),
        copyStartY(),
      );
    };

    const handleMultipleCopy = async (targetElements: Element[]) => {
      if (targetElements.length === 0) return;

      for (const element of targetElements) {
        addGrabbedBox(createElementBounds(element));
      }

      try {
        const elementSnippets = await Promise.all(
          targetElements.map((element) => getElementContentWithTrace(element)),
        );

        const combinedContent = elementSnippets.join("\n\n---\n\n");
        const plainTextContent = wrapContextInXmlTags(combinedContent);

        const structuredElements = await Promise.all(
          targetElements.map(async (element) => ({
            tagName: getElementTagName(element),
            content: await getElementContentWithTrace(element),
            computedStyles: getComputedStyles(element),
          })),
        );
        const htmlContent = createStructuredClipboardHtml(structuredElements);

        await copyContent([plainTextContent, htmlContent]);
      } catch {}

      addSuccessLabel(
        `${targetElements.length} elements`,
        copyStartX(),
        copyStartY(),
      );
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

    const getDragDistance = (endX: number, endY: number) => ({
      x: Math.abs(endX - dragStartX()),
      y: Math.abs(endY - dragStartY()),
    });

    const isDraggingBeyondThreshold = createMemo(() => {
      if (!isDragging()) return false;

      const dragDistance = getDragDistance(mouseX(), mouseY());

      return (
        dragDistance.x > DRAG_THRESHOLD_PX || dragDistance.y > DRAG_THRESHOLD_PX
      );
    });

    const getDragRect = (endX: number, endY: number) => {
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

      const drag = getDragRect(mouseX(), mouseY());

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
      return element ? `<${getElementTagName(element)}>` : "<element>";
    });

    const labelPosition = createMemo(() => {
      if (isCopying()) {
        return { x: copyStartX(), y: copyStartY() };
      }
      return { x: mouseX(), y: mouseY() };
    });

    const isSameAsLast = createMemo(() => {
      const currentElement = targetElement();
      const lastElement = lastGrabbedElement();
      return Boolean(currentElement) && currentElement === lastElement;
    });

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
      return Math.min(elapsedTime / options.keyHoldDuration, 1);
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

    const deactivateRenderer = (shouldResetModifier = true) => {
      setIsHoldingKeys(false);
      setIsActivated(false);
      if (shouldResetModifier) {
        setIsModifierHeld(false);
      }
      document.body.style.cursor = "";
      if (isDragging()) {
        setIsDragging(false);
        document.body.style.userSelect = "";
      }
      if (holdTimerId) window.clearTimeout(holdTimerId);
      if (keydownSpamTimerId) window.clearTimeout(keydownSpamTimerId);
      stopProgressAnimation();
      lastDeactivationTime = Date.now();
    };

    const abortController = new AbortController();
    const eventListenerSignal = abortController.signal;

    window.addEventListener(
      "keydown",
      (event: KeyboardEvent) => {
        if (event.metaKey || event.ctrlKey) {
          setIsModifierHeld(true);
        }

        if (event.key === "Escape" && isHoldingKeys()) {
          deactivateRenderer();
          return;
        }

        if (isKeyboardEventTriggeredByInput(event)) return;

        if (isTargetKeyCombination(event)) {
          const wasRecentlyDeactivated =
            lastDeactivationTime !== null &&
            Date.now() - lastDeactivationTime < QUICK_REPRESS_THRESHOLD_MS;

          if (!isHoldingKeys()) {
            setIsHoldingKeys(true);

            if (wasRecentlyDeactivated && isModifierHeld()) {
              activateRenderer();
              options.onActivate?.();

              const element = getElementAtPosition(mouseX(), mouseY());
              if (element) {
                setCopyStartX(mouseX());
                setCopyStartY(mouseY());
                setIsCopying(true);
                setLastGrabbedElement(element);
                void handleCopy(element).finally(() => {
                  setIsCopying(false);
                });
              }
            } else {
              startProgressAnimation();
              holdTimerId = window.setTimeout(() => {
                activateRenderer();
                options.onActivate?.();
              }, options.keyHoldDuration);
            }
          }

          if (isActivated()) {
            if (keydownSpamTimerId) window.clearTimeout(keydownSpamTimerId);
            keydownSpamTimerId = window.setTimeout(() => {
              deactivateRenderer();
            }, 200);
          }
        }
      },
      { signal: eventListenerSignal },
    );

    window.addEventListener(
      "keyup",
      (event: KeyboardEvent) => {
        const isReleasingModifier = !event.metaKey && !event.ctrlKey;
        const isReleasingC = event.key.toLowerCase() === "c";

        if (isReleasingModifier) {
          setIsModifierHeld(false);
        }

        if (!isHoldingKeys() && !isActivated()) return;

        if (isReleasingC) {
          deactivateRenderer(false);
        } else if (isReleasingModifier) {
          deactivateRenderer(true);
        }
      },
      { signal: eventListenerSignal, capture: true },
    );

    window.addEventListener(
      "mousemove",
      (event: MouseEvent) => {
        setMouseX(event.clientX);
        setMouseY(event.clientY);
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

        const dragDistance = getDragDistance(event.clientX, event.clientY);

        const wasDragGesture =
          dragDistance.x > DRAG_THRESHOLD_PX ||
          dragDistance.y > DRAG_THRESHOLD_PX;

        setIsDragging(false);
        document.body.style.userSelect = "";

        if (wasDragGesture) {
          setDidJustDrag(true);
          const dragRect = getDragRect(event.clientX, event.clientY);

          const elements = getElementsInDrag(dragRect, isValidGrabbableElement);

          if (elements.length > 0) {
            setCopyStartX(event.clientX);
            setCopyStartY(event.clientY);
            setIsCopying(true);
            void handleMultipleCopy(elements).finally(() => {
              setIsCopying(false);
            });
          } else {
            const fallbackElements = getElementsInDragLoose(
              dragRect,
              isValidGrabbableElement,
            );

            if (fallbackElements.length > 0) {
              setCopyStartX(event.clientX);
              setCopyStartY(event.clientY);
              setIsCopying(true);
              void handleMultipleCopy(fallbackElements).finally(() => {
                setIsCopying(false);
              });
            }
          }
        } else {
          const element = getElementAtPosition(event.clientX, event.clientY);
          if (!element) return;

          setCopyStartX(event.clientX);
          setCopyStartY(event.clientY);
          setIsCopying(true);
          setLastGrabbedElement(element);

          void handleCopy(element).finally(() => {
            setIsCopying(false);
          });
        }
      },
      { signal: eventListenerSignal },
    );

    window.addEventListener(
      "click",
      (event: MouseEvent) => {
        if (didJustDrag()) {
          event.preventDefault();
          event.stopPropagation();
          setDidJustDrag(false);
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
          ((Boolean(targetElement()) && !isSameAsLast()) ||
            !targetElement())) ||
        isCopying(),
    );

    const progressVisible = createMemo(
      () =>
        isHoldingKeys() && showProgressIndicator() && hasValidMousePosition(),
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
          mouseX={mouseX()}
          mouseY={mouseY()}
          crosshairVisible={crosshairVisible()}
        />
      ),
      rendererRoot,
    );

    return dispose;
  });
};
