// @ts-expect-error - CSS imported as text via tsup loader
import cssText from "../../dist/styles.css";
import {
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
} from "../constants.js";
import { getBoundsCenter } from "../utils/get-bounds-center.js";
import { isCLikeKey } from "../utils/is-c-like-key.js";
import { keyMatchesCode } from "../utils/key-matches-code.js";
import { isTargetKeyCombination } from "../utils/is-target-key-combination.js";
import { isEventFromOverlay } from "../utils/is-event-from-overlay.js";
import { buildOpenFileUrl } from "../utils/build-open-file-url.js";
import {
  captureElementScreenshot,
  copyImageToClipboard,
  combineBounds,
} from "../utils/capture-screenshot.js";
import { isScreenshotSupported } from "../utils/is-screenshot-supported.js";
import { delay } from "../utils/delay.js";
import type {
  Options,
  OverlayBounds,
  GrabbedBox,
  ReactGrabAPI,
  ReactGrabState,
  SelectionLabelInstance,
  AgentSession,
  ContextMenuActionContext,
  SettableOptions,
  Plugin,
} from "../types.js";
import { DEFAULT_THEME } from "./theme.js";
import { createPluginRegistry } from "./plugin-registry.js";
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
    return createNoopApi();
  }

  const scriptOptions = getScriptOptions();

  const initialOptions: Options = {
    enabled: true,
    activationMode: "toggle",
    keyHoldDuration: DEFAULT_KEY_HOLD_DURATION_MS,
    allowActivationInsideInput: true,
    maxContextLines: 3,
    ...scriptOptions,
    ...rawOptions,
  };

  if (initialOptions.enabled === false || hasInited) {
    return createNoopApi();
  }
  hasInited = true;

  logIntro();

  return createRoot((dispose) => {
    const pluginRegistry = createPluginRegistry(initialOptions);

    const { store, actions } = createGrabStore({
      theme: DEFAULT_THEME,
      hasAgentProvider: Boolean(pluginRegistry.store.agent?.provider),
      keyHoldDuration:
        pluginRegistry.store.options.keyHoldDuration ?? DEFAULT_KEY_HOLD_DURATION_MS,
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

    const isPromptMode = createMemo(
      () => store.current.state === "active" && store.current.isPromptMode,
    );

    const isPendingDismiss = createMemo(
      () =>
        store.current.state === "active" &&
        store.current.isPromptMode &&
        store.current.isPendingDismiss,
    );

    const pendingAbortSessionId = createMemo(() => store.pendingAbortSessionId);

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
        if (pluginRegistry.store.options.activationMode !== "hold") {
          actions.setWasActivatedByToggle(true);
        }
        pluginRegistry.hooks.onActivate();
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

    const preparePromptMode = (
      element: Element,
      positionX: number,
      positionY: number,
    ) => {
      setCopyStartPosition(element, positionX, positionY);
      loadCachedInput(element);
    };

    const activatePromptMode = () => {
      const element = store.frozenElement || targetElement();
      if (element) {
        actions.enterPromptMode(
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
    let isScreenshotInProgress = false;

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
      pluginRegistry.hooks.onGrabbedBox(bounds, element);

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
      elements?: Element[],
      boundsMultiple?: OverlayBounds[],
    ): string => {
      const instanceId = `label-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const instance: SelectionLabelInstance = {
        id: instanceId,
        bounds,
        boundsMultiple,
        tagName,
        componentName,
        status,
        createdAt: Date.now(),
        element,
        elements,
        mouseX,
      };
      actions.addLabelInstance(instance);
      return instanceId;
    };

    const updateLabelInstance = (
      instanceId: string,
      status: SelectionLabelInstance["status"],
      errorMessage?: string,
    ) => {
      actions.updateLabelInstance(instanceId, status, errorMessage);
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
      elements?: Element[],
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
              elements,
            )
          : null;

      await operation().finally(() => {
        actions.completeCopy(element);

        if (instanceId) {
          updateLabelInstance(instanceId, "copied");

          setTimeout(() => {
            updateLabelInstance(instanceId, "fading");
            // HACK: Wait slightly longer than CSS transition (100ms) to ensure fade completes before unmount
            setTimeout(() => {
              removeLabelInstance(instanceId);
            }, 150);
          }, COPIED_LABEL_DURATION_MS);
        }

        if (store.wasActivatedByToggle || shouldDeactivateAfter) {
          deactivateRenderer();
        }
      });
    };

    const copyWithFallback = (elements: Element[], extraPrompt?: string) =>
      tryCopyWithFallback(
        {
          maxContextLines: pluginRegistry.store.options.maxContextLines,
          getContent: pluginRegistry.store.options.getContent,
        },
        {
          onBeforeCopy: pluginRegistry.hooks.onBeforeCopy,
          onAfterCopy: pluginRegistry.hooks.onAfterCopy,
          onCopySuccess: pluginRegistry.hooks.onCopySuccess,
          onCopyError: pluginRegistry.hooks.onCopyError,
        },
        elements,
        extraPrompt,
      );

    const copyElementsToClipboard = async (
      targetElements: Element[],
      extraPrompt?: string,
    ): Promise<void> => {
      if (targetElements.length === 0) return;

      for (const element of targetElements) {
        pluginRegistry.hooks.onElementSelect(element);
        if (pluginRegistry.store.theme.grabbedBoxes.enabled) {
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
          elements,
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
      if (isCopying() || isPromptMode()) {
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
            pluginRegistry.hooks.onElementHover(currentElement);
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
            isPromptMode(),
            targetElement(),
            dragBounds(),
          ] as const,
        ([active, dragging, copying, inputMode, target, drag]) => {
          pluginRegistry.hooks.onStateChange({
            isActive: active,
            isDragging: dragging,
            isCopying: copying,
            isPromptMode: inputMode,
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
            isPromptMode(),
            store.pointer.x,
            store.pointer.y,
            targetElement(),
          ] as const,
        ([inputMode, x, y, target]) => {
          pluginRegistry.hooks.onPromptModeChange(inputMode, {
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
          pluginRegistry.hooks.onSelectionBox(
            Boolean(visible),
            bounds ?? null,
            element,
          );
        },
      ),
    );

    createEffect(
      on(
        () => [dragVisible(), dragBounds()] as const,
        ([visible, bounds]) => {
          pluginRegistry.hooks.onDragBox(Boolean(visible), bounds ?? null);
        },
      ),
    );

    createEffect(
      on(
        () => [crosshairVisible(), store.pointer.x, store.pointer.y] as const,
        ([visible, x, y]) => {
          pluginRegistry.hooks.onCrosshair(Boolean(visible), { x, y });
        },
      ),
    );

    createEffect(
      on(
        () => [labelVisible(), labelVariant(), cursorPosition()] as const,
        ([visible, variant, position]) => {
          pluginRegistry.hooks.onElementLabel(Boolean(visible), variant, {
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
            isPromptMode(),
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
        pluginRegistry.hooks.onActivate();
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
      autoScroller.stop();
      if (
        previousFocused instanceof HTMLElement &&
        document.contains(previousFocused)
      ) {
        previousFocused.focus();
      }
      pluginRegistry.hooks.onDeactivate();
    };

    const toggleActivate = () => {
      actions.setWasActivatedByToggle(true);
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
        actions.setWasActivatedByToggle(true);

        if (!isActivated()) {
          activateRenderer();
        }
      }
    };

    const getAgentOptionsWithCallbacks = () => {
      const agent = pluginRegistry.store.agent;
      if (!agent) return undefined;
      return {
        ...agent,
        onAbort: (session: AgentSession, elements: Element[]) => {
          pluginRegistry.store.agent?.onAbort?.(session, elements);
          restoreInputFromSession(session, elements);
        },
        onUndo: (session: AgentSession, elements: Element[]) => {
          pluginRegistry.store.agent?.onUndo?.(session, elements);
          restoreInputFromSession(session, elements);
        },
      };
    };

    const agentManager = createAgentManager(getAgentOptionsWithCallbacks());

    const handleInputChange = (value: string) => {
      actions.setInputText(value);
    };

    const handleInputSubmit = () => {
      actions.setLastCopied(null);
      const frozenElements = [...store.frozenElements];
      const element = store.frozenElement || targetElement();
      const prompt = isPromptMode() ? store.inputText.trim() : "";

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
      actions.exitPromptMode();
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
      if (!isPromptMode()) return;

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
        preparePromptMode(element, store.pointer.x, store.pointer.y);
      }
      activatePromptMode();
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
      if (
        isPromptMode() ||
        isToggleFrozen() ||
        store.contextMenuPosition !== null
      )
        return;

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

      pluginRegistry.hooks.onDragStart(
        clientX + window.scrollX,
        clientY + window.scrollY,
      );

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

      pluginRegistry.hooks.onDragEnd(selectedElements, dragSelectionRect);
      const firstElement = selectedElements[0];
      const center = getBoundsCenter(createElementBounds(firstElement));

      if (hasAgentProvider()) {
        actions.setPointer(center);
        actions.setFrozenElements(selectedElements);
        actions.freeze();
        actions.showContextMenu(center, firstElement);
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

      actions.setLastGrabbed(element);
      performCopyWithLabel({
        element,
        positionX: clientX,
        positionY: clientY,
      });
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
        isEnterKey &&
        isOverlayActive &&
        !isPromptMode() &&
        !store.wasActivatedByToggle;

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
      if (!isActivated() || isPromptMode()) return false;

      const currentElement = effectiveElement();
      if (!currentElement) return false;

      const nextElement = arrowNavigator.findNext(event.key, currentElement);
      if (!nextElement) return false;

      event.preventDefault();
      event.stopPropagation();
      actions.setFrozenElement(nextElement);
      actions.freeze();
      const bounds = createElementBounds(nextElement);
      const center = getBoundsCenter(bounds);
      actions.setPointer(center);

      if (store.contextMenuPosition !== null) {
        actions.showContextMenu(center, nextElement);
      }

      return true;
    };

    const handleEnterKeyActivation = (event: KeyboardEvent): boolean => {
      if (!isEnterCode(event.code)) return false;

      const copiedElement = store.lastCopiedElement;
      const canActivateFromCopied =
        !isHoldingKeys() &&
        !isPromptMode() &&
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
        preparePromptMode(copiedElement, center.x, center.y);
        actions.setFrozenElement(copiedElement);
        actions.setLastCopied(null);

        activatePromptMode();
        if (!isActivated()) {
          activateRenderer();
        }
        return true;
      }

      const canActivateFromHolding =
        isHoldingKeys() && !isPromptMode() && hasAgentProvider();

      if (canActivateFromHolding) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        const element = store.frozenElement || targetElement();
        const pointerX = store.pointer.x;
        const pointerY = store.pointer.y;
        if (element) {
          preparePromptMode(element, pointerX, pointerY);
        }

        actions.setPointer({ x: pointerX, y: pointerY });
        if (element) {
          actions.setFrozenElement(element);
        }
        activatePromptMode();

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
      if (event.key?.toLowerCase() !== "o" || isPromptMode()) return false;
      if (!isActivated() || !(event.metaKey || event.ctrlKey)) return false;

      const filePath = store.selectionFilePath;
      const lineNumber = store.selectionLineNumber;
      if (!filePath) return false;

      event.preventDefault();
      event.stopPropagation();

      const wasHandled = pluginRegistry.hooks.onOpenFile(filePath, lineNumber ?? undefined);
      if (!wasHandled) {
        const url = buildOpenFileUrl(filePath, lineNumber ?? undefined);
        window.open(url, "_blank", "noopener,noreferrer");
      }
      return true;
    };

    const handleScreenshotShortcut = (event: KeyboardEvent): boolean => {
      if (!isScreenshotSupported()) return false;
      if (store.contextMenuPosition !== null) return false;
      if (event.key?.toLowerCase() !== "s" || isPromptMode()) return false;
      if (!isActivated() || !(event.metaKey || event.ctrlKey)) return false;

      const allBounds = frozenElementsBounds();
      const singleBounds = selectionBounds();
      const element = store.frozenElement || targetElement();
      const bounds =
        allBounds.length > 1 ? combineBounds(allBounds) : singleBounds;
      if (!bounds) return false;

      event.preventDefault();
      event.stopPropagation();

      const tagName = element ? getTagName(element) || "element" : "element";
      const shouldDeactivate = store.wasActivatedByToggle;
      const overlayBounds: OverlayBounds = {
        ...bounds,
        borderRadius: "0px",
        transform: "",
      };
      const selectionBoundsArray =
        allBounds.length > 1 ? allBounds : singleBounds ? [singleBounds] : [];

      const instanceId = createLabelInstance(
        overlayBounds,
        tagName,
        undefined,
        "copying",
        element ?? undefined,
        bounds.x + bounds.width / 2,
        undefined,
        selectionBoundsArray,
      );

      isScreenshotInProgress = true;
      rendererRoot.style.visibility = "hidden";

      void (async () => {
        await delay(50);

        let didSucceed = false;
        let errorMessage: string | undefined;

        try {
          const blob = await captureElementScreenshot(bounds);
          didSucceed = await copyImageToClipboard(blob);
          if (!didSucceed) {
            errorMessage = "Failed to copy";
          }
        } catch (error) {
          errorMessage =
            error instanceof Error ? error.message : "Screenshot failed";
        }

        isScreenshotInProgress = false;
        rendererRoot.style.visibility = "";

        updateLabelInstance(
          instanceId,
          didSucceed ? "copied" : "error",
          didSucceed ? undefined : errorMessage,
        );

        setTimeout(() => {
          updateLabelInstance(instanceId, "fading");
          setTimeout(() => {
            removeLabelInstance(instanceId);
          }, 150);
        }, COPIED_LABEL_DURATION_MS);

        if (shouldDeactivate) {
          deactivateRenderer();
        } else {
          actions.unfreeze();
        }
      })();

      return true;
    };

    const handleActivationKeys = (event: KeyboardEvent): void => {
      if (
        !pluginRegistry.store.options.allowActivationInsideInput &&
        isKeyboardEventTriggeredByInput(event)
      ) {
        return;
      }

      if (!isTargetKeyCombination(event, pluginRegistry.store.options)) {
        if (
          isActivated() &&
          !store.wasActivatedByToggle &&
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

      if ((isActivated() || isHoldingKeys()) && !isPromptMode()) {
        event.preventDefault();
        if (isEnterCode(event.code)) {
          event.stopPropagation();
          event.stopImmediatePropagation();
        }
      }

      if (isActivated()) {
        if (
          store.wasActivatedByToggle &&
          pluginRegistry.store.options.activationMode !== "hold"
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
          pluginRegistry.store.options.keyHoldDuration ?? DEFAULT_KEY_HOLD_DURATION_MS;
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
          isEnterCode(event.code) && isHoldingKeys() && !isPromptMode();

        if (
          isPromptMode() &&
          isTargetKeyCombination(event, pluginRegistry.store.options) &&
          !event.repeat
        ) {
          event.preventDefault();
          event.stopPropagation();
          handleInputCancel();
          return;
        }

        if (
          isPromptMode() ||
          (isEventFromOverlay(event, "data-react-grab-ignore-events") &&
            !isEnterToActivateInput)
        ) {
          if (event.key === "Escape") {
            if (pendingAbortSessionId()) {
              event.preventDefault();
              event.stopPropagation();
              actions.setPendingAbortSessionId(null);
            } else if (store.wasActivatedByToggle && !isPromptMode()) {
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

          if (isHoldingKeys() || store.wasActivatedByToggle) {
            deactivateRenderer();
            return;
          }
        }

        if (handleArrowNavigation(event)) return;
        if (handleEnterKeyActivation(event)) return;
        if (handleOpenFileShortcut(event)) return;
        if (handleScreenshotShortcut(event)) return;

        handleActivationKeys(event);
      },
      { capture: true },
    );

    eventListenerManager.addWindowListener(
      "keyup",
      (event: KeyboardEvent) => {
        if (blockEnterIfNeeded(event)) return;

        if (!isHoldingKeys() && !isActivated()) return;
        if (isPromptMode()) return;

        const hasCustomShortcut = Boolean(
          pluginRegistry.store.options.activationShortcut ||
            pluginRegistry.store.options.activationKey,
        );

        const requiredModifiers = getRequiredModifiers(pluginRegistry.store.options);
        const isReleasingModifier =
          requiredModifiers.metaKey || requiredModifiers.ctrlKey
            ? !event.metaKey && !event.ctrlKey
            : (requiredModifiers.shiftKey && !event.shiftKey) ||
              (requiredModifiers.altKey && !event.altKey);

        const isReleasingActivationKey = pluginRegistry.store.options.activationShortcut
          ? !pluginRegistry.store.options.activationShortcut(event)
          : pluginRegistry.store.options.activationKey
            ? pluginRegistry.store.options.activationKey.key
              ? event.key?.toLowerCase() ===
                  pluginRegistry.store.options.activationKey.key.toLowerCase() ||
                keyMatchesCode(pluginRegistry.store.options.activationKey.key, event.code)
              : false
            : isCLikeKey(event.key, event.code);

        if (isActivated()) {
          if (isReleasingModifier) {
            if (
              store.wasActivatedByToggle &&
              pluginRegistry.store.options.activationMode !== "hold"
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
            store.wasActivatedByToggle &&
            pluginRegistry.store.options.activationMode !== "hold"
          )
            return;
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
      if (isActivated() && !isPromptMode() && isToggleFrozen()) {
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
        if (store.contextMenuPosition !== null) return;

        if (isPromptMode()) {
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
        if (store.contextMenuPosition !== null) return;
        if (!isRendererActive() || isCopying() || isPromptMode()) return;
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
        if (!isRendererActive() || isCopying() || isPromptMode()) return;
        if (isEventFromOverlay(event, "data-react-grab-ignore-events")) return;

        event.preventDefault();
        event.stopPropagation();

        const element = getElementAtPosition(event.clientX, event.clientY);
        if (!element) return;

        const position = { x: event.clientX, y: event.clientY };
        actions.setPointer(position);
        actions.setFrozenElement(element);
        actions.freeze();
        actions.showContextMenu(position, element);
        pluginRegistry.hooks.onContextMenu(element, position);
      },
      { capture: true },
    );

    eventListenerManager.addWindowListener(
      "touchmove",
      (event: TouchEvent) => {
        if (event.touches.length === 0) return;
        actions.setTouchMode(true);
        if (isEventFromOverlay(event, "data-react-grab-ignore-events")) return;
        if (isHoldingKeys() && !isPromptMode() && isToggleFrozen()) {
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

        if (isPromptMode()) {
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

          if (store.wasActivatedByToggle && !isCopying() && !isPromptMode()) {
            if (!isHoldingKeys()) {
              deactivateRenderer();
            } else {
              actions.setWasActivatedByToggle(false);
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
          !isPromptMode() &&
          !isScreenshotInProgress &&
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
        actions.updateContextMenuPosition();
      },
      { capture: true },
    );

    eventListenerManager.addWindowListener("resize", () => {
      actions.incrementViewportVersion();
      actions.updateSessionBounds();
      actions.updateContextMenuPosition();
    });

    let boundsRecalcIntervalId: number | null = null;
    let viewportChangeFrameId: number | null = null;

    const startBoundsRecalcIntervalIfNeeded = () => {
      const shouldRunInterval =
        pluginRegistry.store.theme.enabled &&
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
      void pluginRegistry.store.theme.enabled;
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
          isPromptMode() ||
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
        if (!pluginRegistry.store.theme.enabled) return false;
        if (!pluginRegistry.store.theme[themeKey].enabled) return false;
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
      if (!pluginRegistry.store.theme.elementLabel.enabled) return false;
      if (didJustCopy()) return false;
      return isRendererActive() && !isDragging() && Boolean(effectiveElement());
    });

    const labelInstanceCache = new Map<string, SelectionLabelInstance>();
    const computedLabelInstances = createMemo(() => {
      if (!pluginRegistry.store.theme.enabled) return [];
      if (!pluginRegistry.store.theme.grabbedBoxes.enabled) return [];
      void store.viewportVersion;
      const currentIds = new Set(store.labelInstances.map((i) => i.id));
      for (const cachedId of labelInstanceCache.keys()) {
        if (!currentIds.has(cachedId)) {
          labelInstanceCache.delete(cachedId);
        }
      }
      return store.labelInstances.map((instance) => {
        const newBounds =
          instance.element && document.body.contains(instance.element)
            ? createElementBounds(instance.element)
            : instance.bounds;
        const previousInstance = labelInstanceCache.get(instance.id);
        const boundsUnchanged =
          previousInstance &&
          previousInstance.bounds.x === newBounds.x &&
          previousInstance.bounds.y === newBounds.y &&
          previousInstance.bounds.width === newBounds.width &&
          previousInstance.bounds.height === newBounds.height;
        if (
          previousInstance &&
          previousInstance.status === instance.status &&
          previousInstance.errorMessage === instance.errorMessage &&
          boundsUnchanged
        ) {
          return previousInstance;
        }
        const newCached = { ...instance, bounds: newBounds };
        labelInstanceCache.set(instance.id, newCached);
        return newCached;
      });
    });

    const computedGrabbedBoxes = createMemo(() => {
      if (!pluginRegistry.store.theme.enabled) return [];
      if (!pluginRegistry.store.theme.grabbedBoxes.enabled) return [];
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
        pluginRegistry.store.theme.enabled &&
        pluginRegistry.store.theme.dragBox.enabled &&
        isRendererActive() &&
        isDraggingBeyondThreshold(),
    );

    const labelVariant = createMemo(() =>
      isCopying() ? "processing" : "hover",
    );

    const labelVisible = createMemo(() => {
      if (!pluginRegistry.store.theme.enabled) return false;
      const themeEnabled = pluginRegistry.store.theme.elementLabel.enabled;
      const inPromptMode = isPromptMode();
      const copying = isCopying();
      const rendererActive = isRendererActive();
      const dragging = isDragging();
      const hasElement = Boolean(effectiveElement());

      if (!themeEnabled) return false;
      if (inPromptMode) return false;
      if (copying) return true;
      return rendererActive && !dragging && hasElement;
    });

    const crosshairVisible = createMemo(
      () =>
        pluginRegistry.store.theme.enabled &&
        pluginRegistry.store.theme.crosshair.enabled &&
        isRendererActive() &&
        !isDragging() &&
        !store.isTouchMode &&
        !isToggleFrozen() &&
        !isPromptMode() &&
        store.contextMenuPosition === null,
    );

    const contextMenuBounds = createMemo((): OverlayBounds | null => {
      void store.viewportVersion;
      const element = store.contextMenuElement;
      if (!element) return null;
      return createElementBounds(element);
    });

    const contextMenuPosition = createMemo(() => {
      void store.viewportVersion;
      return store.contextMenuPosition;
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
      async (
        element,
      ): Promise<{
        filePath: string;
        lineNumber: number | undefined;
      } | null> => {
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

    const contextMenuActionContext = createMemo(
      (): ContextMenuActionContext | undefined => {
        const element = store.contextMenuElement;
        if (!element) return undefined;
        const fileInfo = contextMenuFilePath();
        return {
          element,
          elements: store.frozenElements.length > 0 ? store.frozenElements : [element],
          filePath: fileInfo?.filePath,
          lineNumber: fileInfo?.lineNumber,
          componentName: contextMenuComponentName(),
          tagName: contextMenuTagName(),
        };
      },
    );

    const handleContextMenuCopy = () => {
      const element = store.contextMenuElement;
      if (!element) return;

      const position = store.contextMenuPosition ?? store.pointer;
      const frozenElements = [...store.frozenElements];

      performCopyWithLabel({
        element,
        positionX: position.x,
        positionY: position.y,
        elements: frozenElements.length > 1 ? frozenElements : undefined,
        shouldDeactivateAfter: store.wasActivatedByToggle,
      });

      // HACK: Defer hiding context menu until after click event propagates fully
      setTimeout(() => {
        actions.hideContextMenu();
      }, 0);
    };

    const handleContextMenuCopyScreenshot = async () => {
      const allBounds = frozenElementsBounds();
      const singleBounds = contextMenuBounds();
      const element = store.contextMenuElement;
      const bounds =
        allBounds.length > 1 ? combineBounds(allBounds) : singleBounds;
      if (!bounds) return;

      const tagName = element ? getTagName(element) || "element" : "element";
      const shouldDeactivate = store.wasActivatedByToggle;
      const overlayBounds: OverlayBounds = {
        ...bounds,
        borderRadius: "0px",
        transform: "",
      };
      const selectionBoundsArray =
        allBounds.length > 1 ? allBounds : singleBounds ? [singleBounds] : [];

      actions.hideContextMenu();

      const instanceId = createLabelInstance(
        overlayBounds,
        tagName,
        undefined,
        "copying",
        element ?? undefined,
        bounds.x + bounds.width / 2,
        undefined,
        selectionBoundsArray,
      );

      isScreenshotInProgress = true;
      rendererRoot.style.visibility = "hidden";
      await delay(50);

      let didSucceed = false;
      let errorMessage: string | undefined;

      try {
        const blob = await captureElementScreenshot(bounds);
        didSucceed = await copyImageToClipboard(blob);
        if (!didSucceed) {
          errorMessage = "Failed to copy";
        }
      } catch (error) {
        errorMessage =
          error instanceof Error ? error.message : "Screenshot failed";
      }

      isScreenshotInProgress = false;
      rendererRoot.style.visibility = "";

      updateLabelInstance(
        instanceId,
        didSucceed ? "copied" : "error",
        didSucceed ? undefined : errorMessage,
      );

      setTimeout(() => {
        updateLabelInstance(instanceId, "fading");
        setTimeout(() => {
          removeLabelInstance(instanceId);
        }, 150);
      }, COPIED_LABEL_DURATION_MS);

      if (shouldDeactivate) {
        deactivateRenderer();
      } else {
        actions.unfreeze();
      }
    };

    const handleContextMenuOpen = () => {
      const fileInfo = contextMenuFilePath();
      if (fileInfo) {
        const wasHandled = pluginRegistry.hooks.onOpenFile(fileInfo.filePath, fileInfo.lineNumber ?? undefined);
        if (!wasHandled) {
          const openFileUrl = buildOpenFileUrl(
            fileInfo.filePath,
            fileInfo.lineNumber,
          );
          window.open(openFileUrl, "_blank", "noopener,noreferrer");
        }
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

      preparePromptMode(element, position.x, position.y);
      actions.setPointer({ x: position.x, y: position.y });
      if (store.frozenElements.length === 0) {
        actions.setFrozenElement(element);
      }
      activatePromptMode();

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

    const handleShowContextMenuSession = (sessionId: string) => {
      const session = agentManager.sessions().get(sessionId);
      if (!session) return;

      const element = store.sessionElements.get(sessionId);
      if (!element) return;
      if (!document.contains(element)) return;

      // HACK: Defer context menu display to avoid event interference
      setTimeout(() => {
        if (!isActivated()) {
          actions.setWasActivatedByToggle(true);
          activateRenderer();
        }
        actions.setPointer(session.position);
        actions.setFrozenElement(element);
        actions.freeze();
        actions.showContextMenu(session.position, element);
      }, 0);
    };

    const handleShowContextMenuInstance = (instanceId: string) => {
      const instance = store.labelInstances.find(
        (labelInstance) => labelInstance.id === instanceId,
      );
      if (!instance?.element) return;
      if (!document.contains(instance.element)) return;

      const elementBounds = createElementBounds(instance.element);
      const position = {
        x: instance.mouseX ?? elementBounds.x + elementBounds.width / 2,
        y: elementBounds.y + elementBounds.height / 2,
      };

      const elementsToFreeze =
        instance.elements && instance.elements.length > 0
          ? instance.elements.filter((element) => document.contains(element))
          : [instance.element];

      // HACK: Defer context menu display to avoid event interference
      setTimeout(() => {
        if (!isActivated()) {
          actions.setWasActivatedByToggle(true);
          activateRenderer();
        }
        actions.setPointer(position);
        actions.setFrozenElements(elementsToFreeze);
        actions.freeze();
        actions.showContextMenu(position, instance.element!);
      }, 0);
    };

    createEffect(() => {
      const hue = pluginRegistry.store.theme.hue;
      if (hue !== 0) {
        rendererRoot.style.filter = `hue-rotate(${hue}deg)`;
      } else {
        rendererRoot.style.filter = "";
      }
    });

    if (pluginRegistry.store.theme.enabled) {
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
            grabbedBoxes={computedGrabbedBoxes()}
            labelZIndex={Z_INDEX_LABEL}
            mouseX={cursorPosition().x}
            mouseY={cursorPosition().y}
            crosshairVisible={crosshairVisible()}
            inputValue={store.inputText}
            isPromptMode={isPromptMode()}
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
            onShowContextMenuSession={handleShowContextMenuSession}
            onShowContextMenuInstance={handleShowContextMenuInstance}
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
            theme={pluginRegistry.store.theme}
            toolbarVisible={pluginRegistry.store.theme.toolbar.enabled}
            isActive={isActivated()}
            onToggleActive={handleToggleActive}
            contextMenuPosition={contextMenuPosition()}
            contextMenuBounds={contextMenuBounds()}
            contextMenuTagName={contextMenuTagName()}
            contextMenuComponentName={contextMenuComponentName()}
            contextMenuHasFilePath={Boolean(contextMenuFilePath()?.filePath)}
            contextMenuHasAgent={hasAgentProvider()}
            contextMenuActions={pluginRegistry.store.contextMenuActions}
            contextMenuActionContext={contextMenuActionContext()}
            onContextMenuCopy={handleContextMenuCopy}
            onContextMenuCopyScreenshot={() =>
              void handleContextMenuCopyScreenshot()
            }
            onContextMenuOpen={handleContextMenuOpen}
            onContextMenuEdit={handleContextMenuPrompt}
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

    const syncAgentFromRegistry = () => {
      const agentOpts = getAgentOptionsWithCallbacks();
      if (agentOpts) {
        agentManager._internal.setOptions(agentOpts);
      }
      actions.setHasAgentProvider(Boolean(agentOpts?.provider));
      if (agentOpts?.provider) {
        const capturedProvider = agentOpts.provider;
        actions.setAgentCapabilities({
          supportsUndo: Boolean(capturedProvider.undo),
          supportsFollowUp: Boolean(capturedProvider.supportsFollowUp),
          dismissButtonText: capturedProvider.dismissButtonText,
          isAgentConnected: false,
        });

        if (capturedProvider.checkConnection) {
          capturedProvider
            .checkConnection()
            .then((isConnected) => {
              const currentAgentOpts = getAgentOptionsWithCallbacks();
              if (currentAgentOpts?.provider !== capturedProvider) {
                return;
              }
              actions.setAgentCapabilities({
                supportsUndo: Boolean(capturedProvider.undo),
                supportsFollowUp: Boolean(capturedProvider.supportsFollowUp),
                dismissButtonText: capturedProvider.dismissButtonText,
                isAgentConnected: isConnected,
              });
            })
            .catch(() => {
              // Connection check failed - leave isAgentConnected as false
            });
        }

        agentManager.session.tryResume();
      } else {
        actions.setAgentCapabilities({
          supportsUndo: false,
          supportsFollowUp: false,
          dismissButtonText: undefined,
          isAgentConnected: false,
        });
      }
    };

    const api: ReactGrabAPI = {
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
        isPromptMode: isPromptMode(),
        targetElement: targetElement(),
        dragBounds: dragBounds() ?? null,
      }),
      setOptions: (newOptions: SettableOptions) => {
        pluginRegistry.setOptions(newOptions);
      },
      registerPlugin: (plugin: Plugin) => {
        pluginRegistry.register(plugin, api);
        syncAgentFromRegistry();
      },
      unregisterPlugin: (name: string) => {
        pluginRegistry.unregister(name);
        syncAgentFromRegistry();
      },
      getPlugins: () => pluginRegistry.getPluginNames(),
    };

    return api;
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
  SettableOptions,
  ContextMenuAction,
  ContextMenuActionContext,
  Plugin,
  PluginConfig,
  PluginHooks,
} from "../types.js";

export { generateSnippet } from "../utils/generate-snippet.js";
export { copyContent } from "../utils/copy-content.js";
