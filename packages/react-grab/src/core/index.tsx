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
import { useMachine } from "@xstate/solid";
import { stateMachine } from "./machine.js";
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
import {
  createAutoScroller,
  getAutoScrollDirection,
} from "./auto-scroll.js";
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

    const [, , actorRef] = useMachine(stateMachine, {
      input: {
        theme: mergedTheme,
        hasAgentProvider: Boolean(options.agent?.provider),
        keyHoldDuration:
          options.keyHoldDuration ?? DEFAULT_KEY_HOLD_DURATION_MS,
      },
    });

    const [snapshot, setSnapshot] = createSignal(actorRef.getSnapshot());
    createEffect(() => {
      const subscription = actorRef.subscribe((nextSnapshot) => {
        setSnapshot(nextSnapshot);
      });
      onCleanup(() => subscription.unsubscribe());
    });

    const send = actorRef.send.bind(actorRef);
    const context = () => snapshot().context;

    const isHoldingKeys = createMemo(() => {
      return snapshot().matches({ activation: "holding" });
    });

    const isActivated = createMemo(() => {
      return (
        snapshot().matches({ activation: "active" }) ||
        snapshot().matches({ activation: { active: "hovering" } }) ||
        snapshot().matches({ activation: { active: "frozen" } }) ||
        snapshot().matches({ activation: { active: "dragging" } }) ||
        snapshot().matches({ activation: { active: "justDragged" } })
      );
    });

    const isToggleFrozen = createMemo(() => {
      return snapshot().matches({ activation: { active: "frozen" } });
    });

    const isDragging = createMemo(() => {
      return snapshot().matches({ activation: { active: "dragging" } });
    });

    const didJustDrag = createMemo(() => {
      return snapshot().matches({ activation: { active: "justDragged" } });
    });

    const isCopying = createMemo(() => {
      return snapshot().matches({ interaction: "copying" });
    });

    const didJustCopy = createMemo(() => {
      return snapshot().matches({ interaction: "justCopied" });
    });

    const isInputMode = createMemo(() => {
      return (
        snapshot().matches({ interaction: "inputMode" }) ||
        snapshot().matches({ interaction: { inputMode: "typing" } }) ||
        snapshot().matches({ interaction: { inputMode: "confirmingDismiss" } })
      );
    });

    const isPendingDismiss = createMemo(() => {
      return snapshot().matches({
        interaction: { inputMode: "confirmingDismiss" },
      });
    });

    const isPendingAgentAbort = createMemo(() => {
      return snapshot().matches({ agentAbortConfirmation: "confirming" });
    });

    const hasAgentProvider = createMemo(() => context().hasAgentProvider);

    let previouslyHoldingKeys = false;
    createEffect(() => {
      const currentlyHolding = isHoldingKeys();
      const currentlyActive = isActivated();

      if (previouslyHoldingKeys && !currentlyHolding && currentlyActive) {
        if (options.activationMode !== "hold") {
          send({ type: "SET_TOGGLE_MODE", value: true });
        }
        options.onActivate?.();
      }
      previouslyHoldingKeys = currentlyHolding;
    });

    const elementInputCache = new WeakMap<Element, string>();

    const loadCachedInput = (element: Element) => {
      const cachedInput = elementInputCache.get(element);
      if (cachedInput) {
        send({ type: "INPUT_CHANGE", value: cachedInput });
      }
    };

    const prepareInputMode = (element: Element, positionX: number, positionY: number) => {
      setCopyStartPosition(element, positionX, positionY);
      loadCachedInput(element);
    };

    const activateInputMode = () => {
      const element = context().frozenElement || targetElement();
      if (element) {
        send({
          type: "INPUT_MODE_ENTER",
          position: {
            x: context().mousePosition.x,
            y: context().mousePosition.y,
          },
          element,
        });
      }
    };

    const setCopyStartPosition = (
      element: Element,
      positionX: number,
      positionY: number,
    ) => {
      send({
        type: "SET_COPY_START",
        position: { x: positionX, y: positionY },
        element,
      });
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
      () => context().mousePosition,
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

      send({ type: "ADD_GRABBED_BOX", box: newBox });
      options.onGrabbedBox?.(bounds, element);

      setTimeout(() => {
        send({ type: "REMOVE_GRABBED_BOX", boxId });
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
      send({ type: "ADD_LABEL_INSTANCE", instance });
      return instanceId;
    };

    const updateLabelInstance = (
      instanceId: string,
      status: SelectionLabelInstance["status"],
    ) => {
      send({ type: "UPDATE_LABEL_INSTANCE", instanceId, status });
    };

    const removeLabelInstance = (instanceId: string) => {
      send({ type: "REMOVE_LABEL_INSTANCE", instanceId });
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
      send({ type: "COPY_START" });

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
        send({ type: "COPY_DONE", element });

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

        if (context().isToggleMode || shouldDeactivateAfter) {
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
      const element = context().detectedElement;
      if (element && !document.contains(element)) return null;
      return element;
    });

    const effectiveElement = createMemo(() =>
      context().frozenElement || (isToggleFrozen() ? null : targetElement()),
    );

    createEffect(() => {
      const element = context().detectedElement;
      if (!element) return;

      const intervalId = setInterval(() => {
        if (!document.contains(element)) {
          send({ type: "ELEMENT_DETECTED", element: null });
        }
      }, 100);

      onCleanup(() => clearInterval(intervalId));
    });

    const selectionBounds = createMemo((): OverlayBounds | undefined => {
      void context().viewportVersion;
      const element = effectiveElement();
      if (!element) return undefined;
      return createElementBounds(element);
    });

    const frozenElementsBounds = createMemo((): OverlayBounds[] => {
      void context().viewportVersion;
      const elements = context().frozenElements;
      if (elements.length === 0) return [];
      return elements.map((element) => createElementBounds(element));
    });

    const frozenElementsCount = createMemo(
      () => context().frozenElements.length,
    );

    const calculateDragDistance = (endX: number, endY: number) => {
      const endPageX = endX + window.scrollX;
      const endPageY = endY + window.scrollY;

      return {
        x: Math.abs(endPageX - context().dragStart.x),
        y: Math.abs(endPageY - context().dragStart.y),
      };
    };

    const isDraggingBeyondThreshold = createMemo(() => {
      if (!isDragging()) return false;

      const dragDistance = calculateDragDistance(
        context().mousePosition.x,
        context().mousePosition.y,
      );

      return (
        dragDistance.x > DRAG_THRESHOLD_PX || dragDistance.y > DRAG_THRESHOLD_PX
      );
    });

    const calculateDragRectangle = (endX: number, endY: number) => {
      const endPageX = endX + window.scrollX;
      const endPageY = endY + window.scrollY;

      const dragPageX = Math.min(context().dragStart.x, endPageX);
      const dragPageY = Math.min(context().dragStart.y, endPageY);
      const dragWidth = Math.abs(endPageX - context().dragStart.x);
      const dragHeight = Math.abs(endPageY - context().dragStart.y);

      return {
        x: dragPageX - window.scrollX,
        y: dragPageY - window.scrollY,
        width: dragWidth,
        height: dragHeight,
      };
    };

    const dragBounds = createMemo((): OverlayBounds | undefined => {
      if (!isDraggingBeyondThreshold()) return undefined;

      const drag = calculateDragRectangle(
        context().mousePosition.x,
        context().mousePosition.y,
      );

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
        void context().viewportVersion;
        const element = context().frozenElement || targetElement();
        if (element) {
          const bounds = createElementBounds(element);
          return {
            x: getBoundsCenter(bounds).x + context().copyOffsetFromCenterX,
            y: context().copyStart.y,
          };
        }
        return {
          x: context().copyStart.x,
          y: context().copyStart.y,
        };
      }
      return {
        x: context().mousePosition.x,
        y: context().mousePosition.y,
      };
    });

    createEffect(
      on(
        () => [targetElement(), context().lastGrabbedElement] as const,
        ([currentElement, lastElement]) => {
          if (lastElement && currentElement && lastElement !== currentElement) {
            send({
              type: "SET_LAST_GRABBED",
              element: null,
            });
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
            send({
              type: "SET_SELECTION_SOURCE",
              filePath: null,
              lineNumber: null,
            });
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
                  send({
                    type: "SET_SELECTION_SOURCE",
                    filePath: normalizeFileName(frame.fileName),
                    lineNumber: frame.lineNumber ?? null,
                  });
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
        () => context().viewportVersion,
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
          [
            isInputMode(),
            context().mousePosition.x,
            context().mousePosition.y,
            targetElement(),
          ] as const,
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
        () =>
          [
            crosshairVisible(),
            context().mousePosition.x,
            context().mousePosition.y,
          ] as const,
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
      send({ type: "ACTIVATE" });
      // HACK: Only call onActivate if we weren't in holding state.
      // When coming from holding state, the reactive effect (previouslyHoldingKeys transition)
      // will handle calling onActivate to avoid duplicate invocations.
      if (!wasInHoldingState) {
        options.onActivate?.();
      }
    };

    const deactivateRenderer = () => {
      const wasDragging = isDragging();
      const previousFocused = context().previouslyFocusedElement;
      send({ type: "DEACTIVATE" });
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
          send({ type: "SET_LAST_GRABBED", element: pendingClick.element });
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
      send({ type: "SET_TOGGLE_MODE", value: true });
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

        send({
          type: "MOUSE_MOVE",
          position: { x: session.position.x, y: centerY },
        });
        send({ type: "FREEZE_ELEMENTS", elements });
        send({ type: "INPUT_CHANGE", value: session.context.prompt });
        send({ type: "SET_TOGGLE_MODE", value: true });

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
      send({ type: "INPUT_CHANGE", value });
    };

    const handleInputSubmit = () => {
      send({ type: "SET_LAST_COPIED", element: null });
      const frozenElements = context().frozenElements;
      const element = context().frozenElement || targetElement();
      const prompt = isInputMode() ? context().inputText.trim() : "";

      if (!element) {
        deactivateRenderer();
        return;
      }

      const elements =
        frozenElements.length > 0 ? frozenElements : element ? [element] : [];

      const selectionBounds = elements.map((el) => createElementBounds(el));
      const firstBounds = selectionBounds[0];
      const labelPositionX = context().mousePosition.x;
      const currentX = firstBounds.x + firstBounds.width / 2;
      const currentY = firstBounds.y + firstBounds.height / 2;

      if (hasAgentProvider() && prompt) {
        elementInputCache.delete(element);
        deactivateRenderer();

        const currentReplySessionId = context().replySessionId;
        send({ type: "SET_REPLY_SESSION", sessionId: null });

        void agentManager.session.start({
          elements,
          prompt,
          position: { x: labelPositionX, y: currentY },
          selectionBounds,
          sessionId: currentReplySessionId ?? undefined,
        });

        return;
      }

      send({ type: "MOUSE_MOVE", position: { x: currentX, y: currentY } });
      send({ type: "INPUT_CANCEL" });

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
      send({ type: "SET_LAST_COPIED", element: null });
      if (!isInputMode()) return;

      const currentInput = context().inputText.trim();
      if (currentInput && !isPendingDismiss()) {
        send({ type: "ESC" });
        return;
      }

      const element = context().frozenElement || targetElement();
      if (element && currentInput) {
        elementInputCache.set(element, currentInput);
      }

      send({ type: "CONFIRM_DISMISS" });
      deactivateRenderer();
    };

    const handleConfirmDismiss = () => {
      send({ type: "CONFIRM_DISMISS" });
      deactivateRenderer();
    };

    const handleCancelDismiss = () => {
      send({ type: "CANCEL_DISMISS" });
    };

    const handleConfirmAgentAbort = () => {
      send({ type: "CONFIRM_AGENT_ABORT" });
      agentManager.session.abort();
    };

    const handleCancelAgentAbort = () => {
      send({ type: "CANCEL_AGENT_ABORT" });
    };

    const handleToggleExpand = () => {
      if (!hasAgentProvider()) return;
      const element = context().frozenElement || targetElement();
      if (element) {
        prepareInputMode(
          element,
          context().mousePosition.x,
          context().mousePosition.y,
        );
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
        send({ type: "INPUT_CHANGE", value: prompt });
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
      if (isInputMode() || isToggleFrozen()) return;

      send({ type: "MOUSE_MOVE", position: { x: clientX, y: clientY } });

      const now = performance.now();
      if (now - lastElementDetectionTime >= ELEMENT_DETECTION_THROTTLE_MS) {
        lastElementDetectionTime = now;
        onIdle(() => {
          const candidate = getElementAtPosition(clientX, clientY);
          send({ type: "ELEMENT_DETECTED", element: candidate });
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

      send({ type: "DRAG_START", position: { x: clientX, y: clientY } });
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
          : getElementsInDrag(dragSelectionRect, isValidGrabbableElement, false);

      if (selectedElements.length === 0) return;

      options.onDragEnd?.(selectedElements, dragSelectionRect);
      const firstElement = selectedElements[0];
      const center = getBoundsCenter(createElementBounds(firstElement));

      if (hasAgentProvider()) {
        send({ type: "MOUSE_MOVE", position: center });
        send({ type: "FREEZE_ELEMENTS", elements: selectedElements });
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
          send({ type: "MOUSE_MOVE", position: { x: clientX, y: clientY } });
          send({ type: "FREEZE_ELEMENT", element: clickElement });
          activateInputMode();
          return;
        }

        pendingClickData = { clientX, clientY, element };
        pendingClickTimeoutId = window.setTimeout(() => {
          pendingClickTimeoutId = null;
          const pendingClick = pendingClickData;
          pendingClickData = null;

          if (!pendingClick) return;

          send({ type: "SET_LAST_GRABBED", element: pendingClick.element });
          performCopyWithLabel({
            element: pendingClick.element,
            positionX: pendingClick.clientX,
            positionY: pendingClick.clientY,
          });
        }, DOUBLE_CLICK_THRESHOLD_MS);
      } else {
        send({ type: "SET_LAST_GRABBED", element });
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

      // HACK: Calculate drag rectangle BEFORE sending DRAG_END, because DRAG_END resets dragStart
      const dragSelectionRect = wasDragGesture
        ? calculateDragRectangle(clientX, clientY)
        : null;

      if (wasDragGesture) {
        send({ type: "DRAG_END", position: { x: clientX, y: clientY } });
      } else {
        send({ type: "DRAG_CANCEL", position: { x: clientX, y: clientY } });
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
        isEnterKey &&
        isOverlayActive &&
        !isInputMode() &&
        !context().isToggleMode;

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
      send({ type: "FREEZE_ELEMENT", element: nextElement });
      send({ type: "FREEZE" });
      const bounds = createElementBounds(nextElement);
      send({
        type: "MOUSE_MOVE",
        position: getBoundsCenter(bounds),
      });
      return true;
    };

    const handleEnterKeyActivation = (event: KeyboardEvent): boolean => {
      if (!isEnterCode(event.code)) return false;

      const copiedElement = context().lastCopiedElement;
      const canActivateFromCopied =
        !isHoldingKeys() &&
        !isInputMode() &&
        !isActivated() &&
        copiedElement &&
        document.contains(copiedElement) &&
        hasAgentProvider() &&
        !context().labelInstances.some(
          (instance) =>
            instance.status === "copied" || instance.status === "fading",
        );

      if (canActivateFromCopied && copiedElement) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        const center = getBoundsCenter(createElementBounds(copiedElement));

        send({ type: "MOUSE_MOVE", position: center });
        prepareInputMode(copiedElement, center.x, center.y);
        send({ type: "FREEZE_ELEMENT", element: copiedElement });
        send({ type: "SET_LAST_COPIED", element: null });

        activateInputMode();
        activateRenderer();
        return true;
      }

      const canActivateFromHolding =
        isHoldingKeys() && !isInputMode() && hasAgentProvider();

      if (canActivateFromHolding) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        const element = context().frozenElement || targetElement();
        if (element) {
          prepareInputMode(
            element,
            context().mousePosition.x,
            context().mousePosition.y,
          );
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

      const filePath = context().selectionFilePath;
      const lineNumber = context().selectionLineNumber;
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
          !context().isToggleMode &&
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
        if (
          context().isToggleMode &&
          options.activationMode !== "hold"
        )
          return;
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
        send({ type: "HOLD_START", duration: activationDuration });
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
          send({ type: "INPUT_CANCEL" });
          return;
        }

        if (
          isInputMode() ||
          (isEventFromOverlay(event, "data-react-grab-ignore-events") &&
            !isEnterToActivateInput)
        ) {
          if (event.key === "Escape") {
            if (agentManager.isProcessing() && !isPendingAgentAbort()) {
              event.preventDefault();
              event.stopPropagation();
              send({ type: "ESC" });
            } else if (context().isToggleMode && !isInputMode()) {
              deactivateRenderer();
            }
          }
          return;
        }

        if (event.key === "Escape") {
          if (agentManager.isProcessing()) {
            if (!isPendingAgentAbort()) {
              event.preventDefault();
              event.stopPropagation();
              send({ type: "ESC" });
            }
            return;
          }

          if (isHoldingKeys() || context().isToggleMode) {
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
            if (
              context().isToggleMode &&
              options.activationMode !== "hold"
            )
              return;
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
          if (
            context().isToggleMode &&
            options.activationMode !== "hold"
          )
            return;
          if (isHoldingKeys()) {
            send({ type: "RELEASE" });
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
      send({ type: "SET_TOUCH_MODE", value: false });
      if (isEventFromOverlay(event, "data-react-grab-ignore-events")) return;
      if (isActivated() && !isInputMode() && isToggleFrozen()) {
        send({ type: "UNFREEZE" });
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

    eventListenerManager.addWindowListener("mouseup", (event: MouseEvent) => {
      if (event.button !== 0) return;
      handlePointerUp(event.clientX, event.clientY);
    });

    eventListenerManager.addWindowListener(
      "contextmenu",
      (event: MouseEvent) => {
        if (!isRendererActive() || isCopying() || isInputMode()) return;
        if (!hasAgentProvider()) return;

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

        prepareInputMode(element, event.clientX, event.clientY);
        send({
          type: "MOUSE_MOVE",
          position: { x: event.clientX, y: event.clientY },
        });
        send({ type: "FREEZE_ELEMENT", element });
        activateInputMode();
      },
      { capture: true },
    );

    eventListenerManager.addWindowListener(
      "touchmove",
      (event: TouchEvent) => {
        if (event.touches.length === 0) return;
        send({ type: "SET_TOUCH_MODE", value: true });
        if (isEventFromOverlay(event, "data-react-grab-ignore-events")) return;
        if (isHoldingKeys() && !isInputMode() && isToggleFrozen()) {
          send({ type: "UNFREEZE" });
        }
        handlePointerMove(event.touches[0].clientX, event.touches[0].clientY);
      },
      { passive: true },
    );

    eventListenerManager.addWindowListener(
      "touchstart",
      (event: TouchEvent) => {
        if (event.touches.length === 0) return;
        send({ type: "SET_TOUCH_MODE", value: true });

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

        if (isRendererActive() || isCopying() || didJustDrag()) {
          event.preventDefault();
          event.stopPropagation();

          if (
            context().isToggleMode &&
            !isCopying() &&
            !isInputMode()
          ) {
            if (pendingClickTimeoutId !== null) return;

            if (!isHoldingKeys()) {
              deactivateRenderer();
            } else {
              send({ type: "SET_TOGGLE_MODE", value: false });
            }
          }
        }
      },
      { capture: true },
    );

    eventListenerManager.addDocumentListener("visibilitychange", () => {
      if (document.hidden) {
        send({ type: "CLEAR_GRABBED_BOXES" });
        const contextActivationTimestamp =
          context().activationTimestamp;
        if (
          isActivated() &&
          !isInputMode() &&
          contextActivationTimestamp !== null &&
          Date.now() - contextActivationTimestamp >
            BLUR_DEACTIVATION_THRESHOLD_MS
        ) {
          deactivateRenderer();
        }
      }
    });

    eventListenerManager.addWindowListener(
      "scroll",
      () => {
        send({ type: "VIEWPORT_CHANGE" });
      },
      { capture: true },
    );

    eventListenerManager.addWindowListener("resize", () => {
      send({ type: "VIEWPORT_CHANGE" });
    });

    let boundsRecalcIntervalId: number | null = null;
    let viewportChangeFrameId: number | null = null;

    const startBoundsRecalcIntervalIfNeeded = () => {
      const shouldRunInterval =
        theme().enabled &&
        (isActivated() ||
          isCopying() ||
          context().labelInstances.length > 0 ||
          context().grabbedBoxes.length > 0 ||
          agentManager.sessions().size > 0);

      if (shouldRunInterval && boundsRecalcIntervalId === null) {
        boundsRecalcIntervalId = window.setInterval(() => {
          if (viewportChangeFrameId !== null) return;

          viewportChangeFrameId = requestAnimationFrame(() => {
            viewportChangeFrameId = null;
            send({ type: "VIEWPORT_CHANGE" });
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
      void context().labelInstances.length;
      void context().grabbedBoxes.length;
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
      actorRef.stop();
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

    const selectionLabelVisible = createElementVisibilityMemo("elementLabel");

    const computedLabelInstances = createMemo(() => {
      void context().viewportVersion;
      return context().labelInstances.map((instance) => {
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
      void context().viewportVersion;
      return context().grabbedBoxes.map((box) => {
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
        !context().isTouchMode &&
        !isToggleFrozen() &&
        !isInputMode(),
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
            selectionBoundsMultiple={frozenElementsBounds()}
            selectionElementsCount={frozenElementsCount()}
            selectionFilePath={
              context().selectionFilePath ?? undefined
            }
            selectionLineNumber={
              context().selectionLineNumber ?? undefined
            }
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
            inputValue={context().inputText}
            isInputMode={isInputMode()}
            hasAgent={hasAgentProvider()}
            isAgentConnected={context().isAgentConnected}
            agentSessions={agentManager.sessions()}
            supportsUndo={context().supportsUndo}
            supportsFollowUp={context().supportsFollowUp}
            dismissButtonText={context().dismissButtonText}
            onAbortSession={agentManager.session.abort}
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
            isPendingAgentAbort={isPendingAgentAbort()}
            onConfirmAgentAbort={handleConfirmAgentAbort}
            onCancelAgentAbort={handleCancelAgentAbort}
            theme={theme()}
            toolbarVisible={theme().toolbar.enabled}
            isActive={isActivated()}
            onToggleActive={handleToggleActive}
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
        send({
          type: "SET_HAS_AGENT_PROVIDER",
          value: Boolean(mergedOptions.provider),
        });
        send({
          type: "SET_AGENT_CAPABILITIES",
          supportsUndo: Boolean(mergedOptions.provider?.undo),
          supportsFollowUp: Boolean(mergedOptions.provider?.supportsFollowUp),
          dismissButtonText: mergedOptions.provider?.dismissButtonText,
          isAgentConnected: false,
        });

        if (mergedOptions.provider?.checkConnection) {
          void mergedOptions.provider.checkConnection().then((connected) => {
            send({
              type: "SET_AGENT_CAPABILITIES",
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
