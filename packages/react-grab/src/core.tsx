// @ts-expect-error - CSS imported as text via tsup loader
import cssText from "../dist/styles.css";
import {
  createSignal,
  createMemo,
  createRoot,
  onCleanup,
  createEffect,
  createResource,
  on,
} from "solid-js";
import { render } from "solid-js/web";
import { isKeyboardEventTriggeredByInput } from "./utils/is-keyboard-event-triggered-by-input.js";
import { isSelectionInsideEditableElement } from "./utils/is-selection-inside-editable-element.js";
import { mountRoot } from "./utils/mount-root.js";
import { ReactGrabRenderer } from "./components/renderer.js";
import {
  getStack,
  getElementContext,
  getNearestComponentName,
} from "./context.js";
import { isSourceFile, normalizeFileName } from "bippy/source";
import { copyContent } from "./utils/copy-content.js";
import { getElementAtPosition } from "./utils/get-element-at-position.js";
import { isValidGrabbableElement } from "./utils/is-valid-grabbable-element.js";
import {
  getElementsInDrag,
  getElementsInDragLoose,
} from "./utils/get-elements-in-drag.js";
import { createElementBounds } from "./utils/create-element-bounds.js";
import { stripTranslateFromTransform } from "./utils/strip-translate-from-transform.js";
import {
  SUCCESS_LABEL_DURATION_MS,
  COPIED_LABEL_DURATION_MS,
  OFFSCREEN_POSITION,
  DRAG_THRESHOLD_PX,
  ELEMENT_DETECTION_THROTTLE_MS,
  Z_INDEX_LABEL,
  AUTO_SCROLL_EDGE_THRESHOLD_PX,
  AUTO_SCROLL_SPEED_PX,
  LOGO_SVG,
  MODIFIER_KEYS,
  BLUR_DEACTIVATION_THRESHOLD_MS,
  BOUNDS_RECALC_INTERVAL_MS,
} from "./constants.js";
import { isCLikeKey } from "./utils/is-c-like-key.js";
import { keyMatchesCode, isTargetKeyCombination } from "./utils/hotkey.js";
import { isEventFromOverlay } from "./utils/is-event-from-overlay.js";
import { buildOpenFileUrl } from "./utils/build-open-file-url.js";
import type {
  Options,
  OverlayBounds,
  GrabbedBox,
  ReactGrabAPI,
  ReactGrabState,
  DeepPartial,
  Theme,
  SelectionLabelStatus,
  SelectionLabelInstance,
  AgentSession,
  AgentOptions,
} from "./types.js";
import { mergeTheme, deepMergeTheme } from "./theme.js";
import { createAgentManager } from "./agent.js";

const onIdle = (callback: () => void) => {
  if ("scheduler" in globalThis) {
    return (
      globalThis as unknown as {
        scheduler: {
          postTask: (cb: () => void, opts: { priority: string }) => void;
        };
      }
    ).scheduler.postTask(callback, {
      priority: "background",
    });
  }
  if ("requestIdleCallback" in window) {
    return requestIdleCallback(callback);
  }
  return setTimeout(callback, 0);
};

let hasInited = false;

const getScriptOptions = (): Partial<Options> | null => {
  if (typeof window === "undefined") return null;
  try {
    const dataOptions = document.currentScript?.getAttribute("data-options");
    if (!dataOptions) return null;
    return JSON.parse(dataOptions) as Partial<Options>;
  } catch {
    return null;
  }
};

