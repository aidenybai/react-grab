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
import { ReactGrabController } from "./overlay.js";
import { getHTMLSnippet, getSourceTrace } from "./instrumentation.js";
import { copyContent } from "./utils/copy-content.js";
import { getElementAtPosition } from "./utils/get-element-at-position.js";
import { isValidGrabbableElement } from "./utils/is-valid-grabbable-element.js";
import {
  getElementsInMarquee,
  getElementsInMarqueeLoose,
} from "./utils/get-elements-in-marquee.js";
import { createElementBounds } from "./utils/create-element-bounds.js";
import type {
  Options,
  OverlayBounds,
  GrabbedOverlay,
  SourceTrace,
} from "./types.js";

const GRABBED_OVERLAY_DURATION_MS = 300;
const SUCCESS_LABEL_DURATION_MS = 1700;
const PROGRESS_INDICATOR_DELAY_MS = 150;

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
    const [grabbedOverlays, setGrabbedOverlays] = createSignal<
      GrabbedOverlay[]
    >([]);
    const [successLabels, setSuccessLabels] = createSignal<
      Array<{ id: string; text: string; x: number; y: number }>
    >([]);
    const [isActivated, setIsActivated] = createSignal(false);
    const [showProgressIndicator, setShowProgressIndicator] =
      createSignal(false);

    let holdTimerId: number | null = null;
    let progressAnimationId: number | null = null;
    let progressDelayTimerId: number | null = null;

    const isOverlayActive = createMemo(() => isActivated() && !isCopying());

    const hasValidMousePosition = createMemo(
      () => mouseX() > OFFSCREEN_POSITION && mouseY() > OFFSCREEN_POSITION,
    );

    const isTargetKeyCombination = (event: KeyboardEvent) =>
      (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "c";

    const addGrabbedOverlay = (bounds: OverlayBounds) => {
      const overlayId = `grabbed-${Date.now()}-${Math.random()}`;
      setGrabbedOverlays((previousOverlays) => [
        ...previousOverlays,
        { id: overlayId, bounds },
      ]);

      setTimeout(() => {
        setGrabbedOverlays((previousOverlays) =>
          previousOverlays.filter((overlay) => overlay.id !== overlayId),
        );
      }, GRABBED_OVERLAY_DURATION_MS);
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
          return ` ${functionName} - ${fileName}:${lineNumber}:${columnNumber}`;
        })
        .join("\n");
    };

    const getElementContentWithTrace = async (element: Element) => {
      const elementHtml = getHTMLSnippet(element);
      const componentStackTrace = await getSourceTrace(element);

      if (componentStackTrace?.length) {
        const formattedStackTrace = formatStackTrace(componentStackTrace);
        return `${elementHtml}\n\nComponent owner stack:\n${formattedStackTrace}`;
      }

      return elementHtml;
    };

    const getElementTagName = (element: Element) =>
      (element.tagName || "").toLowerCase();

    const handleCopy = async (targetElement: Element) => {
      const elementBounds = targetElement.getBoundingClientRect();
      const tagName = getElementTagName(targetElement);

      addGrabbedOverlay(createElementBounds(targetElement));

      try {
        const content = await getElementContentWithTrace(targetElement);
        await copyContent(content);
      } catch {}

      addSuccessLabel(
        tagName ? `<${tagName}>` : "<element>",
        elementBounds.left,
        elementBounds.top,
      );
    };

    const handleMultipleCopy = async (targetElements: Element[]) => {
      if (targetElements.length === 0) return;

      let minPositionX = Infinity;
      let minPositionY = Infinity;

      for (const element of targetElements) {
        const elementBounds = element.getBoundingClientRect();
        minPositionX = Math.min(minPositionX, elementBounds.left);
        minPositionY = Math.min(minPositionY, elementBounds.top);

        addGrabbedOverlay(createElementBounds(element));
      }

      try {
        const elementSnippets = await Promise.all(
          targetElements.map((element) => getElementContentWithTrace(element)),
        );

        const combinedContent = elementSnippets.join("\n\n---\n\n");
        await copyContent(combinedContent);
      } catch {}

      addSuccessLabel(
        `${targetElements.length} elements`,
        minPositionX,
        minPositionY,
      );
    };

    const targetElement = createMemo(() => {
      if (!isOverlayActive() || isDragging()) return null;
      return getElementAtPosition(mouseX(), mouseY());
    });

    const selectionBounds = createMemo((): OverlayBounds | undefined => {
      const element = targetElement();
      if (!element) return undefined;

      const last = lastGrabbedElement();
      if (last && element === last) return undefined;

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

    const DRAG_THRESHOLD_PX = 5;

    const getDragDistance = (endX: number, endY: number) => ({
      x: Math.abs(endX - dragStartX()),
      y: Math.abs(endY - dragStartY()),
    });

    const isDraggingBeyondThreshold = createMemo(() => {
      if (!isDragging()) return false;

      const dragDistance = getDragDistance(mouseX(), mouseY());

      return (
        dragDistance.x > DRAG_THRESHOLD_PX ||
        dragDistance.y > DRAG_THRESHOLD_PX
      );
    });

    const getMarqueeRect = (endX: number, endY: number) => {
      const marqueeX = Math.min(dragStartX(), endX);
      const marqueeY = Math.min(dragStartY(), endY);
      const marqueeWidth = Math.abs(endX - dragStartX());
      const marqueeHeight = Math.abs(endY - dragStartY());

      return {
        x: marqueeX,
        y: marqueeY,
        width: marqueeWidth,
        height: marqueeHeight,
      };
    };

    const marqueeBounds = createMemo((): OverlayBounds | undefined => {
      if (!isDraggingBeyondThreshold()) return undefined;

      const marquee = getMarqueeRect(mouseX(), mouseY());

      return {
        borderRadius: "0px",
        height: marquee.height,
        transform: "none",
        width: marquee.width,
        x: marquee.x,
        y: marquee.y,
      };
    });

    const labelText = createMemo(() => {
      const element = targetElement();
      if (!element) return "";
      const tagName = getElementTagName(element);
      return tagName ? `<${tagName}>` : "<element>";
    });

    const labelPosition = createMemo(() => {
      const element = targetElement() ?? lastGrabbedElement();
      if (element) {
        const boundingRect = element.getBoundingClientRect();
        return { x: boundingRect.left, y: boundingRect.top };
      }
      return { x: mouseX(), y: mouseY() };
    });

    const isSameAsLast = createMemo(() => {
      const currentElement = targetElement();
      const lastElement = lastGrabbedElement();
      return !!currentElement && currentElement === lastElement;
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

    const activateOverlay = () => {
      stopProgressAnimation();
      setIsActivated(true);
    };

    const abortController = new AbortController();
    const eventListenerSignal = abortController.signal;

    window.addEventListener(
      "keydown",
      (event: KeyboardEvent) => {
        if (event.key === "Escape" && isHoldingKeys()) {
          setIsHoldingKeys(false);
          setIsActivated(false);
          if (isDragging()) {
            setIsDragging(false);
            document.body.style.userSelect = "";
            document.body.style.cursor = "";
          }
          if (holdTimerId) window.clearTimeout(holdTimerId);
          stopProgressAnimation();
          return;
        }

        if (isKeyboardEventTriggeredByInput(event)) return;

        if (isTargetKeyCombination(event) && !isHoldingKeys()) {
          setIsHoldingKeys(true);
          startProgressAnimation();
          holdTimerId = window.setTimeout(() => {
            activateOverlay();
            options.onActivate?.();
          }, options.keyHoldDuration);
        }
      },
      { signal: eventListenerSignal },
    );

    window.addEventListener(
      "keyup",
      (event: KeyboardEvent) => {
        if (
          isHoldingKeys() &&
          (!isTargetKeyCombination(event) || event.key.toLowerCase() === "c")
        ) {
          setIsHoldingKeys(false);
          setIsActivated(false);
          if (holdTimerId) window.clearTimeout(holdTimerId);
          stopProgressAnimation();
        }
      },
      { signal: eventListenerSignal },
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
        if (!isOverlayActive() || isCopying()) return;

        event.preventDefault();
        setIsDragging(true);
        setDragStartX(event.clientX);
        setDragStartY(event.clientY);
        document.body.style.userSelect = "none";
        document.body.style.cursor = "crosshair";
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
        document.body.style.cursor = "";

        if (wasDragGesture) {
          const marqueeRect = getMarqueeRect(event.clientX, event.clientY);

          const elements = getElementsInMarquee(
            marqueeRect,
            isValidGrabbableElement,
          );

          if (elements.length > 0) {
            setIsCopying(true);
            void handleMultipleCopy(elements).finally(() => {
              setIsCopying(false);
            });
          } else {
            const fallbackElements = getElementsInMarqueeLoose(
              marqueeRect,
              isValidGrabbableElement,
            );

            if (fallbackElements.length > 0) {
              setIsCopying(true);
              void handleMultipleCopy(fallbackElements).finally(() => {
                setIsCopying(false);
              });
            }
          }
        } else {
          const element = getElementAtPosition(event.clientX, event.clientY);
          if (!element) return;

          setIsCopying(true);
          setLastGrabbedElement(element);

          void handleCopy(element).finally(() => {
            setIsCopying(false);
          });
        }
      },
      { signal: eventListenerSignal },
    );

    document.addEventListener(
      "visibilitychange",
      () => {
        if (document.hidden) {
          setGrabbedOverlays([]);
        }
      },
      { signal: eventListenerSignal },
    );

    onCleanup(() => {
      abortController.abort();
      if (holdTimerId) window.clearTimeout(holdTimerId);
      stopProgressAnimation();
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    });

    const overlayRoot = mountRoot();

    const selectionVisible = createMemo(
      () => isOverlayActive() && !isDragging() && !!selectionBounds(),
    );

    const marqueeVisible = createMemo(
      () => isOverlayActive() && isDraggingBeyondThreshold(),
    );

    const labelVariant = createMemo(() =>
      isCopying() ? "processing" : "hover",
    );

    const labelVisible = createMemo(
      () =>
        (isOverlayActive() &&
          !isDragging() &&
          !!targetElement() &&
          !isSameAsLast()) ||
        isCopying(),
    );

    const progressVisible = createMemo(
      () => isHoldingKeys() && showProgressIndicator() && hasValidMousePosition(),
    );

    render(
      () => (
        <ReactGrabController
          selectionVisible={selectionVisible()}
          selectionBounds={selectionBounds()}
          marqueeVisible={marqueeVisible()}
          marqueeBounds={marqueeBounds()}
          grabbedOverlays={grabbedOverlays()}
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
        />
      ),
      overlayRoot,
    );

    return dispose;
  });
};
