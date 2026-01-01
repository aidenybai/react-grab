// @ts-expect-error - CSS imported as text via tsup loader
import cssText from "../../dist/styles.css";
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
import { createGrabStore } from "./store.js";
import { isKeyboardEventTriggeredByInput } from "../utils/is-keyboard-event-triggered-by-input.js";
import { mountRoot } from "../utils/mount-root.js";
import { ReactGrabRenderer } from "../components/renderer.js";
import { getStack, getNearestComponentName } from "./context.js";
import { isSourceFile, normalizeFileName } from "bippy/source";
import { createNoopApi } from "./noop-api.js";
import { createEventListenerManager } from "./events.js";
import { tryCopyWithFallback } from "./copy.js";
import { getElementAtPosition } from "../utils/get-element-at-position.js";
import { isValidGrabbableElement } from "../utils/is-valid-grabbable-element.js";
import { getElementsInDrag } from "../utils/get-elements-in-drag.js";
import { createElementBounds } from "../utils/create-element-bounds.js";
import { getTagName } from "../utils/get-tag-name.js";
import {
  SUCCESS_LABEL_DURATION_MS,
  COPIED_LABEL_DURATION_MS,
  DRAG_THRESHOLD_PX,
  ELEMENT_DETECTION_THROTTLE_MS,
  Z_INDEX_LABEL,
  MODIFIER_KEYS,
  BLUR_DEACTIVATION_THRESHOLD_MS,
  BOUNDS_RECALC_INTERVAL_MS,
  INPUT_FOCUS_ACTIVATION_DELAY_MS,
  DEFAULT_KEY_HOLD_DURATION_MS,
  DOUBLE_CLICK_THRESHOLD_MS,
} from "../constants.js";
import { getBoundsCenter } from "../utils/get-bounds-center.js";
import { isCLikeKey } from "../utils/is-c-like-key.js";
import { keyMatchesCode } from "../utils/key-matches-code.js";
import { isTargetKeyCombination } from "../utils/is-target-key-combination.js";
import { isEventFromOverlay } from "../utils/is-event-from-overlay.js";
import { buildOpenFileUrl } from "../utils/build-open-file-url.js";
import type {
  Options,
  OverlayBounds,
  GrabbedBox,
  ReactGrabAPI,
  ReactGrabState,
  DeepPartial,
  Theme,
  SelectionLabelInstance,
  AgentSession,
  AgentOptions,
  UpdatableOptions,
} from "../types.js";
import { mergeTheme, deepMergeTheme } from "./theme.js";
import { createAgentManager } from "./agent/index.js";
import { createArrowNavigator } from "./arrow-navigation.js";
import {
  getRequiredModifiers,
  setupKeyboardEventClaimer,
} from "./keyboard-handlers.js";
import { createAutoScroller, getAutoScrollDirection } from "./auto-scroll.js";
import { logIntro } from "./log-intro.js";
import { onIdle } from "../utils/on-idle.js";
import { getScriptOptions } from "../utils/get-script-options.js";
import { isEnterCode } from "../utils/is-enter-code.js";

let hasInited = false;