export const init = (rawOptions?: Options): ReactGrabAPI => {
  const initialTheme = mergeTheme(rawOptions?.theme);

  if (typeof window === "undefined") {
    return {
      activate: () => {},
      deactivate: () => {},
      toggle: () => {},
      isActive: () => false,
      dispose: () => {},
      copyElement: () => Promise.resolve(false),
      getState: () => ({
        isActive: false,
        isDragging: false,
        isCopying: false,
        isInputMode: false,
        targetElement: null,
        dragBounds: null,
      }),
      updateTheme: () => {},
      getTheme: () => initialTheme,
      setAgent: () => {},
    };
  }

  const scriptOptions = getScriptOptions();

  const options = {
    enabled: true,
    keyHoldDuration: 200,
    allowActivationInsideInput: true,
    maxContextLines: 3,
    ...scriptOptions,
    ...rawOptions,
  };

  const mergedTheme = mergeTheme(options.theme);

  if (options.enabled === false || hasInited) {
    return {
      activate: () => {},
      deactivate: () => {},
      toggle: () => {},
      isActive: () => false,
      dispose: () => {},
      copyElement: () => Promise.resolve(false),
      getState: () => ({
        isActive: false,
        isDragging: false,
        isCopying: false,
        isInputMode: false,
        targetElement: null,
        dragBounds: null,
      }),
      updateTheme: () => {},
      getTheme: () => mergedTheme,
      setAgent: () => {},
    };
  }
  hasInited = true;

  const logIntro = () => {
    try {
      const version = process.env.VERSION;
      const logoDataUri = `data:image/svg+xml;base64,${btoa(LOGO_SVG)}`;
      console.log(
        `%cReact Grab${version ? ` v${version}` : ""}%c\nhttps://react-grab.com`,
        `background: #330039; color: #ffffff; border: 1px solid #d75fcb; padding: 4px 4px 4px 24px; border-radius: 4px; background-image: url("${logoDataUri}"); background-size: 16px 16px; background-repeat: no-repeat; background-position: 4px center; display: inline-block; margin-bottom: 4px;`,
        "",
      );
      if (navigator.onLine && version) {
        fetch(`https://www.react-grab.com/api/version?t=${Date.now()}`, {
          referrerPolicy: "origin",
          keepalive: true,
          priority: "low",
          cache: "no-store",
        })
          .then((res) => res.text())
          .then((latestVersion) => {
            if (latestVersion && latestVersion !== version) {
              console.warn(
                `[React Grab] v${version} is outdated (latest: v${latestVersion})`,
              );
            }
          })
          .catch(() => null);
      }
    } catch {}
  };

  logIntro();

  return createRoot((dispose) => {
    const [theme, setTheme] = createSignal(mergedTheme);
    const [isHoldingKeys, setIsHoldingKeys] = createSignal(false);
    const [mouseX, setMouseX] = createSignal(OFFSCREEN_POSITION);
    const [mouseY, setMouseY] = createSignal(OFFSCREEN_POSITION);
    const [detectedElement, setDetectedElement] = createSignal<Element | null>(
      null,
    );
    let lastElementDetectionTime = 0;
    const [isDragging, setIsDragging] = createSignal(false);
    const [dragStartX, setDragStartX] = createSignal(OFFSCREEN_POSITION);
    const [dragStartY, setDragStartY] = createSignal(OFFSCREEN_POSITION);
    const [isCopying, setIsCopying] = createSignal(false);
    const [selectionLabelStatus, setSelectionLabelStatus] =
      createSignal<SelectionLabelStatus>("idle");
    const [labelInstances, setLabelInstances] = createSignal<
      SelectionLabelInstance[]
    >([]);
    const [lastGrabbedElement, setLastGrabbedElement] =
      createSignal<Element | null>(null);
    const [lastCopiedElement, setLastCopiedElement] =
      createSignal<Element | null>(null);
    const [progressStartTime, setProgressStartTime] = createSignal<
      number | null
    >(null);
    const [grabbedBoxes, setGrabbedBoxes] = createSignal<GrabbedBox[]>([]);
    const [isActivated, setIsActivated] = createSignal(false);
    const [isToggleMode, setIsToggleMode] = createSignal(false);
    const [didJustDrag, setDidJustDrag] = createSignal(false);
    const [didJustCopy, setDidJustCopy] = createSignal(false);
    const [copyStartX, setCopyStartX] = createSignal(OFFSCREEN_POSITION);
    const [copyStartY, setCopyStartY] = createSignal(OFFSCREEN_POSITION);
    const [copyOffsetFromCenterX, setCopyOffsetFromCenterX] = createSignal(0);
    const [viewportVersion, setViewportVersion] = createSignal(0);
    const [isInputMode, setIsInputMode] = createSignal(false);
    const [inputText, setInputText] = createSignal("");
    const [isTouchMode, setIsTouchMode] = createSignal(false);
    const [selectionFilePath, setSelectionFilePath] = createSignal<
      string | undefined
    >(undefined);
    const [selectionLineNumber, setSelectionLineNumber] = createSignal<
      number | undefined
    >(undefined);
    const [isToggleFrozen, setIsToggleFrozen] = createSignal(false);
    const [isInputExpanded, setIsInputExpanded] = createSignal(false);
    const [frozenElement, setFrozenElement] = createSignal<Element | null>(
      null,
    );
    const [hasAgentProvider, setHasAgentProvider] = createSignal(
      Boolean(options.agent?.provider),
    );
    const [isAgentConnected, setIsAgentConnected] = createSignal(false);
    const [isPendingDismiss, setIsPendingDismiss] = createSignal(false);

    const elementInputCache = new WeakMap<Element, string>();

    const [nativeSelectionCursorX, setNativeSelectionCursorX] =
      createSignal(OFFSCREEN_POSITION);
    const [nativeSelectionCursorY, setNativeSelectionCursorY] =
      createSignal(OFFSCREEN_POSITION);
    const [hasNativeSelection, setHasNativeSelection] = createSignal(false);
    const [nativeSelectionElements, setNativeSelectionElements] = createSignal<
      Element[]
    >([]);

    const extractElementTagName = (element: Element) =>
      (element.tagName || "").toLowerCase();

    const nativeSelectionTagName = createMemo(() => {
      const elements = nativeSelectionElements();
      if (elements.length === 0 || !elements[0]) return undefined;
      return extractElementTagName(elements[0]) || undefined;
    });

    const [nativeSelectionComponentName] = createResource(
      () => {
        const elements = nativeSelectionElements();
        if (elements.length === 0 || !elements[0]) return null;
        return elements[0];
      },
      async (element) => {
        if (!element) return undefined;
        return (await getNearestComponentName(element)) || undefined;
      },
    );

    const clearNativeSelectionState = () => {
      setNativeSelectionCursorX(OFFSCREEN_POSITION);
      setNativeSelectionCursorY(OFFSCREEN_POSITION);
      setNativeSelectionElements([]);
    };

    const recalculateNativeSelectionCursor = () => {
      const currentSelection = window.getSelection();
      if (
        !currentSelection ||
        currentSelection.isCollapsed ||
        currentSelection.rangeCount === 0
      ) {
        return;
      }

      const range = currentSelection.getRangeAt(0);
      const clientRects = range.getClientRects();
      if (clientRects.length === 0) return;

      const isBackward = (() => {
        if (!currentSelection.anchorNode || !currentSelection.focusNode)
          return false;
        const position = currentSelection.anchorNode.compareDocumentPosition(
          currentSelection.focusNode,
        );
        if (position & Node.DOCUMENT_POSITION_FOLLOWING) return false;
        if (position & Node.DOCUMENT_POSITION_PRECEDING) return true;
        return currentSelection.anchorOffset > currentSelection.focusOffset;
      })();

      const cursorRect = isBackward
        ? clientRects[0]
        : clientRects[clientRects.length - 1];
      const cursorX = isBackward ? cursorRect.left : cursorRect.right;
      const cursorY = cursorRect.top + cursorRect.height / 2;

      setNativeSelectionCursorX(cursorX);
      setNativeSelectionCursorY(cursorY);
    };

    createEffect(
      on(
        () => viewportVersion(),
        () => {
          if (hasNativeSelection()) {
            recalculateNativeSelectionCursor();
          }
        },
      ),
    );

    const nativeSelectionBounds = createMemo((): OverlayBounds | undefined => {
      viewportVersion();
      const elements = nativeSelectionElements();
      if (elements.length === 0 || !elements[0]) return undefined;
      return createElementBounds(elements[0]);
    });

    let holdTimerId: number | null = null;
    let activationTimestamp: number | null = null;
    let progressAnimationId: number | null = null;
    let keydownSpamTimerId: number | null = null;
    let autoScrollAnimationId: number | null = null;
    let previouslyFocusedElement: Element | null = null;

    const isRendererActive = createMemo(() => isActivated() && !isCopying());

    const getAutoScrollDirection = (clientX: number, clientY: number) => {
      return {
        top: clientY < AUTO_SCROLL_EDGE_THRESHOLD_PX,
        bottom: clientY > window.innerHeight - AUTO_SCROLL_EDGE_THRESHOLD_PX,
        left: clientX < AUTO_SCROLL_EDGE_THRESHOLD_PX,
        right: clientX > window.innerWidth - AUTO_SCROLL_EDGE_THRESHOLD_PX,
      };
    };

    const showTemporaryGrabbedBox = (
      bounds: OverlayBounds,
      element: Element,
    ) => {
      const boxId = `grabbed-${Date.now()}-${Math.random()}`;
      const createdAt = Date.now();
      const newBox: GrabbedBox = { id: boxId, bounds, createdAt, element };
      const currentBoxes: GrabbedBox[] = grabbedBoxes();
      setGrabbedBoxes([...currentBoxes, newBox]);

      options.onGrabbedBox?.(bounds, element);

      setTimeout(() => {
        setGrabbedBoxes((previousBoxes) =>
          previousBoxes.filter((box) => box.id !== boxId),
        );
      }, SUCCESS_LABEL_DURATION_MS);
    };

    const notifyElementsSelected = (elements: Element[]) => {
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
    };

    const createLabelInstance = (
      bounds: OverlayBounds,
      tagName: string,
      componentName: string | undefined,
      status: SelectionLabelStatus,
      element?: Element,
      mouseX?: number,
    ): string => {
      const instanceId = `label-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setLabelInstances((prev) => [
        ...prev,
        {
          id: instanceId,
          bounds,
          tagName,
          componentName,
          status,
          createdAt: Date.now(),
          element,
          mouseX,
        },
      ]);
      return instanceId;
    };

    const updateLabelInstance = (
      instanceId: string,
      status: SelectionLabelStatus,
    ) => {
      setLabelInstances((prev) =>
        prev.map((instance) =>
          instance.id === instanceId ? { ...instance, status } : instance,
        ),
      );
    };

    const removeLabelInstance = (instanceId: string) => {
      setLabelInstances((prev) =>
        prev.filter((instance) => instance.id !== instanceId),
      );
    };

    const executeCopyOperation = async (
      positionX: number,
      positionY: number,
      operation: () => Promise<void>,
      bounds?: OverlayBounds,
      tagName?: string,
      componentName?: string,
      element?: Element,
      shouldDeactivateAfter?: boolean,
    ) => {
      setCopyStartX(positionX);
      setCopyStartY(positionY);
      if (bounds) {
        const selectionCenterX = bounds.x + bounds.width / 2;
        setCopyOffsetFromCenterX(positionX - selectionCenterX);
      } else {
        setCopyOffsetFromCenterX(0);
      }
      setIsCopying(true);
      startProgressAnimation();

      const instanceId =
        bounds && tagName
          ? createLabelInstance(
              bounds,
              tagName,
              componentName,
              "copying",
              element,
              positionX,
            )
          : null;

      await operation().finally(() => {
        setIsCopying(false);
        setDidJustCopy(true);
        if (element) {
          setLastCopiedElement(element);
        }
        stopProgressAnimation();

        if (instanceId) {
          updateLabelInstance(instanceId, "copied");

          setTimeout(() => {
            updateLabelInstance(instanceId, "fading");
            // HACK: Wait slightly longer than CSS transition (300ms) to ensure fade completes before unmount
            setTimeout(() => {
              removeLabelInstance(instanceId);
            }, 350);
          }, COPIED_LABEL_DURATION_MS);
        }

        if (isToggleMode() || shouldDeactivateAfter) {
          deactivateRenderer();
        }
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

    const tryCopyWithFallback = async (
      elements: Element[],
      extraPrompt?: string,
    ): Promise<boolean> => {
      let didCopy = false;
      let copiedContent = "";

      await options.onBeforeCopy?.(elements);

      try {
        const elementSnippetResults = await Promise.allSettled(
          elements.map((element) =>
            getElementContext(element, { maxLines: options.maxContextLines }),
          ),
        );

        const elementSnippets: string[] = [];
        for (const result of elementSnippetResults) {
          if (result.status === "fulfilled" && result.value.trim()) {
            elementSnippets.push(result.value);
          }
        }

        if (elementSnippets.length > 0) {
          const combinedSnippets = elementSnippets.join("\n\n");

          const plainTextContent = extraPrompt
            ? `${extraPrompt}\n\n${combinedSnippets}`
            : combinedSnippets;

          copiedContent = plainTextContent;
          didCopy = copyContent(plainTextContent);
        }

        if (!didCopy) {
          const plainTextContentOnly = createCombinedTextContent(elements);
          if (plainTextContentOnly.length > 0) {
            const contentWithPrompt = extraPrompt
              ? `${extraPrompt}\n\n${plainTextContentOnly}`
              : plainTextContentOnly;

            copiedContent = contentWithPrompt;
            didCopy = copyContent(contentWithPrompt);
          }
        }

        if (didCopy) {
          options.onCopySuccess?.(elements, copiedContent);
        }
      } catch (error) {
        options.onCopyError?.(error as Error);

        const plainTextContentOnly = createCombinedTextContent(elements);
        if (plainTextContentOnly.length > 0) {
          const contentWithPrompt = extraPrompt
            ? `${extraPrompt}\n\n${plainTextContentOnly}`
            : plainTextContentOnly;

          copiedContent = contentWithPrompt;
          didCopy = copyContent(contentWithPrompt);
        }
      }

      options.onAfterCopy?.(elements, didCopy);

      return didCopy;
    };

    const copySingleElementToClipboard = async (
      targetElement: Element,
      extraPrompt?: string,
    ) => {
      options.onElementSelect?.(targetElement);

      if (theme().grabbedBoxes.enabled) {
        showTemporaryGrabbedBox(
          createElementBounds(targetElement),
          targetElement,
        );
      }
      await new Promise((resolve) => requestAnimationFrame(resolve));

      await tryCopyWithFallback([targetElement], extraPrompt);

      notifyElementsSelected([targetElement]);
    };

    const copyMultipleElementsToClipboard = async (
      targetElements: Element[],
    ) => {
      if (targetElements.length === 0) return;

      for (const element of targetElements) {
        options.onElementSelect?.(element);
      }

      if (theme().grabbedBoxes.enabled) {
        for (const element of targetElements) {
          showTemporaryGrabbedBox(createElementBounds(element), element);
        }
      }
      await new Promise((resolve) => requestAnimationFrame(resolve));

      await tryCopyWithFallback(targetElements);

      notifyElementsSelected(targetElements);
    };

    const targetElement = createMemo(() => {
      if (!isRendererActive() || isDragging()) return null;
      const element = detectedElement();
      if (element && !document.contains(element)) return null;
      return element;
    });

    const effectiveElement = createMemo(() => {
      if (isToggleFrozen()) {
        return frozenElement();
      }
      return targetElement();
    });

    createEffect(() => {
      const element = detectedElement();
      if (!element) return;

      const intervalId = setInterval(() => {
        if (!document.contains(element)) {
          setDetectedElement(null);
        }
      }, 100);

      onCleanup(() => clearInterval(intervalId));
    });

    createEffect(() => {
      const element = targetElement();
      if (element) {
        setFrozenElement(element);
      }
    });

    const selectionBounds = createMemo((): OverlayBounds | undefined => {
      viewportVersion();
      const element = effectiveElement();
      if (!element) return undefined;
      return createElementBounds(element);
    });

    const calculateDragDistance = (endX: number, endY: number) => {
      const endPageX = endX + window.scrollX;
      const endPageY = endY + window.scrollY;

      return {
        x: Math.abs(endPageX - dragStartX()),
        y: Math.abs(endPageY - dragStartY()),
      };
    };

    const isDraggingBeyondThreshold = createMemo(() => {
      if (!isDragging()) return false;

      const dragDistance = calculateDragDistance(mouseX(), mouseY());

      return (
        dragDistance.x > DRAG_THRESHOLD_PX || dragDistance.y > DRAG_THRESHOLD_PX
      );
    });

    const calculateDragRectangle = (endX: number, endY: number) => {
      const endPageX = endX + window.scrollX;
      const endPageY = endY + window.scrollY;

      const dragPageX = Math.min(dragStartX(), endPageX);
      const dragPageY = Math.min(dragStartY(), endPageY);
      const dragWidth = Math.abs(endPageX - dragStartX());
      const dragHeight = Math.abs(endPageY - dragStartY());

      return {
        x: dragPageX - window.scrollX,
        y: dragPageY - window.scrollY,
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

    const [labelComponentName] = createResource(
      () => targetElement(),
      async (element) => {
        if (!element) return null;
        return getNearestComponentName(element);
      },
    );

    const labelContent = createMemo(() => {
      const element = targetElement();
      const copying = isCopying();

      if (!element) {
        return (
          <span class="tabular-nums align-middle">
            {copying ? "Processing…" : "1 element"}
          </span>
        );
      }

      const tagName = extractElementTagName(element);
      const componentName = labelComponentName();

      if (tagName && componentName) {
        return (
          <>
            <span class="font-mono tabular-nums align-middle">
              {"<"}
              {tagName}
              {">"}
            </span>
            <span class="tabular-nums ml-1 align-middle">
              {" in "}
              {componentName}
            </span>
          </>
        );
      }

      if (tagName) {
        return (
          <span class="font-mono tabular-nums align-middle">
            {"<"}
            {tagName}
            {">"}
          </span>
        );
      }

      return (
        <span class="tabular-nums align-middle">
          {copying ? "Processing…" : "1 element"}
        </span>
      );
    });

    const cursorPosition = createMemo(() => {
      if (isCopying() || isInputExpanded()) {
        viewportVersion();
        const element = frozenElement() || targetElement();
        if (element) {
          const bounds = createElementBounds(element);
          const selectionCenterX = bounds.x + bounds.width / 2;
          return {
            x: selectionCenterX + copyOffsetFromCenterX(),
            y: copyStartY(),
          };
        }
        return { x: copyStartX(), y: copyStartY() };
      }
      return { x: mouseX(), y: mouseY() };
    });

    createEffect(
      on(
        () => [targetElement(), lastGrabbedElement()] as const,
        ([currentElement, lastElement]) => {
          if (lastElement && currentElement && lastElement !== currentElement) {
            setLastGrabbedElement(null);
          }
          if (currentElement) {
            options.onElementHover?.(currentElement);
          }
        },
      ),
    );

    createEffect(
      on(
        () => targetElement(),
        (element) => {
          const clearSource = () => {
            setSelectionFilePath(undefined);
            setSelectionLineNumber(undefined);
          };

          if (!element) {
            clearSource();
            return;
          }

          getStack(element)
            .then((stack) => {
              if (!stack) return;
              for (const frame of stack) {
                if (frame.fileName && isSourceFile(frame.fileName)) {
                  setSelectionFilePath(normalizeFileName(frame.fileName));
                  setSelectionLineNumber(frame.lineNumber);
                  return;
                }
              }
              clearSource();
            })
            .catch(clearSource);
        },
      ),
    );

    createEffect(
      on(
        () => viewportVersion(),
        () => agentManager.updateSessionBoundsOnViewportChange(),
      ),
    );

    createEffect(
      on(
        () =>
          [
            isActivated(),
            isDragging(),
            isCopying(),
            isInputMode(),
            targetElement(),
            dragBounds(),
          ] as const,
        ([active, dragging, copying, inputMode, target, drag]) => {
          options.onStateChange?.({
            isActive: active,
            isDragging: dragging,
            isCopying: copying,
            isInputMode: inputMode,
            targetElement: target,
            dragBounds: drag
              ? {
                  x: drag.x,
                  y: drag.y,
                  width: drag.width,
                  height: drag.height,
                }
              : null,
          });
        },
      ),
    );

    createEffect(
      on(
        () => [isInputMode(), mouseX(), mouseY(), targetElement()] as const,
        ([inputMode, x, y, target]) => {
          options.onInputModeChange?.(inputMode, {
            x,
            y,
            targetElement: target,
          });
        },
      ),
    );

    createEffect(
      on(
        () => [selectionVisible(), selectionBounds(), targetElement()] as const,
        ([visible, bounds, element]) => {
          options.onSelectionBox?.(Boolean(visible), bounds ?? null, element);
        },
      ),
    );

    createEffect(
      on(
        () => [dragVisible(), dragBounds()] as const,
        ([visible, bounds]) => {
          options.onDragBox?.(Boolean(visible), bounds ?? null);
        },
      ),
    );

    createEffect(
      on(
        () => [crosshairVisible(), mouseX(), mouseY()] as const,
        ([visible, x, y]) => {
          options.onCrosshair?.(Boolean(visible), { x, y });
        },
      ),
    );

    createEffect(
      on(
        () =>
          [
            labelVisible(),
            labelVariant(),
            labelContent(),
            cursorPosition(),
          ] as const,
        ([visible, variant, content, position]) => {
          const contentString = typeof content === "string" ? content : "";
          options.onElementLabel?.(Boolean(visible), variant, {
            x: position.x,
            y: position.y,
            content: contentString,
          });
        },
      ),
    );

    let cursorStyleElement: HTMLStyleElement | null = null;

    const setCursorOverride = (cursor: string | null) => {
      if (cursor) {
        if (!cursorStyleElement) {
          cursorStyleElement = document.createElement("style");
          cursorStyleElement.setAttribute("data-react-grab-cursor", "");
          document.head.appendChild(cursorStyleElement);
        }
        cursorStyleElement.textContent = `* { cursor: ${cursor} !important; }`;
      } else if (cursorStyleElement) {
        cursorStyleElement.remove();
        cursorStyleElement = null;
      }
    };

    createEffect(
      on(
        () =>
          [
            isActivated(),
            isCopying(),
            isDragging(),
            isInputMode(),
            targetElement(),
          ] as const,
        ([activated, copying, dragging, inputMode, target]) => {
          if (copying) {
            setCursorOverride("progress");
          } else if (inputMode) {
            setCursorOverride(null);
          } else if (activated && dragging) {
            setCursorOverride("crosshair");
          } else if (activated && target) {
            setCursorOverride("default");
          } else if (activated) {
            setCursorOverride("crosshair");
          } else {
            setCursorOverride(null);
          }
        },
      ),
    );

    const startProgressAnimation = (duration?: number) => {
      const startTime = Date.now();
      const animationDuration = duration ?? options.keyHoldDuration;
      setProgressStartTime(startTime);

      const animateProgress = () => {
        const currentStartTime = progressStartTime();
        if (currentStartTime === null) return;

        const elapsedTime = Date.now() - currentStartTime;
        const normalizedTime = elapsedTime / animationDuration;
        const easedProgress = 1 - Math.exp(-normalizedTime);
        const maxProgressBeforeCompletion = 0.95;

        const currentProgress = isCopying()
          ? Math.min(easedProgress, maxProgressBeforeCompletion)
          : 1;

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
      setProgressStartTime(null);
    };

    const startAutoScroll = () => {
      const scroll = () => {
        if (!isDragging()) {
          stopAutoScroll();
          return;
        }

        const direction = getAutoScrollDirection(mouseX(), mouseY());

        if (direction.top) window.scrollBy(0, -AUTO_SCROLL_SPEED_PX);
        if (direction.bottom) window.scrollBy(0, AUTO_SCROLL_SPEED_PX);
        if (direction.left) window.scrollBy(-AUTO_SCROLL_SPEED_PX, 0);
        if (direction.right) window.scrollBy(AUTO_SCROLL_SPEED_PX, 0);

        if (
          direction.top ||
          direction.bottom ||
          direction.left ||
          direction.right
        ) {
          autoScrollAnimationId = requestAnimationFrame(scroll);
        } else {
          autoScrollAnimationId = null;
        }
      };

      scroll();
    };

    const stopAutoScroll = () => {
      if (autoScrollAnimationId !== null) {
        cancelAnimationFrame(autoScrollAnimationId);
        autoScrollAnimationId = null;
      }
    };

    const activateRenderer = () => {
      stopProgressAnimation();
      previouslyFocusedElement = document.activeElement;
      activationTimestamp = Date.now();
      setIsActivated(true);
      options.onActivate?.();
    };

    const deactivateRenderer = () => {
      setIsToggleMode(false);
      setIsHoldingKeys(false);
      setIsActivated(false);
      setIsInputMode(false);
      setInputText("");
      setIsToggleFrozen(false);
      setIsInputExpanded(false);
      setIsPendingDismiss(false);
      setFrozenElement(null);
      setSelectionLabelStatus("idle");
      setDidJustCopy(false);
      if (isDragging()) {
        setIsDragging(false);
        document.body.style.userSelect = "";
      }
      if (holdTimerId) window.clearTimeout(holdTimerId);
      if (keydownSpamTimerId) window.clearTimeout(keydownSpamTimerId);
      stopAutoScroll();
      stopProgressAnimation();
      activationTimestamp = null;
      if (
        previouslyFocusedElement instanceof HTMLElement &&
        document.contains(previouslyFocusedElement)
      ) {
        previouslyFocusedElement.focus();
      }
      previouslyFocusedElement = null;
      options.onDeactivate?.();
    };

    const agentOptions = options.agent
      ? {
          ...options.agent,
          onAbort: (session: AgentSession, element: Element | undefined) => {
            options.agent?.onAbort?.(session, element);

            if (element && document.contains(element)) {
              const rect = element.getBoundingClientRect();
              const centerY = rect.top + rect.height / 2;

              setMouseX(session.position.x);
              setMouseY(centerY);
              setFrozenElement(element);
              setInputText(session.context.prompt);
              setIsInputExpanded(true);
              setIsInputMode(true);
              setIsToggleMode(true);
              setIsToggleFrozen(true);

              if (!isActivated()) {
                activateRenderer();
              }
            }
          },
        }
      : undefined;

    const agentManager = createAgentManager(agentOptions);

    const handleInputChange = (value: string) => {
      setInputText(value);
    };

    const handleInputSubmit = () => {
      setLastCopiedElement(null);
      const element = frozenElement() || targetElement();
      const prompt = isInputMode() ? inputText().trim() : "";

      if (!element) {
        deactivateRenderer();
        return;
      }

      const bounds = createElementBounds(element);
      const labelPositionX = mouseX();
      const currentX = bounds.x + bounds.width / 2;
      const currentY = bounds.y + bounds.height / 2;

      setMouseX(currentX);
      setMouseY(currentY);

      if (hasAgentProvider() && prompt) {
        elementInputCache.delete(element);
        deactivateRenderer();

        void agentManager.startSession({
          element,
          prompt,
          position: { x: labelPositionX, y: currentY },
          selectionBounds: bounds,
        });

        return;
      }

      setIsInputMode(false);
      setInputText("");
      if (prompt) {
        elementInputCache.set(element, prompt);
      } else {
        elementInputCache.delete(element);
      }

      const tagName = extractElementTagName(element);
      void getNearestComponentName(element).then((componentName) => {
        void executeCopyOperation(
          currentX,
          currentY,
          () => copySingleElementToClipboard(element, prompt || undefined),
          bounds,
          tagName,
          componentName ?? undefined,
          element,
        ).then(() => {
          deactivateRenderer();
        });
      });
    };

    const handleInputCancel = () => {
      setLastCopiedElement(null);
      if (!isInputMode()) return;

      const currentInput = inputText().trim();
      if (currentInput && !isPendingDismiss()) {
        setIsPendingDismiss(true);
        return;
      }

      const element = frozenElement() || targetElement();
      if (element && currentInput) {
        elementInputCache.set(element, currentInput);
      }

      setIsPendingDismiss(false);
      deactivateRenderer();
    };

    const handleConfirmDismiss = () => {
      setIsPendingDismiss(false);
      deactivateRenderer();
    };

    const handleCancelDismiss = () => {
      setIsPendingDismiss(false);
    };

    const handleToggleExpand = () => {
      const element = frozenElement() || targetElement();
      if (element) {
        const bounds = createElementBounds(element);
        const selectionCenterX = bounds.x + bounds.width / 2;
        setCopyStartX(mouseX());
        setCopyStartY(mouseY());
        setCopyOffsetFromCenterX(mouseX() - selectionCenterX);

        const cachedInput = elementInputCache.get(element);
        if (cachedInput) {
          setInputText(cachedInput);
        }
      }
      setIsToggleMode(true);
      setIsToggleFrozen(true);
      setIsInputExpanded(true);
      setIsInputMode(true);
    };

    const handleNativeSelectionCopy = async () => {
      const elements = nativeSelectionElements();
      if (elements.length === 0) return;

      const currentX = nativeSelectionCursorX();
      const currentY = nativeSelectionCursorY();
      const bounds = nativeSelectionBounds();
      const tagName = nativeSelectionTagName();

      setHasNativeSelection(false);
      clearNativeSelectionState();
      window.getSelection()?.removeAllRanges();

      const componentName = nativeSelectionComponentName();

      if (elements.length === 1) {
        await executeCopyOperation(
          currentX,
          currentY,
          () => copySingleElementToClipboard(elements[0]),
          bounds,
          tagName,
          componentName,
        );
      } else {
        await executeCopyOperation(
          currentX,
          currentY,
          () => copyMultipleElementsToClipboard(elements),
          bounds,
          tagName,
          componentName,
        );
      }
    };

    const handleNativeSelectionEnter = () => {
      const elements = nativeSelectionElements();
      if (elements.length === 0) return;

      const bounds = nativeSelectionBounds();
      const currentX = bounds
        ? bounds.x + bounds.width / 2
        : nativeSelectionCursorX();
      const currentY = bounds
        ? bounds.y + bounds.height / 2
        : nativeSelectionCursorY();

      setHasNativeSelection(false);
      clearNativeSelectionState();
      window.getSelection()?.removeAllRanges();

      setMouseX(currentX);
      setMouseY(currentY);
      setIsToggleMode(true);
      setIsToggleFrozen(true);
      setIsInputExpanded(true);
      activateRenderer();
      setIsInputMode(true);
    };

    const handlePointerMove = (clientX: number, clientY: number) => {
      if (isInputMode() || isToggleFrozen()) return;

      setDidJustCopy(false);
      setMouseX(clientX);
      setMouseY(clientY);

      const now = performance.now();
      if (now - lastElementDetectionTime >= ELEMENT_DETECTION_THROTTLE_MS) {
        lastElementDetectionTime = now;
        onIdle(() => {
          const candidate = getElementAtPosition(clientX, clientY);
          setDetectedElement(candidate);
        });
      }

      if (isDragging()) {
        const direction = getAutoScrollDirection(clientX, clientY);
        const isNearEdge =
          direction.top ||
          direction.bottom ||
          direction.left ||
          direction.right;

        if (isNearEdge && autoScrollAnimationId === null) {
          startAutoScroll();
        } else if (!isNearEdge && autoScrollAnimationId !== null) {
          stopAutoScroll();
        }
      }
    };

    const handlePointerDown = (clientX: number, clientY: number) => {
      if (!isRendererActive() || isCopying()) return false;

      setIsDragging(true);
      const startX = clientX + window.scrollX;
      const startY = clientY + window.scrollY;
      setDragStartX(startX);
      setDragStartY(startY);
      document.body.style.userSelect = "none";

      options.onDragStart?.(startX, startY);

      return true;
    };

    const handlePointerUp = (clientX: number, clientY: number) => {
      if (!isDragging()) return;

      const dragDistance = calculateDragDistance(clientX, clientY);

      const wasDragGesture =
        dragDistance.x > DRAG_THRESHOLD_PX ||
        dragDistance.y > DRAG_THRESHOLD_PX;

      setIsDragging(false);
      stopAutoScroll();
      document.body.style.userSelect = "";

      if (wasDragGesture) {
        setDidJustDrag(true);
        const dragRect = calculateDragRectangle(clientX, clientY);

        const elements = getElementsInDrag(dragRect, isValidGrabbableElement);
        const selectedElements =
          elements.length > 0
            ? elements
            : getElementsInDragLoose(dragRect, isValidGrabbableElement);

        if (selectedElements.length > 0) {
          options.onDragEnd?.(selectedElements, dragRect);
          const firstElement = selectedElements[0];
          const firstElementRect = firstElement.getBoundingClientRect();
          const bounds: OverlayBounds = {
            x: firstElementRect.left,
            y: firstElementRect.top,
            width: firstElementRect.width,
            height: firstElementRect.height,
            borderRadius: "0px",
            transform: stripTranslateFromTransform(firstElement),
          };
          const tagName = extractElementTagName(firstElement);

          const centerX = bounds.x + bounds.width / 2;
          const centerY = bounds.y + bounds.height / 2;

          if (hasAgentProvider()) {
            setMouseX(centerX);
            setMouseY(centerY);
            setFrozenElement(firstElement);
            setIsToggleMode(true);
            setIsToggleFrozen(true);
            setIsInputExpanded(true);
            setIsInputMode(true);
          } else {
            void getNearestComponentName(firstElement).then((componentName) => {
              void executeCopyOperation(
                centerX,
                centerY,
                () => copyMultipleElementsToClipboard(selectedElements),
                bounds,
                tagName,
                componentName ?? undefined,
                firstElement,
                true,
              );
            });
          }
        }
      } else {
        const element = getElementAtPosition(clientX, clientY);
        if (!element) return;

        setLastGrabbedElement(element);
        const bounds = createElementBounds(element);
        const tagName = extractElementTagName(element);
        void getNearestComponentName(element).then((componentName) => {
          void executeCopyOperation(
            clientX,
            clientY,
            () => copySingleElementToClipboard(element),
            bounds,
            tagName,
            componentName ?? undefined,
            element,
          );
        });
      }
    };

    const abortController = new AbortController();
    const eventListenerSignal = abortController.signal;

    const claimedEvents = new WeakSet<KeyboardEvent>();
    const isEnterCode = (code: string) =>
      code === "Enter" || code === "NumpadEnter";

    const originalKeyDescriptor = Object.getOwnPropertyDescriptor(
      KeyboardEvent.prototype,
      "key",
    ) as PropertyDescriptor & { get?: () => string };

    let didPatchKeyboardEvent = false;
    if (
      originalKeyDescriptor?.get &&
      !(originalKeyDescriptor.get as { __reactGrabPatched?: boolean })
        .__reactGrabPatched
    ) {
      didPatchKeyboardEvent = true;
      const originalGetter = originalKeyDescriptor.get;
      const patchedGetter = function (this: KeyboardEvent) {
        if (claimedEvents.has(this)) {
          return "";
        }
        return originalGetter.call(this);
      };
      (patchedGetter as { __reactGrabPatched?: boolean }).__reactGrabPatched =
        true;
      Object.defineProperty(KeyboardEvent.prototype, "key", {
        get: patchedGetter,
        configurable: true,
      });
    }

    const blockEnterIfNeeded = (event: KeyboardEvent) => {
      const originalKey = originalKeyDescriptor?.get
        ? originalKeyDescriptor.get.call(event)
        : event.key;
      const isEnterKey = originalKey === "Enter" || isEnterCode(event.code);
      const isOverlayActive = isActivated() || isHoldingKeys();
      const shouldBlockEnter =
        isEnterKey && isOverlayActive && !isInputMode() && !isToggleMode();

      if (shouldBlockEnter) {
        claimedEvents.add(event);
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return true;
      }
      return false;
    };

    document.addEventListener("keydown", blockEnterIfNeeded, {
      signal: eventListenerSignal,
      capture: true,
    });
    document.addEventListener("keyup", blockEnterIfNeeded, {
      signal: eventListenerSignal,
      capture: true,
    });
    document.addEventListener("keypress", blockEnterIfNeeded, {
      signal: eventListenerSignal,
      capture: true,
    });

    window.addEventListener(
      "keydown",
      (event: KeyboardEvent) => {
        blockEnterIfNeeded(event);

        const isEnterToActivateInput =
          isEnterCode(event.code) && isHoldingKeys() && !isInputMode();

        if (isEnterCode(event.code)) {
          console.log('[react-grab] Enter pressed:', {
            isHoldingKeys: isHoldingKeys(),
            isInputMode: isInputMode(),
            isToggleMode: isToggleMode(),
            isActivated: isActivated(),
          });
        }

        if (isInputMode() && isTargetKeyCombination(event, options)) {
          event.preventDefault();
          event.stopPropagation();
          setIsInputMode(false);
          setInputText("");
          setIsToggleFrozen(false);
          setIsInputExpanded(false);
          setIsPendingDismiss(false);
          return;
        }

        if (
          isInputMode() ||
          (isEventFromOverlay(event, "data-react-grab-ignore-events") &&
            !isEnterToActivateInput)
        ) {
          if (event.key === "Escape" && agentManager.isProcessing()) {
            agentManager.abortAllSessions();
          }
          return;
        }

        if (event.key === "Escape") {
          if (agentManager.isProcessing()) {
            agentManager.abortAllSessions();
            return;
          }

          if (isHoldingKeys()) {
            deactivateRenderer();
            return;
          }
        }

        const copiedElement = lastCopiedElement();
        if (
          isEnterCode(event.code) &&
          !isHoldingKeys() &&
          !isInputMode() &&
          !isActivated() &&
          copiedElement &&
          document.contains(copiedElement)
        ) {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();

          const bounds = createElementBounds(copiedElement);
          const selectionCenterX = bounds.x + bounds.width / 2;
          const centerY = bounds.y + bounds.height / 2;

          setMouseX(selectionCenterX);
          setMouseY(centerY);
          setCopyStartX(selectionCenterX);
          setCopyStartY(centerY);
          setCopyOffsetFromCenterX(0);
          setFrozenElement(copiedElement);
          setLastCopiedElement(null);
          setLabelInstances([]);

          const cachedInput = elementInputCache.get(copiedElement);
          if (cachedInput) {
            setInputText(cachedInput);
          }

          setIsToggleMode(true);
          setIsToggleFrozen(true);
          setIsInputExpanded(true);
          activateRenderer();
          setIsInputMode(true);
          return;
        }

        if (isEnterCode(event.code) && isHoldingKeys() && !isInputMode()) {
          console.log('[react-grab] Enter while holding - opening input mode');
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();

          const element = frozenElement() || targetElement();
          if (element) {
            const bounds = createElementBounds(element);
            const selectionCenterX = bounds.x + bounds.width / 2;
            setCopyStartX(mouseX());
            setCopyStartY(mouseY());
            setCopyOffsetFromCenterX(mouseX() - selectionCenterX);

            const cachedInput = elementInputCache.get(element);
            if (cachedInput) {
              setInputText(cachedInput);
            }
          }

          setIsToggleMode(true);
          setIsToggleFrozen(true);
          setIsInputExpanded(true);

          if (keydownSpamTimerId !== null) {
            window.clearTimeout(keydownSpamTimerId);
            keydownSpamTimerId = null;
          }

          if (!isActivated()) {
            if (holdTimerId) window.clearTimeout(holdTimerId);
            activateRenderer();
          }

          setIsInputMode(true);
          return;
        }

        if (event.key.toLowerCase() === "o" && !isInputMode()) {
          if (isActivated() && (event.metaKey || event.ctrlKey)) {
            const filePath = selectionFilePath();
            const lineNumber = selectionLineNumber();
            if (filePath) {
              event.preventDefault();
              event.stopPropagation();

              if (options.onOpenFile) {
                options.onOpenFile(filePath, lineNumber);
              } else {
                const url = buildOpenFileUrl(filePath, lineNumber);
                window.open(url, "_blank");
              }
            }
            return;
          }
        }

        if (
          !options.allowActivationInsideInput &&
          isKeyboardEventTriggeredByInput(event)
        ) {
          return;
        }

        if (!isTargetKeyCombination(event, options)) {
          if (
            isActivated() &&
            !isToggleMode() &&
            (event.metaKey || event.ctrlKey)
          ) {
            if (
              !MODIFIER_KEYS.includes(event.key) &&
              !isEnterCode(event.code)
            ) {
              deactivateRenderer();
            }
          }
          if (!isEnterCode(event.code) || !isHoldingKeys()) {
            return;
          }
        }

        if ((isActivated() || isHoldingKeys()) && !isInputMode()) {
          event.preventDefault();
          if (isEnterCode(event.code)) {
            event.stopPropagation();
            event.stopImmediatePropagation();
          }
        }

        if (isActivated()) {
          if (isToggleMode()) return;
          if (event.repeat) return;

          if (keydownSpamTimerId !== null) {
            window.clearTimeout(keydownSpamTimerId);
          }
          keydownSpamTimerId = window.setTimeout(() => {
            deactivateRenderer();
          }, 200);
          return;
        }

        if (isHoldingKeys() && event.repeat) return;

        if (holdTimerId !== null) {
          window.clearTimeout(holdTimerId);
        }

        if (!isHoldingKeys()) {
          setIsHoldingKeys(true);
        }

        holdTimerId = window.setTimeout(() => {
          setIsToggleMode(true);
          activateRenderer();
        }, options.keyHoldDuration);
      },
      { signal: eventListenerSignal, capture: true },
    );

    window.addEventListener(
      "keyup",
      (event: KeyboardEvent) => {
        if (blockEnterIfNeeded(event)) return;

        if (!isHoldingKeys() && !isActivated()) return;
        if (isInputMode()) return;

        const hasCustomShortcut = Boolean(
          options.activationShortcut || options.activationKey,
        );

        const getRequiredModifiers = () => {
          if (options.activationKey) {
            const { metaKey, ctrlKey, shiftKey, altKey } =
              options.activationKey;
            return {
              metaKey: !!metaKey,
              ctrlKey: !!ctrlKey,
              shiftKey: !!shiftKey,
              altKey: !!altKey,
            };
          }
          return {
            metaKey: true,
            ctrlKey: true,
            shiftKey: false,
            altKey: false,
          };
        };

        const requiredModifiers = getRequiredModifiers();
        const isReleasingModifier =
          requiredModifiers.metaKey || requiredModifiers.ctrlKey
            ? !event.metaKey && !event.ctrlKey
            : (requiredModifiers.shiftKey && !event.shiftKey) ||
              (requiredModifiers.altKey && !event.altKey);

        const isReleasingActivationKey = options.activationShortcut
          ? !options.activationShortcut(event)
          : options.activationKey
            ? options.activationKey.key
              ? event.key.toLowerCase() ===
                  options.activationKey.key.toLowerCase() ||
                keyMatchesCode(options.activationKey.key, event.code)
              : false
            : isCLikeKey(event.key, event.code);

        if (isActivated()) {
          if (isReleasingModifier) {
            if (isToggleMode()) return;
            deactivateRenderer();
          } else if (
            !hasCustomShortcut &&
            isReleasingActivationKey &&
            keydownSpamTimerId !== null
          ) {
            window.clearTimeout(keydownSpamTimerId);
            keydownSpamTimerId = null;
          }
          return;
        }

        if (isReleasingActivationKey || isReleasingModifier) {
          if (isToggleMode()) return;
          deactivateRenderer();
        }
      },
      { signal: eventListenerSignal, capture: true },
    );

    window.addEventListener("keypress", blockEnterIfNeeded, {
      signal: eventListenerSignal,
      capture: true,
    });

    window.addEventListener(
      "mousemove",
      (event: MouseEvent) => {
        setIsTouchMode(false);
        if (isEventFromOverlay(event, "data-react-grab-ignore-events")) return;
        handlePointerMove(event.clientX, event.clientY);
      },
      { signal: eventListenerSignal },
    );

    window.addEventListener(
      "mousedown",
      (event: MouseEvent) => {
        if (event.button !== 0) return;
        if (isEventFromOverlay(event, "data-react-grab-ignore-events")) return;

        if (isInputMode()) {
          handleInputCancel();
          return;
        }

        const didHandle = handlePointerDown(event.clientX, event.clientY);
        if (didHandle) {
          event.preventDefault();
          event.stopPropagation();
        }
      },
      { signal: eventListenerSignal, capture: true },
    );

    window.addEventListener(
      "pointerdown",
      (event: PointerEvent) => {
        if (event.button !== 0) return;
        if (isEventFromOverlay(event, "data-react-grab-ignore-events")) return;
        if (!isRendererActive() || isCopying() || isInputMode()) return;
        event.stopPropagation();
      },
      { signal: eventListenerSignal, capture: true },
    );

    window.addEventListener(
      "mouseup",
      (event: MouseEvent) => {
        if (event.button !== 0) return;
        handlePointerUp(event.clientX, event.clientY);
      },
      { signal: eventListenerSignal },
    );

    window.addEventListener(
      "touchmove",
      (event: TouchEvent) => {
        if (event.touches.length === 0) return;
        setIsTouchMode(true);
        if (isEventFromOverlay(event, "data-react-grab-ignore-events")) return;
        handlePointerMove(event.touches[0].clientX, event.touches[0].clientY);
      },
      { signal: eventListenerSignal, passive: true },
    );

    window.addEventListener(
      "touchstart",
      (event: TouchEvent) => {
        if (event.touches.length === 0) return;
        setIsTouchMode(true);

        if (isEventFromOverlay(event, "data-react-grab-ignore-events")) return;

        if (isInputMode()) {
          handleInputCancel();
          return;
        }

        const didHandle = handlePointerDown(
          event.touches[0].clientX,
          event.touches[0].clientY,
        );
        if (didHandle) {
          event.preventDefault();
        }
      },
      { signal: eventListenerSignal, passive: false },
    );

    window.addEventListener(
      "touchend",
      (event: TouchEvent) => {
        if (event.changedTouches.length === 0) return;
        handlePointerUp(
          event.changedTouches[0].clientX,
          event.changedTouches[0].clientY,
        );
      },
      { signal: eventListenerSignal },
    );

    window.addEventListener(
      "click",
      (event: MouseEvent) => {
        if (isEventFromOverlay(event, "data-react-grab-ignore-events")) return;

        if (isRendererActive() || isCopying() || didJustDrag()) {
          event.preventDefault();
          event.stopPropagation();

          const hadDrag = didJustDrag();
          if (hadDrag) {
            setDidJustDrag(false);
          }

          if (isToggleMode() && !isCopying()) {
            if (!isHoldingKeys()) {
              deactivateRenderer();
            } else {
              setIsToggleMode(false);
            }
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
          if (
            isActivated() &&
            !isInputMode() &&
            activationTimestamp !== null &&
            Date.now() - activationTimestamp > BLUR_DEACTIVATION_THRESHOLD_MS
          ) {
            deactivateRenderer();
          }
        }
      },
      { signal: eventListenerSignal },
    );

    window.addEventListener(
      "scroll",
      () => {
        setViewportVersion((version) => version + 1);
      },
      { signal: eventListenerSignal, capture: true },
    );

    window.addEventListener(
      "resize",
      () => {
        setViewportVersion((version) => version + 1);
      },
      { signal: eventListenerSignal },
    );

    const boundsRecalcIntervalId = setInterval(() => {
      setViewportVersion((version) => version + 1);
    }, BOUNDS_RECALC_INTERVAL_MS);

    onCleanup(() => clearInterval(boundsRecalcIntervalId));

    document.addEventListener(
      "copy",
      (event: ClipboardEvent) => {
        if (
          isInputMode() ||
          isEventFromOverlay(event, "data-react-grab-ignore-events")
        ) {
          return;
        }
        if (isRendererActive() || isCopying()) {
          event.preventDefault();
        }
      },
      { signal: eventListenerSignal, capture: true },
    );

    let selectionDebounceTimerId: number | null = null;

    document.addEventListener(
      "selectionchange",
      () => {
        if (isRendererActive()) return;

        if (selectionDebounceTimerId !== null) {
          window.clearTimeout(selectionDebounceTimerId);
        }

        setHasNativeSelection(false);

        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
          clearNativeSelectionState();
          return;
        }

        selectionDebounceTimerId = window.setTimeout(() => {
          selectionDebounceTimerId = null;

          const currentSelection = window.getSelection();
          if (
            !currentSelection ||
            currentSelection.isCollapsed ||
            currentSelection.rangeCount === 0
          ) {
            return;
          }

          const range = currentSelection.getRangeAt(0);
          const rangeRect = range.getBoundingClientRect();

          if (rangeRect.width === 0 && rangeRect.height === 0) {
            clearNativeSelectionState();
            return;
          }

          const selectedText = currentSelection.toString().trim();
          if (!selectedText) {
            clearNativeSelectionState();
            return;
          }

          const isBackward = (() => {
            if (!currentSelection.anchorNode || !currentSelection.focusNode)
              return false;
            const position =
              currentSelection.anchorNode.compareDocumentPosition(
                currentSelection.focusNode,
              );
            if (position & Node.DOCUMENT_POSITION_FOLLOWING) return false;
            if (position & Node.DOCUMENT_POSITION_PRECEDING) return true;
            return currentSelection.anchorOffset > currentSelection.focusOffset;
          })();

          const clientRects = range.getClientRects();
          if (clientRects.length === 0) {
            clearNativeSelectionState();
            return;
          }

          const cursorRect = isBackward
            ? clientRects[0]
            : clientRects[clientRects.length - 1];
          const cursorX = isBackward ? cursorRect.left : cursorRect.right;
          const cursorY = cursorRect.top + cursorRect.height / 2;

          if (isSelectionInsideEditableElement(cursorX, cursorY)) {
            clearNativeSelectionState();
            return;
          }

          const container = range.commonAncestorContainer;
          const element =
            container.nodeType === Node.ELEMENT_NODE
              ? (container as Element)
              : container.parentElement;

          if (element && isValidGrabbableElement(element)) {
            setNativeSelectionCursorX(cursorX);
            setNativeSelectionCursorY(cursorY);
            setNativeSelectionElements([element]);
            setHasNativeSelection(true);
          } else {
            clearNativeSelectionState();
          }
        }, 150);
      },
      { signal: eventListenerSignal },
    );

    onCleanup(() => {
      abortController.abort();
      if (holdTimerId) window.clearTimeout(holdTimerId);
      if (keydownSpamTimerId) window.clearTimeout(keydownSpamTimerId);
      stopAutoScroll();
      stopProgressAnimation();
      document.body.style.userSelect = "";
      setCursorOverride(null);
      if (didPatchKeyboardEvent && originalKeyDescriptor) {
        Object.defineProperty(
          KeyboardEvent.prototype,
          "key",
          originalKeyDescriptor,
        );
      }
    });

    const rendererRoot = mountRoot(cssText as string);

    const selectionVisible = createMemo(() => {
      if (!theme().selectionBox.enabled) return false;
      if (didJustCopy()) return false;
      return isRendererActive() && !isDragging() && Boolean(effectiveElement());
    });

    const selectionTagName = createMemo(() => {
      const element = effectiveElement();
      if (!element) return undefined;
      return extractElementTagName(element) || undefined;
    });

    const [selectionComponentName] = createResource(
      () => effectiveElement(),
      async (element) => {
        if (!element) return undefined;
        const name = await getNearestComponentName(element);
        return name ?? undefined;
      },
    );

    const selectionLabelVisible = createMemo(() => {
      if (!theme().elementLabel.enabled) return false;
      if (didJustCopy()) return false;
      return isRendererActive() && !isDragging() && Boolean(effectiveElement());
    });

    const computedLabelInstances = createMemo(() => {
      viewportVersion();
      return labelInstances().map((instance) => {
        if (!instance.element || !document.body.contains(instance.element)) {
          return instance;
        }
        return {
          ...instance,
          bounds: createElementBounds(instance.element),
        };
      });
    });

    const dragVisible = createMemo(
      () =>
        theme().dragBox.enabled &&
        isRendererActive() &&
        isDraggingBeyondThreshold(),
    );

    const labelVariant = createMemo(() =>
      isCopying() ? "processing" : "hover",
    );

    const labelVisible = createMemo(() => {
      if (!theme().elementLabel.enabled) return false;
      if (isInputMode()) return false;
      if (isCopying()) return true;
      return isRendererActive() && !isDragging() && Boolean(effectiveElement());
    });

    const crosshairVisible = createMemo(
      () =>
        theme().crosshair.enabled &&
        isRendererActive() &&
        !isDragging() &&
        !isTouchMode() &&
        !isToggleFrozen(),
    );

    const shouldShowGrabbedBoxes = createMemo(
      () => theme().grabbedBoxes.enabled,
    );
    createEffect(
      on(theme, (currentTheme) => {
        if (currentTheme.hue !== 0) {
          rendererRoot.style.filter = `hue-rotate(${currentTheme.hue}deg)`;
        } else {
          rendererRoot.style.filter = "";
        }
      }),
    );

    if (theme().enabled) {
      render(
        () => (
          <ReactGrabRenderer
            selectionVisible={selectionVisible()}
            selectionBounds={selectionBounds()}
            selectionFilePath={selectionFilePath()}
            selectionLineNumber={selectionLineNumber()}
            selectionTagName={selectionTagName()}
            selectionComponentName={selectionComponentName()}
            selectionLabelVisible={selectionLabelVisible()}
            selectionLabelStatus={selectionLabelStatus()}
            labelInstances={computedLabelInstances()}
            dragVisible={dragVisible()}
            dragBounds={dragBounds()}
            grabbedBoxes={shouldShowGrabbedBoxes() ? grabbedBoxes() : []}
            labelZIndex={Z_INDEX_LABEL}
            mouseX={cursorPosition().x}
            mouseY={cursorPosition().y}
            crosshairVisible={crosshairVisible()}
            inputValue={inputText()}
            isInputExpanded={isInputExpanded()}
            hasAgent={hasAgentProvider()}
            isAgentConnected={isAgentConnected()}
            agentSessions={agentManager.sessions()}
            onAbortSession={(sessionId) => agentManager.abortSession(sessionId)}
            onInputChange={handleInputChange}
            onInputSubmit={() => void handleInputSubmit()}
            onInputCancel={handleInputCancel}
            onToggleExpand={handleToggleExpand}
            isPendingDismiss={isPendingDismiss()}
            onConfirmDismiss={handleConfirmDismiss}
            onCancelDismiss={handleCancelDismiss}
            nativeSelectionCursorVisible={hasNativeSelection()}
            nativeSelectionCursorX={nativeSelectionCursorX()}
            nativeSelectionCursorY={nativeSelectionCursorY()}
            nativeSelectionTagName={nativeSelectionTagName()}
            nativeSelectionComponentName={nativeSelectionComponentName()}
            nativeSelectionBounds={nativeSelectionBounds()}
            onNativeSelectionCopy={() => void handleNativeSelectionCopy()}
            onNativeSelectionEnter={handleNativeSelectionEnter}
            theme={theme()}
          />
        ),
        rendererRoot,
      );
    }

    if (hasAgentProvider()) {
      agentManager.tryResumeSessions();
    }

    const copyElementAPI = async (
      elements: Element | Element[],
    ): Promise<boolean> => {
      const elementsArray = Array.isArray(elements) ? elements : [elements];
      if (elementsArray.length === 0) return false;

      await options.onBeforeCopy?.(elementsArray);

      const didCopy = await tryCopyWithFallback(elementsArray);

      options.onAfterCopy?.(elementsArray, didCopy);

      return didCopy;
    };

    const getStateAPI = (): ReactGrabState => ({
      isActive: isActivated(),
      isDragging: isDragging(),
      isCopying: isCopying(),
      isInputMode: isInputMode(),
      targetElement: targetElement(),
      dragBounds: dragBounds()
        ? {
            x: dragBounds()!.x,
            y: dragBounds()!.y,
            width: dragBounds()!.width,
            height: dragBounds()!.height,
          }
        : null,
    });

    return {
      activate: () => {
        if (!isActivated()) {
          setIsToggleMode(true);
          activateRenderer();
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
          setIsToggleMode(true);
          activateRenderer();
        }
      },
      isActive: () => isActivated(),
      dispose: () => {
        hasInited = false;
        dispose();
      },
      copyElement: copyElementAPI,
      getState: getStateAPI,
      updateTheme: (partialTheme: DeepPartial<Theme>) => {
        const currentTheme = theme();
        const mergedTheme = deepMergeTheme(currentTheme, partialTheme);
        setTheme(mergedTheme);
      },
      getTheme: () => theme(),
      setAgent: (newAgentOptions: AgentOptions) => {
        const existingOptions = agentManager.getOptions();
        const mergedOptions: AgentOptions = {
          ...existingOptions,
          ...newAgentOptions,
          provider: newAgentOptions.provider ?? existingOptions?.provider,
          onAbort: (session: AgentSession, element: Element | undefined) => {
            newAgentOptions?.onAbort?.(session, element);

            if (element && document.contains(element)) {
              const rect = element.getBoundingClientRect();
              const centerY = rect.top + rect.height / 2;

              setMouseX(session.position.x);
              setMouseY(centerY);
              setFrozenElement(element);
              setInputText(session.context.prompt);
              setIsInputExpanded(true);
              setIsInputMode(true);
              setIsToggleMode(true);
              setIsToggleFrozen(true);

              if (!isActivated()) {
                activateRenderer();
              }
            }
          },
        };
        agentManager.setOptions(mergedOptions);
        setHasAgentProvider(Boolean(mergedOptions.provider));

        if (mergedOptions.provider?.checkConnection) {
          void mergedOptions.provider.checkConnection().then((connected) => {
            setIsAgentConnected(connected);
          });
        }

        agentManager.tryResumeSessions();
      },
    };
  });
};

export { getStack, getElementContext as formatElementInfo } from "./context.js";
export { isInstrumentationActive } from "bippy";
export { DEFAULT_THEME } from "./theme.js";

export type {
  Options,
  OverlayBounds,
  ReactGrabRendererProps,
  ReactGrabAPI,
  AgentContext,
  AgentSession,
  AgentSessionStorage,
  AgentProvider,
} from "./types.js";

export { generateSnippet } from "./utils/generate-snippet.js";