export const init = (rawOptions?: Options): ReactGrabAPI => {
  if (typeof window === "undefined") {
    return createNoopApi(mergeTheme(rawOptions?.theme));
  }

  const scriptOptions = getScriptOptions();

  let options: Options = {
    enabled: true,
    activationMode: "toggle",
    keyHoldDuration: DEFAULT_KEY_HOLD_DURATION_MS,
    allowActivationInsideInput: true,
    maxContextLines: 3,
    ...scriptOptions,
    ...rawOptions,
  };

  const mergedTheme = mergeTheme(options.theme);

  if (options.enabled === false || hasInited) {
    return createNoopApi(mergedTheme);
  }
  hasInited = true;

  logIntro();

  return createRoot((dispose) => {
    const [theme, setTheme] = createSignal(mergedTheme);

    const { store, actions } = createGrabStore({
      theme: mergedTheme,
      hasAgentProvider: Boolean(options.agent?.provider),
      keyHoldDuration: options.keyHoldDuration ?? DEFAULT_KEY_HOLD_DURATION_MS,
    });

    const isHoldingKeys = createMemo(() => store.current.state === "holding");

    const isActivated = createMemo(() => store.current.state === "active");

    const isToggleFrozen = createMemo(
      () =>
        store.current.state === "active" && store.current.phase === "frozen",
    );

    const isDragging = createMemo(
      () =>
        store.current.state === "active" && store.current.phase === "dragging",
    );

    const didJustDrag = createMemo(
      () =>
        store.current.state === "active" &&
        store.current.phase === "justDragged",
    );

    const isCopying = createMemo(() => store.current.state === "copying");

    const didJustCopy = createMemo(() => store.current.state === "justCopied");

    const isInputMode = createMemo(
      () => store.current.state === "active" && store.current.isInputMode,
    );

    const isPendingDismiss = createMemo(
      () =>
        store.current.state === "active" &&
        store.current.isInputMode &&
        store.current.isPendingDismiss,
    );

    const pendingAbortSessionId = createMemo(
      () => store.pendingAbortSessionId,
    );

    const hasAgentProvider = createMemo(() => store.hasAgentProvider);

    // Timer effect: holding -> active after key hold duration
    createEffect(() => {
      if (store.current.state !== "holding") return;
      const timerId = setTimeout(() => {
        actions.activate();
      }, store.keyHoldDuration);
      onCleanup(() => clearTimeout(timerId));
    });

    // Timer effect: justDragged -> hovering after success label duration
    createEffect(() => {
      if (
        store.current.state !== "active" ||
        store.current.phase !== "justDragged"
      )
        return;
      const timerId = setTimeout(() => {
        actions.finishJustDragged();
      }, SUCCESS_LABEL_DURATION_MS);
      onCleanup(() => clearTimeout(timerId));
    });

    // Timer effect: justCopied -> idle after copied label duration
    createEffect(() => {
      if (store.current.state !== "justCopied") return;
      const timerId = setTimeout(() => {
        actions.finishJustCopied();
      }, COPIED_LABEL_DURATION_MS);
      onCleanup(() => clearTimeout(timerId));
    });

    let previouslyHoldingKeys = false;
    createEffect(() => {
      const currentlyHolding = isHoldingKeys();
      const currentlyActive = isActivated();

      if (previouslyHoldingKeys && !currentlyHolding && currentlyActive) {
        if (options.activationMode !== "hold") {
          actions.setToggleMode(true);
        }
        options.onActivate?.();
      }
      previouslyHoldingKeys = currentlyHolding;
    });

    const elementInputCache = new WeakMap<Element, string>();

    const loadCachedInput = (element: Element) => {
      const cachedInput = elementInputCache.get(element);
      if (cachedInput) {
        actions.setInputText(cachedInput);
      }
    };

    const prepareInputMode = (
      element: Element,
      positionX: number,
      positionY: number,
    ) => {
      setCopyStartPosition(element, positionX, positionY);
      loadCachedInput(element);
    };

    const activateInputMode = () => {
      const element = store.frozenElement || targetElement();
      if (element) {
        actions.enterInputMode(
          { x: store.pointer.x, y: store.pointer.y },
          element,
        );
      }
    };

    const setCopyStartPosition = (
      element: Element,
      positionX: number,
      positionY: number,
    ) => {
      actions.setCopyStart({ x: positionX, y: positionY }, element);
      return createElementBounds(element);
    };

    let lastElementDetectionTime = 0;
    let keydownSpamTimerId: number | null = null;
    let pendingClickTimeoutId: number | null = null;
    let pendingClickData: {
      clientX: number;
      clientY: number;
      element: Element;
    } | null = null;

    const arrowNavigator = createArrowNavigator(
      isValidGrabbableElement,
      createElementBounds,
    );

    const autoScroller = createAutoScroller(
      () => store.pointer,
      () => isDragging(),
    );

    const isRendererActive = createMemo(() => isActivated() && !isCopying());

    const showTemporaryGrabbedBox = (
      bounds: OverlayBounds,
      element: Element,
    ) => {
      const boxId = `grabbed-${Date.now()}-${Math.random()}`;
      const createdAt = Date.now();
      const newBox: GrabbedBox = { id: boxId, bounds, createdAt, element };

      actions.addGrabbedBox(newBox);
      options.onGrabbedBox?.(bounds, element);

      setTimeout(() => {
        actions.removeGrabbedBox(boxId);
      }, SUCCESS_LABEL_DURATION_MS);
    };

    const notifyElementsSelected = (elements: Element[]) => {
      const elementsPayload = elements.map((element) => ({
        tagName: getTagName(element),
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
      status: SelectionLabelInstance["status"],
      element?: Element,
      mouseX?: number,
    ): string => {
      const instanceId = `label-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const instance: SelectionLabelInstance = {
        id: instanceId,
        bounds,
        tagName,
        componentName,
        status,
        createdAt: Date.now(),
        element,
        mouseX,
      };
      actions.addLabelInstance(instance);
      return instanceId;
    };

    const updateLabelInstance = (
      instanceId: string,
      status: SelectionLabelInstance["status"],
    ) => {
      actions.updateLabelInstance(instanceId, status);
    };

    const removeLabelInstance = (instanceId: string) => {
      actions.removeLabelInstance(instanceId);
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
      actions.startCopy();

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
        actions.completeCopy(element);

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

        if (store.isToggleMode || shouldDeactivateAfter) {
          deactivateRenderer();
        }
      });
    };

    const copyWithFallback = (elements: Element[], extraPrompt?: string) =>
      tryCopyWithFallback(options, elements, extraPrompt);

    const copyElementsToClipboard = async (
      targetElements: Element[],
      extraPrompt?: string,
    ): Promise<void> => {
      if (targetElements.length === 0) return;

      for (const element of targetElements) {
        options.onElementSelect?.(element);
        if (theme().grabbedBoxes.enabled) {
          showTemporaryGrabbedBox(createElementBounds(element), element);
        }
      }
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await copyWithFallback(targetElements, extraPrompt);
      notifyElementsSelected(targetElements);
    };

    interface CopyWithLabelOptions {
      element: Element;
      positionX: number;
      positionY: number;
      elements?: Element[];
      extraPrompt?: string;
      shouldDeactivateAfter?: boolean;
      onComplete?: () => void;
    }

    const performCopyWithLabel = ({
      element,
      positionX,
      positionY,
      elements,
      extraPrompt,
      shouldDeactivateAfter,
      onComplete,
    }: CopyWithLabelOptions) => {
      const bounds = createElementBounds(element);
      const tagName = getTagName(element);
      void getNearestComponentName(element).then((componentName) => {
        void executeCopyOperation(
          positionX,
          positionY,
          () => copyElementsToClipboard(elements ?? [element], extraPrompt),
          bounds,
          tagName,
          componentName ?? undefined,
          element,
          shouldDeactivateAfter,
        ).then(() => {
          onComplete?.();
        });
      });
    };

    const targetElement = createMemo(() => {
      if (!isRendererActive() || isDragging()) return null;
      const element = store.detectedElement;
      if (element && !document.contains(element)) return null;
      return element;
    });

    const effectiveElement = createMemo(
      () => store.frozenElement || (isToggleFrozen() ? null : targetElement()),
    );

    createEffect(() => {
      const element = store.detectedElement;
      if (!element) return;

      const intervalId = setInterval(() => {
        if (!document.contains(element)) {
          actions.setDetectedElement(null);
        }
      }, 100);

      onCleanup(() => clearInterval(intervalId));
    });

    const selectionBounds = createMemo((): OverlayBounds | undefined => {
      void store.viewportVersion;
      const element = effectiveElement();
      if (!element) return undefined;
      return createElementBounds(element);
    });

    const frozenElementsBounds = createMemo((): OverlayBounds[] => {
      void store.viewportVersion;
      const elements = store.frozenElements;
      if (elements.length === 0) return [];
      return elements.map((element) => createElementBounds(element));
    });

    const frozenElementsCount = createMemo(() => store.frozenElements.length);

    const calculateDragDistance = (endX: number, endY: number) => {
      const endPageX = endX + window.scrollX;
      const endPageY = endY + window.scrollY;

      return {
        x: Math.abs(endPageX - store.dragStart.x),
        y: Math.abs(endPageY - store.dragStart.y),
      };
    };

    const isDraggingBeyondThreshold = createMemo(() => {
      if (!isDragging()) return false;

      const dragDistance = calculateDragDistance(
        store.pointer.x,
        store.pointer.y,
      );

      return (
        dragDistance.x > DRAG_THRESHOLD_PX || dragDistance.y > DRAG_THRESHOLD_PX
      );
    });

    const calculateDragRectangle = (endX: number, endY: number) => {
      const endPageX = endX + window.scrollX;
      const endPageY = endY + window.scrollY;

      const dragPageX = Math.min(store.dragStart.x, endPageX);
      const dragPageY = Math.min(store.dragStart.y, endPageY);
      const dragWidth = Math.abs(endPageX - store.dragStart.x);
      const dragHeight = Math.abs(endPageY - store.dragStart.y);

      return {
        x: dragPageX - window.scrollX,
        y: dragPageY - window.scrollY,
        width: dragWidth,
        height: dragHeight,
      };
    };

    const dragBounds = createMemo((): OverlayBounds | undefined => {
      if (!isDraggingBeyondThreshold()) return undefined;

      const drag = calculateDragRectangle(store.pointer.x, store.pointer.y);

      return {
        borderRadius: "0px",
        height: drag.height,
        transform: "none",
        width: drag.width,
        x: drag.x,
        y: drag.y,
      };
    });

    const cursorPosition = createMemo(() => {
      if (isCopying() || isInputMode()) {
        void store.viewportVersion;
        const element = store.frozenElement || targetElement();
        if (element) {
          const bounds = createElementBounds(element);
          return {
            x: getBoundsCenter(bounds).x + store.copyOffsetFromCenterX,
            y: store.copyStart.y,
          };
        }
        return {
          x: store.copyStart.x,
          y: store.copyStart.y,
        };
      }
      return {
        x: store.pointer.x,
        y: store.pointer.y,
      };
    });

    createEffect(
      on(
        () => [targetElement(), store.lastGrabbedElement] as const,
        ([currentElement, lastElement]) => {
          if (lastElement && currentElement && lastElement !== currentElement) {
            actions.setLastGrabbed(null);
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
            actions.setSelectionSource(null, null);
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
                  actions.setSelectionSource(
                    normalizeFileName(frame.fileName),
                    frame.lineNumber ?? null,
                  );
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
        () => store.viewportVersion,
        () => agentManager._internal.updateBoundsOnViewportChange(),
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
        () =>
          [isInputMode(), store.pointer.x, store.pointer.y, targetElement()] as const,
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
        () => [crosshairVisible(), store.pointer.x, store.pointer.y] as const,
        ([visible, x, y]) => {
          options.onCrosshair?.(Boolean(visible), { x, y });
        },
      ),
    );

    createEffect(
      on(
        () => [labelVisible(), labelVariant(), cursorPosition()] as const,
        ([visible, variant, position]) => {
          options.onElementLabel?.(Boolean(visible), variant, {
            x: position.x,
            y: position.y,
            content: "",
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

    const activateRenderer = () => {
      const wasInHoldingState = isHoldingKeys();
      actions.activate();
      // HACK: Only call onActivate if we weren't in holding state.
      // When coming from holding state, the reactive effect (previouslyHoldingKeys transition)
      // will handle calling onActivate to avoid duplicate invocations.
      if (!wasInHoldingState) {
        options.onActivate?.();
      }
    };

    const deactivateRenderer = () => {
      const wasDragging = isDragging();
      const previousFocused = store.previouslyFocusedElement;
      actions.deactivate();
      arrowNavigator.clearHistory();
      if (wasDragging) {
        document.body.style.userSelect = "";
      }
      if (keydownSpamTimerId) window.clearTimeout(keydownSpamTimerId);
      if (pendingClickTimeoutId) {
        window.clearTimeout(pendingClickTimeoutId);
        pendingClickTimeoutId = null;

        const pendingClick = pendingClickData;
        pendingClickData = null;

        if (pendingClick) {
          actions.setLastGrabbed(pendingClick.element);
          performCopyWithLabel({
            element: pendingClick.element,
            positionX: pendingClick.clientX,
            positionY: pendingClick.clientY,
          });
        }
      }
      autoScroller.stop();
      if (
        previousFocused instanceof HTMLElement &&
        document.contains(previousFocused)
      ) {
        previousFocused.focus();
      }
      options.onDeactivate?.();
    };

    const toggleActivate = () => {
      actions.setToggleMode(true);
      activateRenderer();
    };

    const restoreInputFromSession = (
      session: AgentSession,
      elements: Element[],
    ) => {
      const element = elements[0];
      if (element && document.contains(element)) {
        const rect = element.getBoundingClientRect();
        const centerY = rect.top + rect.height / 2;

        actions.setPointer({ x: session.position.x, y: centerY });
        actions.setFrozenElements(elements);
        actions.setInputText(session.context.prompt);
        actions.setToggleMode(true);

        if (!isActivated()) {
          activateRenderer();
        }
      }
    };

    const agentOptions = options.agent
      ? {
          ...options.agent,
          onAbort: (session: AgentSession, elements: Element[]) => {
            options.agent?.onAbort?.(session, elements);
            restoreInputFromSession(session, elements);
          },
          onUndo: (session: AgentSession, elements: Element[]) => {
            options.agent?.onUndo?.(session, elements);
            restoreInputFromSession(session, elements);
          },
        }
      : undefined;

    const agentManager = createAgentManager(agentOptions);

    const handleInputChange = (value: string) => {
      actions.setInputText(value);
    };

    const handleInputSubmit = () => {
      actions.setLastCopied(null);
      const frozenElements = store.frozenElements;
      const element = store.frozenElement || targetElement();
      const prompt = isInputMode() ? store.inputText.trim() : "";

      if (!element) {
        deactivateRenderer();
        return;
      }

      const elements =
        frozenElements.length > 0 ? frozenElements : element ? [element] : [];

      const currentSelectionBounds = elements.map((el) =>
        createElementBounds(el),
      );
      const firstBounds = currentSelectionBounds[0];
      const labelPositionX = store.pointer.x;
      const currentX = firstBounds.x + firstBounds.width / 2;
      const currentY = firstBounds.y + firstBounds.height / 2;

      if (hasAgentProvider() && prompt) {
        elementInputCache.delete(element);
        deactivateRenderer();

        const currentReplySessionId = store.replySessionId;
        actions.setReplySessionId(null);

        void agentManager.session.start({
          elements,
          prompt,
          position: { x: labelPositionX, y: currentY },
          selectionBounds: currentSelectionBounds,
          sessionId: currentReplySessionId ?? undefined,
        });

        return;
      }

      actions.setPointer({ x: currentX, y: currentY });
      actions.exitInputMode();
      actions.clearInputText();
      actions.clearReplySessionId();

      if (prompt) {
        elementInputCache.set(element, prompt);
      } else {
        elementInputCache.delete(element);
      }

      performCopyWithLabel({
        element,
        positionX: currentX,
        positionY: currentY,
        elements,
        extraPrompt: prompt || undefined,
        onComplete: deactivateRenderer,
      });
    };

    const handleInputCancel = () => {
      actions.setLastCopied(null);
      if (!isInputMode()) return;

      const currentInput = store.inputText.trim();
      if (currentInput && !isPendingDismiss()) {
        actions.setPendingDismiss(true);
        return;
      }

      const element = store.frozenElement || targetElement();
      if (element && currentInput) {
        elementInputCache.set(element, currentInput);
      }

      actions.clearInputText();
      actions.clearReplySessionId();
      deactivateRenderer();
    };

    const handleConfirmDismiss = () => {
      actions.clearInputText();
      actions.clearReplySessionId();
      deactivateRenderer();
    };

    const handleCancelDismiss = () => {
      actions.setPendingDismiss(false);
    };

    const handleAgentAbort = (sessionId: string, confirmed: boolean) => {
      actions.setPendingAbortSessionId(null);
      if (confirmed) {
        agentManager.session.abort(sessionId);
      }
    };

    const handleToggleExpand = () => {
      if (!hasAgentProvider()) return;
      const element = store.frozenElement || targetElement();
      if (element) {
        prepareInputMode(element, store.pointer.x, store.pointer.y);
      }
      activateInputMode();
    };

    const handleFollowUpSubmit = (sessionId: string, prompt: string) => {
      const session = agentManager.sessions().get(sessionId);
      const elements = agentManager.session.getElements(sessionId);
      const sessionBounds = session?.selectionBounds ?? [];
      const firstBounds = sessionBounds[0];
      if (session && elements.length > 0 && firstBounds) {
        const positionX = session.position.x;
        const followUpSessionId = session.context.sessionId ?? sessionId;

        agentManager.session.dismiss(sessionId);

        void agentManager.session.start({
          elements,
          prompt,
          position: {
            x: positionX,
            y: firstBounds.y + firstBounds.height / 2,
          },
          selectionBounds: sessionBounds,
          sessionId: followUpSessionId,
        });
      }
    };

    const handleAcknowledgeError = (sessionId: string) => {
      const prompt = agentManager.session.acknowledgeError(sessionId);
      if (prompt) {
        actions.setInputText(prompt);
      }
    };

    const handleToggleActive = () => {
      if (isActivated()) {
        deactivateRenderer();
      } else {
        toggleActivate();
      }
    };

    const handlePointerMove = (clientX: number, clientY: number) => {
      if (isInputMode() || isToggleFrozen() || store.contextMenuPosition !== null) return;

      actions.setPointer({ x: clientX, y: clientY });

      const now = performance.now();
      if (now - lastElementDetectionTime >= ELEMENT_DETECTION_THROTTLE_MS) {
        lastElementDetectionTime = now;
        onIdle(() => {
          const candidate = getElementAtPosition(clientX, clientY);
          actions.setDetectedElement(candidate);
        });
      }

      if (isDragging()) {
        const direction = getAutoScrollDirection(clientX, clientY);
        const isNearEdge =
          direction.top ||
          direction.bottom ||
          direction.left ||
          direction.right;

        if (isNearEdge && !autoScroller.isActive()) {
          autoScroller.start();
        } else if (!isNearEdge && autoScroller.isActive()) {
          autoScroller.stop();
        }
      }
    };

    const handlePointerDown = (clientX: number, clientY: number) => {
      if (!isRendererActive() || isCopying()) return false;

      actions.startDrag({ x: clientX, y: clientY });
      document.body.style.userSelect = "none";

      options.onDragStart?.(clientX + window.scrollX, clientY + window.scrollY);

      return true;
    };

    const handleDragSelection = (
      dragSelectionRect: ReturnType<typeof calculateDragRectangle>,
    ) => {
      const elements = getElementsInDrag(
        dragSelectionRect,
        isValidGrabbableElement,
      );
      const selectedElements =
        elements.length > 0
          ? elements
          : getElementsInDrag(
              dragSelectionRect,
              isValidGrabbableElement,
              false,
            );

      if (selectedElements.length === 0) return;

      options.onDragEnd?.(selectedElements, dragSelectionRect);
      const firstElement = selectedElements[0];
      const center = getBoundsCenter(createElementBounds(firstElement));

      if (hasAgentProvider()) {
        actions.setPointer(center);
        actions.setFrozenElements(selectedElements);
        activateInputMode();
        if (!isActivated()) {
          activateRenderer();
        }
      } else {
        performCopyWithLabel({
          element: firstElement,
          positionX: center.x,
          positionY: center.y,
          elements: selectedElements,
          shouldDeactivateAfter: true,
        });
      }
    };

    const handleSingleClick = (clientX: number, clientY: number) => {
      const element = getElementAtPosition(clientX, clientY);
      if (!element) return;

      if (hasAgentProvider()) {
        if (pendingClickTimeoutId !== null) {
          window.clearTimeout(pendingClickTimeoutId);
          pendingClickTimeoutId = null;

          const clickElement = pendingClickData?.element ?? element;
          pendingClickData = null;

          prepareInputMode(clickElement, clientX, clientY);
          actions.setPointer({ x: clientX, y: clientY });
          actions.setFrozenElement(clickElement);
          activateInputMode();
          return;
        }

        pendingClickData = { clientX, clientY, element };
        pendingClickTimeoutId = window.setTimeout(() => {
          pendingClickTimeoutId = null;
          const pendingClick = pendingClickData;
          pendingClickData = null;

          if (!pendingClick) return;

          actions.setLastGrabbed(pendingClick.element);
          performCopyWithLabel({
            element: pendingClick.element,
            positionX: pendingClick.clientX,
            positionY: pendingClick.clientY,
          });
        }, DOUBLE_CLICK_THRESHOLD_MS);
      } else {
        actions.setLastGrabbed(element);
        performCopyWithLabel({
          element,
          positionX: clientX,
          positionY: clientY,
        });
      }
    };

    const handlePointerUp = (clientX: number, clientY: number) => {
      if (!isDragging()) return;

      const dragDistance = calculateDragDistance(clientX, clientY);
      const wasDragGesture =
        dragDistance.x > DRAG_THRESHOLD_PX ||
        dragDistance.y > DRAG_THRESHOLD_PX;

      // HACK: Calculate drag rectangle BEFORE ending drag, because endDrag resets dragStart
      const dragSelectionRect = wasDragGesture
        ? calculateDragRectangle(clientX, clientY)
        : null;

      if (wasDragGesture) {
        actions.endDrag();
      } else {
        actions.cancelDrag();
      }
      autoScroller.stop();
      document.body.style.userSelect = "";

      if (dragSelectionRect) {
        handleDragSelection(dragSelectionRect);
      } else {
        handleSingleClick(clientX, clientY);
      }
    };

    const eventListenerManager = createEventListenerManager();

    const keyboardClaimer = setupKeyboardEventClaimer();

    const blockEnterIfNeeded = (event: KeyboardEvent) => {
      let originalKey: string;
      try {
        originalKey = keyboardClaimer.originalKeyDescriptor?.get
          ? keyboardClaimer.originalKeyDescriptor.get.call(event)
          : event.key;
      } catch {
        return false;
      }
      const isEnterKey = originalKey === "Enter" || isEnterCode(event.code);
      const isOverlayActive = isActivated() || isHoldingKeys();
      const shouldBlockEnter =
        isEnterKey && isOverlayActive && !isInputMode() && !store.isToggleMode;

      if (shouldBlockEnter) {
        keyboardClaimer.claimedEvents.add(event);
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return true;
      }
      return false;
    };

    eventListenerManager.addDocumentListener("keydown", blockEnterIfNeeded, {
      capture: true,
    });
    eventListenerManager.addDocumentListener("keyup", blockEnterIfNeeded, {
      capture: true,
    });
    eventListenerManager.addDocumentListener("keypress", blockEnterIfNeeded, {
      capture: true,
    });

    const handleUndoRedoKeys = (event: KeyboardEvent): boolean => {
      const isUndoOrRedo =
        event.code === "KeyZ" && (event.metaKey || event.ctrlKey);

      if (!isUndoOrRedo) return false;

      const hasActiveConfirmation = Array.from(
        agentManager.sessions().values(),
      ).some((session) => !session.isStreaming && !session.error);

      if (hasActiveConfirmation) return false;

      const isRedo = event.shiftKey;

      if (isRedo && agentManager.canRedo()) {
        event.preventDefault();
        event.stopPropagation();
        agentManager.history.redo();
        return true;
      } else if (!isRedo && agentManager.canUndo()) {
        event.preventDefault();
        event.stopPropagation();
        agentManager.history.undo();
        return true;
      }

      return false;
    };

    const handleArrowNavigation = (event: KeyboardEvent): boolean => {
      if (!isActivated() || isInputMode()) return false;

      const currentElement = effectiveElement();
      if (!currentElement) return false;

      const nextElement = arrowNavigator.findNext(event.key, currentElement);
      if (!nextElement) return false;

      event.preventDefault();
      event.stopPropagation();
      actions.setFrozenElement(nextElement);
      actions.freeze();
      const bounds = createElementBounds(nextElement);
      actions.setPointer(getBoundsCenter(bounds));
      return true;
    };

    const handleEnterKeyActivation = (event: KeyboardEvent): boolean => {
      if (!isEnterCode(event.code)) return false;

      const copiedElement = store.lastCopiedElement;
      const canActivateFromCopied =
        !isHoldingKeys() &&
        !isInputMode() &&
        !isActivated() &&
        copiedElement &&
        document.contains(copiedElement) &&
        hasAgentProvider() &&
        !store.labelInstances.some(
          (instance) =>
            instance.status === "copied" || instance.status === "fading",
        );

      if (canActivateFromCopied && copiedElement) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        const center = getBoundsCenter(createElementBounds(copiedElement));

        actions.setPointer(center);
        prepareInputMode(copiedElement, center.x, center.y);
        actions.setFrozenElement(copiedElement);
        actions.setLastCopied(null);

        activateInputMode();
        if (!isActivated()) {
          activateRenderer();
        }
        return true;
      }

      const canActivateFromHolding =
        isHoldingKeys() && !isInputMode() && hasAgentProvider();

      if (canActivateFromHolding) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        const element = store.frozenElement || targetElement();
        const pointerX = store.pointer.x;
        const pointerY = store.pointer.y;
        if (element) {
          prepareInputMode(element, pointerX, pointerY);
        }

        actions.setPointer({ x: pointerX, y: pointerY });
        if (element) {
          actions.setFrozenElement(element);
        }
        activateInputMode();

        if (keydownSpamTimerId !== null) {
          window.clearTimeout(keydownSpamTimerId);
          keydownSpamTimerId = null;
        }

        if (!isActivated()) {
          activateRenderer();
        }

        return true;
      }

      return false;
    };

    const handleOpenFileShortcut = (event: KeyboardEvent): boolean => {
      if (event.key?.toLowerCase() !== "o" || isInputMode()) return false;
      if (!isActivated() || !(event.metaKey || event.ctrlKey)) return false;

      const filePath = store.selectionFilePath;
      const lineNumber = store.selectionLineNumber;
      if (!filePath) return false;

      event.preventDefault();
      event.stopPropagation();

      if (options.onOpenFile) {
        options.onOpenFile(filePath, lineNumber ?? undefined);
      } else {
        const url = buildOpenFileUrl(filePath, lineNumber ?? undefined);
        window.open(url, "_blank");
      }
      return true;
    };

    const handleActivationKeys = (event: KeyboardEvent): void => {
      if (
        !options.allowActivationInsideInput &&
        isKeyboardEventTriggeredByInput(event)
      ) {
        return;
      }

      if (!isTargetKeyCombination(event, options)) {
        if (
          isActivated() &&
          !store.isToggleMode &&
          (event.metaKey || event.ctrlKey)
        ) {
          if (!MODIFIER_KEYS.includes(event.key) && !isEnterCode(event.code)) {
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
        if (store.isToggleMode && options.activationMode !== "hold") return;
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

      if (!isHoldingKeys()) {
        const keyHoldDuration =
          options.keyHoldDuration ?? DEFAULT_KEY_HOLD_DURATION_MS;
        const activationDuration = isKeyboardEventTriggeredByInput(event)
          ? keyHoldDuration + INPUT_FOCUS_ACTIVATION_DELAY_MS
          : keyHoldDuration;
        actions.startHold(activationDuration);
      }
    };

    eventListenerManager.addWindowListener(
      "keydown",
      (event: KeyboardEvent) => {
        blockEnterIfNeeded(event);

        if (handleUndoRedoKeys(event)) return;

        const isEnterToActivateInput =
          isEnterCode(event.code) && isHoldingKeys() && !isInputMode();

        if (
          isInputMode() &&
          isTargetKeyCombination(event, options) &&
          !event.repeat
        ) {
          event.preventDefault();
          event.stopPropagation();
          handleInputCancel();
          return;
        }

        if (
          isInputMode() ||
          (isEventFromOverlay(event, "data-react-grab-ignore-events") &&
            !isEnterToActivateInput)
        ) {
          if (event.key === "Escape") {
            if (pendingAbortSessionId()) {
              event.preventDefault();
              event.stopPropagation();
              actions.setPendingAbortSessionId(null);
            } else if (store.isToggleMode && !isInputMode()) {
              deactivateRenderer();
            }
          }
          return;
        }

        if (event.key === "Escape") {
          if (pendingAbortSessionId()) {
            event.preventDefault();
            event.stopPropagation();
            actions.setPendingAbortSessionId(null);
            return;
          }

          if (agentManager.isProcessing()) {
            return;
          }

          if (isHoldingKeys() || store.isToggleMode) {
            deactivateRenderer();
            return;
          }
        }

        if (handleArrowNavigation(event)) return;
        if (handleEnterKeyActivation(event)) return;
        if (handleOpenFileShortcut(event)) return;

        handleActivationKeys(event);
      },
      { capture: true },
    );

    eventListenerManager.addWindowListener(
      "keyup",
      (event: KeyboardEvent) => {
        if (blockEnterIfNeeded(event)) return;

        if (!isHoldingKeys() && !isActivated()) return;
        if (isInputMode()) return;

        const hasCustomShortcut = Boolean(
          options.activationShortcut || options.activationKey,
        );

        const requiredModifiers = getRequiredModifiers(options);
        const isReleasingModifier =
          requiredModifiers.metaKey || requiredModifiers.ctrlKey
            ? !event.metaKey && !event.ctrlKey
            : (requiredModifiers.shiftKey && !event.shiftKey) ||
              (requiredModifiers.altKey && !event.altKey);

        const isReleasingActivationKey = options.activationShortcut
          ? !options.activationShortcut(event)
          : options.activationKey
            ? options.activationKey.key
              ? event.key?.toLowerCase() ===
                  options.activationKey.key.toLowerCase() ||
                keyMatchesCode(options.activationKey.key, event.code)
              : false
            : isCLikeKey(event.key, event.code);

        if (isActivated()) {
          if (isReleasingModifier) {
            if (store.isToggleMode && options.activationMode !== "hold") return;
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
          if (store.isToggleMode && options.activationMode !== "hold") return;
          if (isHoldingKeys()) {
            actions.release();
          } else {
            deactivateRenderer();
          }
        }
      },
      { capture: true },
    );

    eventListenerManager.addWindowListener("keypress", blockEnterIfNeeded, {
      capture: true,
    });

    eventListenerManager.addWindowListener("mousemove", (event: MouseEvent) => {
      actions.setTouchMode(false);
      if (isEventFromOverlay(event, "data-react-grab-ignore-events")) return;
      if (store.contextMenuPosition !== null) return;
      if (isActivated() && !isInputMode() && isToggleFrozen()) {
        actions.unfreeze();
        arrowNavigator.clearHistory();
      }
      handlePointerMove(event.clientX, event.clientY);
    });

    eventListenerManager.addWindowListener(
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
      { capture: true },
    );

    eventListenerManager.addWindowListener(
      "pointerdown",
      (event: PointerEvent) => {
        if (event.button !== 0) return;
        if (isEventFromOverlay(event, "data-react-grab-ignore-events")) return;
        if (!isRendererActive() || isCopying() || isInputMode()) return;
        event.stopPropagation();
      },
      { capture: true },
    );

    eventListenerManager.addWindowListener(
      "pointerup",
      (event: PointerEvent) => {
        if (event.button !== 0) return;
        if (isEventFromOverlay(event, "data-react-grab-ignore-events")) return;
        if (store.contextMenuPosition !== null) return;
        handlePointerUp(event.clientX, event.clientY);
      },
      { capture: true },
    );

    eventListenerManager.addWindowListener(
      "mouseup",
      (event: MouseEvent) => {
        if (event.button !== 0) return;
        if (isEventFromOverlay(event, "data-react-grab-ignore-events")) return;
        if (store.contextMenuPosition !== null) return;
        handlePointerUp(event.clientX, event.clientY);
      },
      { capture: true },
    );

    eventListenerManager.addWindowListener(
      "contextmenu",
      (event: MouseEvent) => {
        if (!isRendererActive() || isCopying() || isInputMode()) return;

        event.preventDefault();
        event.stopPropagation();

        if (isEventFromOverlay(event, "data-react-grab-ignore-events")) return;

        const element = getElementAtPosition(event.clientX, event.clientY);
        if (!element) return;

        if (pendingClickTimeoutId !== null) {
          window.clearTimeout(pendingClickTimeoutId);
          pendingClickTimeoutId = null;
          pendingClickData = null;
        }

        const position = { x: event.clientX, y: event.clientY };
        actions.setPointer(position);
        actions.setFrozenElement(element);
        actions.freeze();
        actions.showContextMenu(position, element);
        options.onContextMenu?.(element, position);
      },
      { capture: true },
    );

    eventListenerManager.addWindowListener(
      "touchmove",
      (event: TouchEvent) => {
        if (event.touches.length === 0) return;
        actions.setTouchMode(true);
        if (isEventFromOverlay(event, "data-react-grab-ignore-events")) return;
        if (isHoldingKeys() && !isInputMode() && isToggleFrozen()) {
          actions.unfreeze();
        }
        handlePointerMove(event.touches[0].clientX, event.touches[0].clientY);
      },
      { passive: true },
    );

    eventListenerManager.addWindowListener(
      "touchstart",
      (event: TouchEvent) => {
        if (event.touches.length === 0) return;
        actions.setTouchMode(true);

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
          event.stopPropagation();
        }
      },
      { passive: false },
    );

    eventListenerManager.addWindowListener("touchend", (event: TouchEvent) => {
      if (event.changedTouches.length === 0) return;
      handlePointerUp(
        event.changedTouches[0].clientX,
        event.changedTouches[0].clientY,
      );
    });

    eventListenerManager.addWindowListener(
      "click",
      (event: MouseEvent) => {
        if (isEventFromOverlay(event, "data-react-grab-ignore-events")) return;
        if (store.contextMenuPosition !== null) return;

        if (isRendererActive() || isCopying() || didJustDrag()) {
          event.preventDefault();
          event.stopPropagation();

          if (store.isToggleMode && !isCopying() && !isInputMode()) {
            if (pendingClickTimeoutId !== null) return;

            if (!isHoldingKeys()) {
              deactivateRenderer();
            } else {
              actions.setToggleMode(false);
            }
          }
        }
      },
      { capture: true },
    );

    eventListenerManager.addDocumentListener("visibilitychange", () => {
      if (document.hidden) {
        actions.clearGrabbedBoxes();
        const storeActivationTimestamp = store.activationTimestamp;
        if (
          isActivated() &&
          !isInputMode() &&
          storeActivationTimestamp !== null &&
          Date.now() - storeActivationTimestamp > BLUR_DEACTIVATION_THRESHOLD_MS
        ) {
          deactivateRenderer();
        }
      }
    });

    eventListenerManager.addWindowListener(
      "scroll",
      () => {
        actions.incrementViewportVersion();
        actions.updateSessionBounds();
      },
      { capture: true },
    );

    eventListenerManager.addWindowListener("resize", () => {
      actions.incrementViewportVersion();
      actions.updateSessionBounds();
    });

    let boundsRecalcIntervalId: number | null = null;
    let viewportChangeFrameId: number | null = null;

    const startBoundsRecalcIntervalIfNeeded = () => {
      const shouldRunInterval =
        theme().enabled &&
        (isActivated() ||
          isCopying() ||
          store.labelInstances.length > 0 ||
          store.grabbedBoxes.length > 0 ||
          agentManager.sessions().size > 0);

      if (shouldRunInterval && boundsRecalcIntervalId === null) {
        boundsRecalcIntervalId = window.setInterval(() => {
          if (viewportChangeFrameId !== null) return;

          viewportChangeFrameId = requestAnimationFrame(() => {
            viewportChangeFrameId = null;
            actions.incrementViewportVersion();
            actions.updateSessionBounds();
          });
        }, BOUNDS_RECALC_INTERVAL_MS);
      } else if (!shouldRunInterval && boundsRecalcIntervalId !== null) {
        window.clearInterval(boundsRecalcIntervalId);
        boundsRecalcIntervalId = null;
        if (viewportChangeFrameId !== null) {
          cancelAnimationFrame(viewportChangeFrameId);
          viewportChangeFrameId = null;
        }
      }
    };

    createEffect(() => {
      void theme().enabled;
      void isActivated();
      void isCopying();
      void store.labelInstances.length;
      void store.grabbedBoxes.length;
      void agentManager.sessions().size;
      startBoundsRecalcIntervalIfNeeded();
    });

    onCleanup(() => {
      if (boundsRecalcIntervalId !== null) {
        window.clearInterval(boundsRecalcIntervalId);
      }
      if (viewportChangeFrameId !== null) {
        cancelAnimationFrame(viewportChangeFrameId);
      }
    });

    eventListenerManager.addDocumentListener(
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
      { capture: true },
    );

    onCleanup(() => {
      eventListenerManager.abort();
      if (keydownSpamTimerId) window.clearTimeout(keydownSpamTimerId);
      if (pendingClickTimeoutId) window.clearTimeout(pendingClickTimeoutId);
      autoScroller.stop();
      document.body.style.userSelect = "";
      setCursorOverride(null);
      keyboardClaimer.restore();
    });

    const rendererRoot = mountRoot(cssText as string);

    const createElementVisibilityMemo = (
      themeKey: "selectionBox" | "elementLabel",
    ) =>
      createMemo(() => {
        if (!theme()[themeKey].enabled) return false;
        if (didJustCopy()) return false;
        return (
          isRendererActive() && !isDragging() && Boolean(effectiveElement())
        );
      });

    const selectionVisible = createElementVisibilityMemo("selectionBox");

    const selectionTagName = createMemo(() => {
      const element = effectiveElement();
      if (!element) return undefined;
      return getTagName(element) || undefined;
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
      if (store.contextMenuPosition !== null) return false;
      if (!theme().elementLabel.enabled) return false;
      if (didJustCopy()) return false;
      return isRendererActive() && !isDragging() && Boolean(effectiveElement());
    });

    const computedLabelInstances = createMemo(() => {
      void store.viewportVersion;
      return store.labelInstances.map((instance) => {
        if (!instance.element || !document.body.contains(instance.element)) {
          return instance;
        }
        return {
          ...instance,
          bounds: createElementBounds(instance.element),
        };
      });
    });

    const computedGrabbedBoxes = createMemo(() => {
      void store.viewportVersion;
      return store.grabbedBoxes.map((box) => {
        if (!box.element || !document.body.contains(box.element)) {
          return box;
        }
        return {
          ...box,
          bounds: createElementBounds(box.element),
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
      const themeEnabled = theme().elementLabel.enabled;
      const inInputMode = isInputMode();
      const copying = isCopying();
      const rendererActive = isRendererActive();
      const dragging = isDragging();
      const hasElement = Boolean(effectiveElement());

      if (!themeEnabled) return false;
      if (inInputMode) return false;
      if (copying) return true;
      return rendererActive && !dragging && hasElement;
    });

    const crosshairVisible = createMemo(
      () =>
        theme().crosshair.enabled &&
        isRendererActive() &&
        !isDragging() &&
        !store.isTouchMode &&
        !isToggleFrozen() &&
        !isInputMode() &&
        store.contextMenuPosition === null,
    );

    const contextMenuBounds = createMemo((): OverlayBounds | null => {
      const element = store.contextMenuElement;
      if (!element) return null;
      return createElementBounds(element);
    });

    const contextMenuTagName = createMemo(() => {
      const element = store.contextMenuElement;
      if (!element) return undefined;
      return getTagName(element) || undefined;
    });

    const [contextMenuComponentName] = createResource(
      () => store.contextMenuElement,
      async (element) => {
        if (!element) return undefined;
        const name = await getNearestComponentName(element);
        return name ?? undefined;
      },
    );

    const [contextMenuFilePath] = createResource(
      () => store.contextMenuElement,
      async (element): Promise<{ filePath: string; lineNumber: number | undefined } | null> => {
        if (!element) return null;
        const stack = await getStack(element);
        if (!stack || stack.length === 0) return null;
        for (const frame of stack) {
          if (frame.fileName && isSourceFile(frame.fileName)) {
            return {
              filePath: normalizeFileName(frame.fileName),
              lineNumber: frame.lineNumber,
            };
          }
        }
        return null;
      },
    );

    const handleContextMenuCopy = () => {
      const element = store.contextMenuElement;
      if (!element) return;

      const position = store.contextMenuPosition;

      performCopyWithLabel({
        element,
        positionX: position?.x ?? 0,
        positionY: position?.y ?? 0,
        shouldDeactivateAfter: store.isToggleMode,
      });

      // HACK: Defer hiding context menu until after click event propagates fully
      setTimeout(() => {
        actions.hideContextMenu();
      }, 0);
    };

    const handleContextMenuOpen = () => {
      const fileInfo = contextMenuFilePath();
      if (fileInfo) {
        const openFileUrl = buildOpenFileUrl(fileInfo.filePath, fileInfo.lineNumber);
        window.open(openFileUrl, "_blank");
      }

      // HACK: Defer hiding context menu until after click event propagates fully
      setTimeout(() => {
        actions.hideContextMenu();
        actions.unfreeze();
      }, 0);
    };

    const handleContextMenuPrompt = () => {
      const element = store.contextMenuElement;
      const position = store.contextMenuPosition;
      if (!element || !position) return;

      if (!hasAgentProvider()) {
        handleContextMenuCopy();
        return;
      }

      prepareInputMode(element, position.x, position.y);
      actions.setPointer({ x: position.x, y: position.y });
      actions.setFrozenElement(element);
      activateInputMode();

      // HACK: Defer hiding context menu until after click event propagates fully
      setTimeout(() => {
        actions.hideContextMenu();
      }, 0);
    };

    const handleContextMenuDismiss = () => {
      // HACK: Defer hiding context menu until after click event propagates fully
      setTimeout(() => {
        actions.hideContextMenu();
        actions.unfreeze();
      }, 0);
    };

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
            selectionBoundsMultiple={frozenElementsBounds()}
            selectionElementsCount={frozenElementsCount()}
            selectionFilePath={store.selectionFilePath ?? undefined}
            selectionLineNumber={store.selectionLineNumber ?? undefined}
            selectionTagName={selectionTagName()}
            selectionComponentName={selectionComponentName()}
            selectionLabelVisible={selectionLabelVisible()}
            selectionLabelStatus="idle"
            labelInstances={computedLabelInstances()}
            dragVisible={dragVisible()}
            dragBounds={dragBounds()}
            grabbedBoxes={
              theme().grabbedBoxes.enabled ? computedGrabbedBoxes() : []
            }
            labelZIndex={Z_INDEX_LABEL}
            mouseX={cursorPosition().x}
            mouseY={cursorPosition().y}
            crosshairVisible={crosshairVisible()}
            inputValue={store.inputText}
            isInputMode={isInputMode()}
            hasAgent={hasAgentProvider()}
            isAgentConnected={store.isAgentConnected}
            agentSessions={agentManager.sessions()}
            supportsUndo={store.supportsUndo}
            supportsFollowUp={store.supportsFollowUp}
            dismissButtonText={store.dismissButtonText}
            onDismissSession={agentManager.session.dismiss}
            onUndoSession={agentManager.session.undo}
            onFollowUpSubmitSession={handleFollowUpSubmit}
            onAcknowledgeSessionError={handleAcknowledgeError}
            onRetrySession={agentManager.session.retry}
            onInputChange={handleInputChange}
            onInputSubmit={() => void handleInputSubmit()}
            onInputCancel={handleInputCancel}
            onToggleExpand={handleToggleExpand}
            isPendingDismiss={isPendingDismiss()}
            onConfirmDismiss={handleConfirmDismiss}
            onCancelDismiss={handleCancelDismiss}
            pendingAbortSessionId={pendingAbortSessionId()}
            onRequestAbortSession={(sessionId) =>
              actions.setPendingAbortSessionId(sessionId)
            }
            onAbortSession={handleAgentAbort}
            theme={theme()}
            toolbarVisible={theme().toolbar.enabled}
            isActive={isActivated()}
            onToggleActive={handleToggleActive}
            contextMenuPosition={store.contextMenuPosition}
            contextMenuBounds={contextMenuBounds()}
            contextMenuTagName={contextMenuTagName()}
            contextMenuComponentName={contextMenuComponentName()}
            contextMenuHasFilePath={Boolean(contextMenuFilePath()?.filePath)}
            contextMenuHasAgent={hasAgentProvider()}
            onContextMenuCopy={handleContextMenuCopy}
            onContextMenuOpen={handleContextMenuOpen}
            onContextMenuPrompt={handleContextMenuPrompt}
            onContextMenuDismiss={handleContextMenuDismiss}
          />
        ),
        rendererRoot,
      );
    }

    if (hasAgentProvider()) {
      agentManager.session.tryResume();
    }

    const copyElementAPI = async (
      elements: Element | Element[],
    ): Promise<boolean> => {
      const elementsArray = Array.isArray(elements) ? elements : [elements];
      if (elementsArray.length === 0) return false;
      return await copyWithFallback(elementsArray);
    };

    return {
      activate: () => {
        if (!isActivated()) {
          toggleActivate();
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
          toggleActivate();
        }
      },
      isActive: () => isActivated(),
      dispose: () => {
        hasInited = false;
        dispose();
      },
      copyElement: copyElementAPI,
      getState: (): ReactGrabState => ({
        isActive: isActivated(),
        isDragging: isDragging(),
        isCopying: isCopying(),
        isInputMode: isInputMode(),
        targetElement: targetElement(),
        dragBounds: dragBounds() ?? null,
      }),
      updateTheme: (partialTheme: DeepPartial<Theme>) => {
        const currentTheme = theme();
        const updatedTheme = deepMergeTheme(currentTheme, partialTheme);
        setTheme(updatedTheme);
      },
      getTheme: () => theme(),
      setAgent: (newAgentOptions: AgentOptions) => {
        const existingOptions = agentManager._internal.getOptions();
        const mergedOptions: AgentOptions = {
          ...existingOptions,
          ...newAgentOptions,
          provider: newAgentOptions.provider ?? existingOptions?.provider,
          onAbort: (session: AgentSession, elements: Element[]) => {
            newAgentOptions?.onAbort?.(session, elements);
            restoreInputFromSession(session, elements);
          },
          onUndo: (session: AgentSession, elements: Element[]) => {
            newAgentOptions?.onUndo?.(session, elements);
            restoreInputFromSession(session, elements);
          },
          onDismiss: newAgentOptions?.onDismiss,
        };
        agentManager._internal.setOptions(mergedOptions);
        actions.setHasAgentProvider(Boolean(mergedOptions.provider));
        actions.setAgentCapabilities({
          supportsUndo: Boolean(mergedOptions.provider?.undo),
          supportsFollowUp: Boolean(mergedOptions.provider?.supportsFollowUp),
          dismissButtonText: mergedOptions.provider?.dismissButtonText,
          isAgentConnected: false,
        });

        if (mergedOptions.provider?.checkConnection) {
          void mergedOptions.provider.checkConnection().then((connected) => {
            actions.setAgentCapabilities({
              supportsUndo: Boolean(mergedOptions.provider?.undo),
              supportsFollowUp: Boolean(
                mergedOptions.provider?.supportsFollowUp,
              ),
              dismissButtonText: mergedOptions.provider?.dismissButtonText,
              isAgentConnected: connected,
            });
          });
        }

        agentManager.session.tryResume();
      },
      updateOptions: (newOptions: UpdatableOptions) => {
        options = { ...options, ...newOptions };
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
  AgentCompleteResult,
  AgentOptions,
  UpdatableOptions,
} from "../types.js";

export { generateSnippet } from "../utils/generate-snippet.js";
export { copyContent } from "../utils/copy-content.js";
