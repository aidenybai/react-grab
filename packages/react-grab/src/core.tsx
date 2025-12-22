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
import { useMachine } from "@xstate/solid";
import { stateMachine } from "./state/machine.js";
import { isKeyboardEventTriggeredByInput } from "./utils/is-keyboard-event-triggered-by-input.js";
import { isSelectionInsideEditableElement } from "./utils/is-selection-inside-editable-element.js";
import { mountRoot } from "./utils/mount-root.js";
import { ReactGrabRenderer } from "./components/renderer.js";
import { getStack, getNearestComponentName } from "./context.js";
import { isSourceFile, normalizeFileName } from "bippy/source";
import { createNoopApi } from "./core/noop-api.js";
import { createEventListenerManager } from "./core/events.js";
import { tryCopyWithFallback } from "./core/copy.js";
import { getElementAtPosition } from "./utils/get-element-at-position.js";
import { isValidGrabbableElement } from "./utils/is-valid-grabbable-element.js";
import { getElementsInDrag } from "./utils/get-elements-in-drag.js";
import { createElementBounds } from "./utils/create-element-bounds.js";
import { stripTranslateFromTransform } from "./utils/strip-translate-from-transform.js";
import { getTagName } from "./utils/get-tag-name.js";
import { isSelectionBackward } from "./utils/is-selection-backward.js";
import {
  SUCCESS_LABEL_DURATION_MS,
  COPIED_LABEL_DURATION_MS,
  DRAG_THRESHOLD_PX,
  ELEMENT_DETECTION_THROTTLE_MS,
  Z_INDEX_LABEL,
  AUTO_SCROLL_EDGE_THRESHOLD_PX,
  AUTO_SCROLL_SPEED_PX,
  LOGO_SVG,
  MODIFIER_KEYS,
  BLUR_DEACTIVATION_THRESHOLD_MS,
  BOUNDS_RECALC_INTERVAL_MS,
  INPUT_FOCUS_ACTIVATION_DELAY_MS,
  DEFAULT_KEY_HOLD_DURATION_MS,
  DOUBLE_CLICK_THRESHOLD_MS,
} from "./constants.js";
import { isCLikeKey } from "./utils/is-c-like-key.js";
import { keyMatchesCode } from "./utils/key-matches-code.js";
import { isTargetKeyCombination } from "./utils/is-target-key-combination.js";
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
  SelectionLabelInstance,
  AgentSession,
  AgentOptions,
  UpdatableOptions,
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
        fetch(
          `https://www.react-grab.com/api/version?source=browser&t=${Date.now()}`,
          {
            referrerPolicy: "origin",
            keepalive: true,
            priority: "low",
            cache: "no-store",
          } as RequestInit,
        )
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

    const [, , actorRef] = useMachine(stateMachine, {
      input: {
        theme: mergedTheme,
        hasAgentProvider: Boolean(options.agent?.provider),
        keyHoldDuration:
          options.keyHoldDuration ?? DEFAULT_KEY_HOLD_DURATION_MS,
      },
    });

    // Create reactive signal for snapshot - direct subscription guarantees reactivity
    const [snapshot, setSnapshot] = createSignal(actorRef.getSnapshot());
    createEffect(() => {
      const subscription = actorRef.subscribe((nextSnapshot) => {
        setSnapshot(nextSnapshot);
      });
      onCleanup(() => subscription.unsubscribe());
    });

    // Use actorRef.send directly instead of destructured send
    const send = actorRef.send.bind(actorRef);

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

    let wasHolding = false;
    createEffect(() => {
      const currentlyHolding = isHoldingKeys();
      const currentlyActive = isActivated();

      if (wasHolding && !currentlyHolding && currentlyActive) {
        if (options.activationMode !== "hold") {
          send({ type: "SET_TOGGLE_MODE", value: true });
        }
        options.onActivate?.();
      }
      wasHolding = currentlyHolding;
    });

    const elementInputCache = new WeakMap<Element, string>();

    const hasNativeSelection = createMemo(
      () => snapshot().context.nativeSelectionElements.length > 0,
    );

    const nativeSelectionTagName = createMemo(() => {
      const elements = snapshot().context.nativeSelectionElements;
      if (elements.length === 0 || !elements[0]) return undefined;
      return getTagName(elements[0]) || undefined;
    });

    const [nativeSelectionComponentName] = createResource(
      () => {
        const elements = snapshot().context.nativeSelectionElements;
        if (elements.length === 0 || !elements[0]) return null;
        return elements[0];
      },
      async (element) => {
        if (!element) return undefined;
        return (await getNearestComponentName(element)) || undefined;
      },
    );

    const clearNativeSelectionState = () => {
      send({ type: "CLEAR_NATIVE_SELECTION" });
    };

    const activateInputMode = () => {
      const element = snapshot().context.frozenElement || targetElement();
      if (element) {
        send({
          type: "INPUT_MODE_ENTER",
          position: {
            x: snapshot().context.mousePosition.x,
            y: snapshot().context.mousePosition.y,
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

      const isBackward = isSelectionBackward(currentSelection);

      const cursorRect = isBackward
        ? clientRects[0]
        : clientRects[clientRects.length - 1];
      const cursorX = isBackward ? cursorRect.left : cursorRect.right;
      const cursorY = cursorRect.top + cursorRect.height / 2;

      const container = range.commonAncestorContainer;
      const element =
        container.nodeType === Node.ELEMENT_NODE
          ? (container as Element)
          : container.parentElement;

      if (element && isValidGrabbableElement(element)) {
        send({
          type: "TEXT_SELECTED",
          elements: [element],
          cursor: { x: cursorX, y: cursorY },
        });
      }
    };

    createEffect(
      on(
        () => snapshot().context.viewportVersion,
        () => {
          if (hasNativeSelection()) {
            recalculateNativeSelectionCursor();
          }
        },
      ),
    );

    const nativeSelectionBounds = createMemo((): OverlayBounds | undefined => {
      void snapshot().context.viewportVersion;
      const elements = snapshot().context.nativeSelectionElements;
      if (elements.length === 0 || !elements[0]) return undefined;
      return createElementBounds(elements[0]);
    });

    let lastElementDetectionTime = 0;
    let progressAnimationId: number | null = null;
    let keydownSpamTimerId: number | null = null;
    let autoScrollAnimationId: number | null = null;
    let pendingClickTimeoutId: number | null = null;
    let pendingClickData: {
      clientX: number;
      clientY: number;
      element: Element;
    } | null = null;

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
        send({ type: "COPY_DONE", element });
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

        if (snapshot().context.isToggleMode || shouldDeactivateAfter) {
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

    const targetElement = createMemo(() => {
      if (!isRendererActive() || isDragging()) return null;
      const element = snapshot().context.detectedElement;
      if (element && !document.contains(element)) return null;
      return element;
    });

    const effectiveElement = createMemo(() => {
      if (isToggleFrozen()) {
        return snapshot().context.frozenElement;
      }
      return targetElement();
    });

    createEffect(() => {
      const element = snapshot().context.detectedElement;
      if (!element) return;

      const intervalId = setInterval(() => {
        if (!document.contains(element)) {
          send({ type: "ELEMENT_DETECTED", element: null });
        }
      }, 100);

      onCleanup(() => clearInterval(intervalId));
    });

    const selectionBounds = createMemo((): OverlayBounds | undefined => {
      void snapshot().context.viewportVersion;
      const element = effectiveElement();
      if (!element) return undefined;
      return createElementBounds(element);
    });

    const calculateDragDistance = (endX: number, endY: number) => {
      const endPageX = endX + window.scrollX;
      const endPageY = endY + window.scrollY;

      return {
        x: Math.abs(endPageX - snapshot().context.dragStart.x),
        y: Math.abs(endPageY - snapshot().context.dragStart.y),
      };
    };

    const isDraggingBeyondThreshold = createMemo(() => {
      if (!isDragging()) return false;

      const dragDistance = calculateDragDistance(
        snapshot().context.mousePosition.x,
        snapshot().context.mousePosition.y,
      );

      return (
        dragDistance.x > DRAG_THRESHOLD_PX || dragDistance.y > DRAG_THRESHOLD_PX
      );
    });

    const calculateDragRectangle = (endX: number, endY: number) => {
      const endPageX = endX + window.scrollX;
      const endPageY = endY + window.scrollY;

      const dragPageX = Math.min(snapshot().context.dragStart.x, endPageX);
      const dragPageY = Math.min(snapshot().context.dragStart.y, endPageY);
      const dragWidth = Math.abs(endPageX - snapshot().context.dragStart.x);
      const dragHeight = Math.abs(endPageY - snapshot().context.dragStart.y);

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
        snapshot().context.mousePosition.x,
        snapshot().context.mousePosition.y,
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
        void snapshot().context.viewportVersion;
        const element = snapshot().context.frozenElement || targetElement();
        if (element) {
          const bounds = createElementBounds(element);
          const selectionCenterX = bounds.x + bounds.width / 2;
          return {
            x: selectionCenterX + snapshot().context.copyOffsetFromCenterX,
            y: snapshot().context.copyStart.y,
          };
        }
        return {
          x: snapshot().context.copyStart.x,
          y: snapshot().context.copyStart.y,
        };
      }
      return {
        x: snapshot().context.mousePosition.x,
        y: snapshot().context.mousePosition.y,
      };
    });

    createEffect(
      on(
        () => [targetElement(), snapshot().context.lastGrabbedElement] as const,
        ([currentElement, lastElement]) => {
          if (lastElement && currentElement && lastElement !== currentElement) {
            send({
              type: "SET_LAST_GRABBED",
              element: null as unknown as Element,
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
        () => snapshot().context.viewportVersion,
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
            snapshot().context.mousePosition.x,
            snapshot().context.mousePosition.y,
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
            snapshot().context.mousePosition.x,
            snapshot().context.mousePosition.y,
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

    const startProgressAnimation = () => {
      const animateProgress = () => {
        if (isCopying()) {
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
    };

    const startAutoScroll = () => {
      const scroll = () => {
        if (!isDragging()) {
          stopAutoScroll();
          return;
        }

        const direction = getAutoScrollDirection(
          snapshot().context.mousePosition.x,
          snapshot().context.mousePosition.y,
        );

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
      send({ type: "ACTIVATE" });
      options.onActivate?.();
    };

    const deactivateRenderer = () => {
      send({ type: "DEACTIVATE" });
      if (isDragging()) {
        document.body.style.userSelect = "";
      }
      if (keydownSpamTimerId) window.clearTimeout(keydownSpamTimerId);
      if (pendingClickTimeoutId) {
        window.clearTimeout(pendingClickTimeoutId);
        pendingClickTimeoutId = null;

        const clickData = pendingClickData;
        pendingClickData = null;

        if (clickData) {
          send({ type: "SET_LAST_GRABBED", element: clickData.element });
          const bounds = createElementBounds(clickData.element);
          const tagName = getTagName(clickData.element);
          void getNearestComponentName(clickData.element).then(
            (componentName) => {
              void executeCopyOperation(
                clickData.clientX,
                clickData.clientY,
                () => copyElementsToClipboard([clickData.element]),
                bounds,
                tagName,
                componentName ?? undefined,
                clickData.element,
              );
            },
          );
        }
      }
      stopAutoScroll();
      stopProgressAnimation();
      const previousFocused = snapshot().context.previouslyFocusedElement;
      if (
        previousFocused instanceof HTMLElement &&
        document.contains(previousFocused)
      ) {
        previousFocused.focus();
      }
      options.onDeactivate?.();
    };

    const restoreInputFromSession = (
      session: AgentSession,
      element: Element | undefined,
    ) => {
      if (element && document.contains(element)) {
        const rect = element.getBoundingClientRect();
        const centerY = rect.top + rect.height / 2;

        send({
          type: "MOUSE_MOVE",
          position: { x: session.position.x, y: centerY },
        });
        send({ type: "FREEZE_ELEMENT", element });
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
          onAbort: (session: AgentSession, element: Element | undefined) => {
            options.agent?.onAbort?.(session, element);
            restoreInputFromSession(session, element);
          },
          onUndo: (session: AgentSession, element: Element | undefined) => {
            options.agent?.onUndo?.(session, element);
            restoreInputFromSession(session, element);
          },
        }
      : undefined;

    const agentManager = createAgentManager(agentOptions);

    const handleInputChange = (value: string) => {
      send({ type: "INPUT_CHANGE", value });
    };

    const handleInputSubmit = () => {
      send({ type: "SET_LAST_COPIED", element: null });
      const element = snapshot().context.frozenElement || targetElement();
      const prompt = isInputMode() ? snapshot().context.inputText.trim() : "";

      if (!element) {
        deactivateRenderer();
        return;
      }

      const bounds = createElementBounds(element);
      const labelPositionX = snapshot().context.mousePosition.x;
      const currentX = bounds.x + bounds.width / 2;
      const currentY = bounds.y + bounds.height / 2;

      if (snapshot().context.hasAgentProvider && prompt) {
        elementInputCache.delete(element);
        deactivateRenderer();

        const currentReplySessionId = snapshot().context.replySessionId;
        send({ type: "SET_REPLY_SESSION", sessionId: null });

        void agentManager.session.start({
          element,
          prompt,
          position: { x: labelPositionX, y: currentY },
          selectionBounds: bounds,
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

      const tagName = getTagName(element);
      void getNearestComponentName(element).then((componentName) => {
        void executeCopyOperation(
          currentX,
          currentY,
          () => copyElementsToClipboard([element], prompt || undefined),
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
      send({ type: "SET_LAST_COPIED", element: null });
      if (!isInputMode()) return;

      const currentInput = snapshot().context.inputText.trim();
      if (currentInput && !isPendingDismiss()) {
        send({ type: "ESC" });
        return;
      }

      const element = snapshot().context.frozenElement || targetElement();
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
      if (!snapshot().context.hasAgentProvider) return;
      const element = snapshot().context.frozenElement || targetElement();
      if (element) {
        setCopyStartPosition(
          element,
          snapshot().context.mousePosition.x,
          snapshot().context.mousePosition.y,
        );

        const cachedInput = elementInputCache.get(element);
        if (cachedInput) {
          send({ type: "INPUT_CHANGE", value: cachedInput });
        }
      }
      activateInputMode();
    };

    const handleNativeSelectionCopy = async () => {
      const elements = snapshot().context.nativeSelectionElements;
      if (elements.length === 0) return;

      const currentX = snapshot().context.nativeSelectionCursor.x;
      const currentY = snapshot().context.nativeSelectionCursor.y;
      const bounds = nativeSelectionBounds();
      const tagName = nativeSelectionTagName();

      clearNativeSelectionState();
      window.getSelection()?.removeAllRanges();

      const componentName = nativeSelectionComponentName();

      await executeCopyOperation(
        currentX,
        currentY,
        () => copyElementsToClipboard(elements),
        bounds,
        tagName,
        componentName,
      );
    };

    const handleNativeSelectionEnter = () => {
      if (!snapshot().context.hasAgentProvider) return;
      const elements = snapshot().context.nativeSelectionElements;
      if (elements.length === 0) return;

      const bounds = nativeSelectionBounds();
      const currentX = bounds
        ? bounds.x + bounds.width / 2
        : snapshot().context.nativeSelectionCursor.x;
      const currentY = bounds
        ? bounds.y + bounds.height / 2
        : snapshot().context.nativeSelectionCursor.y;

      clearNativeSelectionState();
      window.getSelection()?.removeAllRanges();

      send({ type: "MOUSE_MOVE", position: { x: currentX, y: currentY } });
      activateInputMode();
      activateRenderer();
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

        if (isNearEdge && autoScrollAnimationId === null) {
          startAutoScroll();
        } else if (!isNearEdge && autoScrollAnimationId !== null) {
          stopAutoScroll();
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

    const handlePointerUp = (clientX: number, clientY: number) => {
      if (!isDragging()) return;

      const dragDistance = calculateDragDistance(clientX, clientY);

      const wasDragGesture =
        dragDistance.x > DRAG_THRESHOLD_PX ||
        dragDistance.y > DRAG_THRESHOLD_PX;

      send({ type: "DRAG_END", position: { x: clientX, y: clientY } });
      stopAutoScroll();
      document.body.style.userSelect = "";

      if (wasDragGesture) {
        const dragRect = calculateDragRectangle(clientX, clientY);

        const elements = getElementsInDrag(dragRect, isValidGrabbableElement);
        const selectedElements =
          elements.length > 0
            ? elements
            : getElementsInDrag(dragRect, isValidGrabbableElement, false);

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
          const tagName = getTagName(firstElement);

          const centerX = bounds.x + bounds.width / 2;
          const centerY = bounds.y + bounds.height / 2;

          if (snapshot().context.hasAgentProvider) {
            send({ type: "MOUSE_MOVE", position: { x: centerX, y: centerY } });
            send({ type: "FREEZE_ELEMENT", element: firstElement });
            activateInputMode();
            if (!isActivated()) {
              activateRenderer();
            }
          } else {
            void getNearestComponentName(firstElement).then((componentName) => {
              void executeCopyOperation(
                centerX,
                centerY,
                () => copyElementsToClipboard(selectedElements),
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

        if (snapshot().context.hasAgentProvider) {
          if (pendingClickTimeoutId !== null) {
            window.clearTimeout(pendingClickTimeoutId);
            pendingClickTimeoutId = null;

            const clickElement = pendingClickData?.element ?? element;
            pendingClickData = null;

            setCopyStartPosition(clickElement, clientX, clientY);

            const cachedInput = elementInputCache.get(clickElement);
            if (cachedInput) {
              send({ type: "INPUT_CHANGE", value: cachedInput });
            }

            send({ type: "MOUSE_MOVE", position: { x: clientX, y: clientY } });
            send({ type: "FREEZE_ELEMENT", element: clickElement });
            activateInputMode();
            return;
          }

          pendingClickData = { clientX, clientY, element };
          pendingClickTimeoutId = window.setTimeout(() => {
            pendingClickTimeoutId = null;
            const clickData = pendingClickData;
            pendingClickData = null;

            if (!clickData) return;

            send({ type: "SET_LAST_GRABBED", element: clickData.element });
            const bounds = createElementBounds(clickData.element);
            const tagName = getTagName(clickData.element);
            void getNearestComponentName(clickData.element).then(
              (componentName) => {
                void executeCopyOperation(
                  clickData.clientX,
                  clickData.clientY,
                  () => copyElementsToClipboard([clickData.element]),
                  bounds,
                  tagName,
                  componentName ?? undefined,
                  clickData.element,
                );
              },
            );
          }, DOUBLE_CLICK_THRESHOLD_MS);
        } else {
          send({ type: "SET_LAST_GRABBED", element });
          const bounds = createElementBounds(element);
          const tagName = getTagName(element);
          void getNearestComponentName(element).then((componentName) => {
            void executeCopyOperation(
              clientX,
              clientY,
              () => copyElementsToClipboard([element]),
              bounds,
              tagName,
              componentName ?? undefined,
              element,
            );
          });
        }
      }
    };

    const eventListenerManager = createEventListenerManager();

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
      let originalKey: string;
      try {
        originalKey = originalKeyDescriptor?.get
          ? originalKeyDescriptor.get.call(event)
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
        !snapshot().context.isToggleMode;

      if (shouldBlockEnter) {
        claimedEvents.add(event);
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

    eventListenerManager.addWindowListener(
      "keydown",
      (event: KeyboardEvent) => {
        blockEnterIfNeeded(event);

        const isUndoOrRedo =
          event.code === "KeyZ" && (event.metaKey || event.ctrlKey);

        if (isUndoOrRedo) {
          const hasActiveConfirmation = Array.from(
            agentManager.sessions().values(),
          ).some((session) => !session.isStreaming && !session.error);

          if (!hasActiveConfirmation) {
            const isRedo = event.shiftKey;

            if (isRedo && agentManager.canRedo()) {
              event.preventDefault();
              event.stopPropagation();
              agentManager.history.redo();
              return;
            } else if (!isRedo && agentManager.canUndo()) {
              event.preventDefault();
              event.stopPropagation();
              agentManager.history.undo();
              return;
            }
          }
        }

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
            } else if (snapshot().context.isToggleMode && !isInputMode()) {
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

          if (isHoldingKeys() || snapshot().context.isToggleMode) {
            deactivateRenderer();
            return;
          }
        }

        if (isHoldingKeys() && !isInputMode()) {
          const currentElement =
            snapshot().context.frozenElement || targetElement();
          if (!currentElement) return;

          let nextElement: Element | null = null;

          switch (event.key) {
            case "ArrowUp":
            case "ArrowDown": {
              const bounds = createElementBounds(currentElement);
              const elementsAtPoint = document
                .elementsFromPoint(
                  bounds.x + bounds.width / 2,
                  bounds.y + bounds.height / 2,
                )
                .filter(isValidGrabbableElement);
              const currentIndex = elementsAtPoint.indexOf(currentElement);
              if (currentIndex !== -1) {
                const direction = event.key === "ArrowUp" ? 1 : -1;
                nextElement = elementsAtPoint[currentIndex + direction] ?? null;
              }
              break;
            }
            case "ArrowRight":
            case "ArrowLeft": {
              const isForward = event.key === "ArrowRight";

              const findEdgeDescendant = (el: Element): Element | null => {
                const children = Array.from(el.children);
                const ordered = isForward ? children : children.reverse();
                for (const child of ordered) {
                  if (isForward) {
                    if (isValidGrabbableElement(child)) return child;
                    const descendant = findEdgeDescendant(child);
                    if (descendant) return descendant;
                  } else {
                    const descendant = findEdgeDescendant(child);
                    if (descendant) return descendant;
                    if (isValidGrabbableElement(child)) return child;
                  }
                }
                return null;
              };

              const getSibling = (el: Element) =>
                isForward ? el.nextElementSibling : el.previousElementSibling;

              if (isForward) {
                nextElement = findEdgeDescendant(currentElement);
              }

              if (!nextElement) {
                let searchElement: Element | null = currentElement;
                while (searchElement) {
                  let sibling = getSibling(searchElement);
                  while (sibling) {
                    const descendant = findEdgeDescendant(sibling);
                    if (descendant) {
                      nextElement = descendant;
                      break;
                    }
                    if (isValidGrabbableElement(sibling)) {
                      nextElement = sibling;
                      break;
                    }
                    sibling = getSibling(sibling);
                  }
                  if (nextElement) break;
                  const parentElement: HTMLElement | null =
                    searchElement.parentElement;
                  if (
                    !isForward &&
                    parentElement &&
                    isValidGrabbableElement(parentElement)
                  ) {
                    nextElement = parentElement;
                    break;
                  }
                  searchElement = parentElement;
                }
              }
              break;
            }
            default:
              break;
          }

          if (nextElement) {
            event.preventDefault();
            event.stopPropagation();
            send({ type: "FREEZE_ELEMENT", element: nextElement });
            send({ type: "FREEZE" });
            const bounds = createElementBounds(nextElement);
            send({
              type: "MOUSE_MOVE",
              position: {
                x: bounds.x + bounds.width / 2,
                y: bounds.y + bounds.height / 2,
              },
            });
            return;
          }
        }

        const copiedElement = snapshot().context.lastCopiedElement;
        if (
          isEnterCode(event.code) &&
          !isHoldingKeys() &&
          !isInputMode() &&
          !isActivated() &&
          copiedElement &&
          document.contains(copiedElement) &&
          snapshot().context.hasAgentProvider &&
          !snapshot().context.labelInstances.some(
            (instance) =>
              instance.status === "copied" || instance.status === "fading",
          )
        ) {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();

          const bounds = createElementBounds(copiedElement);
          const selectionCenterX = bounds.x + bounds.width / 2;
          const centerY = bounds.y + bounds.height / 2;

          send({
            type: "MOUSE_MOVE",
            position: { x: selectionCenterX, y: centerY },
          });
          setCopyStartPosition(copiedElement, selectionCenterX, centerY);
          send({ type: "FREEZE_ELEMENT", element: copiedElement });
          send({ type: "SET_LAST_COPIED", element: null });

          const cachedInput = elementInputCache.get(copiedElement);
          if (cachedInput) {
            send({ type: "INPUT_CHANGE", value: cachedInput });
          }

          activateInputMode();
          activateRenderer();
          return;
        }

        if (
          isEnterCode(event.code) &&
          isHoldingKeys() &&
          !isInputMode() &&
          snapshot().context.hasAgentProvider
        ) {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();

          const element = snapshot().context.frozenElement || targetElement();
          if (element) {
            setCopyStartPosition(
              element,
              snapshot().context.mousePosition.x,
              snapshot().context.mousePosition.y,
            );

            const cachedInput = elementInputCache.get(element);
            if (cachedInput) {
              send({ type: "INPUT_CHANGE", value: cachedInput });
            }
          }

          activateInputMode();

          if (keydownSpamTimerId !== null) {
            window.clearTimeout(keydownSpamTimerId);
            keydownSpamTimerId = null;
          }

          if (!isActivated()) {
            activateRenderer();
          }

          return;
        }

        if (event.key?.toLowerCase() === "o" && !isInputMode()) {
          if (isActivated() && (event.metaKey || event.ctrlKey)) {
            const filePath = snapshot().context.selectionFilePath;
            const lineNumber = snapshot().context.selectionLineNumber;
            if (filePath) {
              event.preventDefault();
              event.stopPropagation();

              if (options.onOpenFile) {
                options.onOpenFile(filePath, lineNumber ?? undefined);
              } else {
                const url = buildOpenFileUrl(filePath, lineNumber ?? undefined);
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
            !snapshot().context.isToggleMode &&
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
            snapshot().context.isToggleMode &&
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

        const getRequiredModifiers = () => {
          if (options.activationKey) {
            const { metaKey, ctrlKey, shiftKey, altKey } =
              options.activationKey;
            return {
              metaKey: Boolean(metaKey),
              ctrlKey: Boolean(ctrlKey),
              shiftKey: Boolean(shiftKey),
              altKey: Boolean(altKey),
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
              ? event.key?.toLowerCase() ===
                  options.activationKey.key.toLowerCase() ||
                keyMatchesCode(options.activationKey.key, event.code)
              : false
            : isCLikeKey(event.key, event.code);

        if (isActivated()) {
          if (isReleasingModifier) {
            if (
              snapshot().context.isToggleMode &&
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
            snapshot().context.isToggleMode &&
            options.activationMode !== "hold"
          )
            return;
          deactivateRenderer();
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
      if (isHoldingKeys() && !isInputMode() && isToggleFrozen()) {
        send({ type: "UNFREEZE" });
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
        if (isEventFromOverlay(event, "data-react-grab-ignore-events")) return;
        if (!snapshot().context.hasAgentProvider) return;

        const element = getElementAtPosition(event.clientX, event.clientY);
        if (!element) return;

        event.preventDefault();
        event.stopPropagation();

        if (pendingClickTimeoutId !== null) {
          window.clearTimeout(pendingClickTimeoutId);
          pendingClickTimeoutId = null;
          pendingClickData = null;
        }

        setCopyStartPosition(element, event.clientX, event.clientY);

        const cachedInput = elementInputCache.get(element);
        if (cachedInput) {
          send({ type: "INPUT_CHANGE", value: cachedInput });
        }

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
            snapshot().context.isToggleMode &&
            !isCopying() &&
            !isInputMode()
          ) {
            // Don't deactivate if waiting for potential double-click
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
          snapshot().context.activationTimestamp;
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

    eventListenerManager.addWindowListener("popstate", () => {
      clearNativeSelectionState();
    });

    let boundsRecalcIntervalId: number | null = null;

    const startBoundsRecalcIntervalIfNeeded = () => {
      const shouldRunInterval =
        theme().enabled &&
        (hasNativeSelection() ||
          isActivated() ||
          isCopying() ||
          snapshot().context.labelInstances.length > 0 ||
          snapshot().context.grabbedBoxes.length > 0 ||
          agentManager.sessions().size > 0);

      if (shouldRunInterval && boundsRecalcIntervalId === null) {
        boundsRecalcIntervalId = window.setInterval(() => {
          send({ type: "VIEWPORT_CHANGE" });

          if (hasNativeSelection()) {
            const elements = snapshot().context.nativeSelectionElements;
            const isElementInDOM =
              elements.length > 0 &&
              elements[0] &&
              document.body.contains(elements[0]);
            if (!isElementInDOM) {
              clearNativeSelectionState();
            }
          }
        }, BOUNDS_RECALC_INTERVAL_MS);
      } else if (!shouldRunInterval && boundsRecalcIntervalId !== null) {
        window.clearInterval(boundsRecalcIntervalId);
        boundsRecalcIntervalId = null;
      }
    };

    createEffect(() => {
      void theme().enabled;
      void hasNativeSelection();
      void isActivated();
      void isCopying();
      void snapshot().context.labelInstances.length;
      void snapshot().context.grabbedBoxes.length;
      void agentManager.sessions().size;
      startBoundsRecalcIntervalIfNeeded();
    });

    onCleanup(() => {
      if (boundsRecalcIntervalId !== null) {
        window.clearInterval(boundsRecalcIntervalId);
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

    let selectionDebounceTimerId: number | null = null;

    eventListenerManager.addDocumentListener("selectionchange", () => {
      if (isRendererActive()) return;

      if (selectionDebounceTimerId !== null) {
        window.clearTimeout(selectionDebounceTimerId);
      }

      clearNativeSelectionState();

      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
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
          return;
        }

        const selectedText = currentSelection.toString().trim();
        if (!selectedText) {
          return;
        }

        const isBackward = isSelectionBackward(currentSelection);

        const clientRects = range.getClientRects();
        if (clientRects.length === 0) {
          return;
        }

        const cursorRect = isBackward
          ? clientRects[0]
          : clientRects[clientRects.length - 1];
        const cursorX = isBackward ? cursorRect.left : cursorRect.right;
        const cursorY = cursorRect.top + cursorRect.height / 2;

        if (isSelectionInsideEditableElement(cursorX, cursorY)) {
          return;
        }

        const container = range.commonAncestorContainer;
        const element =
          container.nodeType === Node.ELEMENT_NODE
            ? (container as Element)
            : container.parentElement;

        if (element && isValidGrabbableElement(element)) {
          send({
            type: "TEXT_SELECTED",
            elements: [element],
            cursor: { x: cursorX, y: cursorY },
          });
        }
      }, 150);
    });

    onCleanup(() => {
      eventListenerManager.abort();
      if (keydownSpamTimerId) window.clearTimeout(keydownSpamTimerId);
      if (pendingClickTimeoutId) window.clearTimeout(pendingClickTimeoutId);
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
      void snapshot().context.viewportVersion;
      return snapshot().context.labelInstances.map((instance) => {
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
      void snapshot().context.viewportVersion;
      return snapshot().context.grabbedBoxes.map((box) => {
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
        !snapshot().context.isTouchMode &&
        !isToggleFrozen(),
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
            selectionFilePath={
              snapshot().context.selectionFilePath ?? undefined
            }
            selectionLineNumber={
              snapshot().context.selectionLineNumber ?? undefined
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
            inputValue={snapshot().context.inputText}
            isInputMode={isInputMode()}
            hasAgent={snapshot().context.hasAgentProvider}
            isAgentConnected={snapshot().context.isAgentConnected}
            agentSessions={agentManager.sessions()}
            supportsUndo={snapshot().context.supportsUndo}
            supportsFollowUp={snapshot().context.supportsFollowUp}
            dismissButtonText={snapshot().context.dismissButtonText}
            onAbortSession={(sessionId) =>
              agentManager.session.abort(sessionId)
            }
            onDismissSession={(sessionId) =>
              agentManager.session.dismiss(sessionId)
            }
            onUndoSession={(sessionId) => agentManager.session.undo(sessionId)}
            onFollowUpSubmitSession={(sessionId, prompt) => {
              const session = agentManager.sessions().get(sessionId);
              const element = agentManager.session.getElement(sessionId);
              const sessionBounds = session?.selectionBounds;
              if (session && element && sessionBounds) {
                const positionX = session.position.x;
                const followUpSessionId =
                  session.context.sessionId ?? sessionId;

                agentManager.session.dismiss(sessionId);

                void agentManager.session.start({
                  element,
                  prompt,
                  position: {
                    x: positionX,
                    y: sessionBounds.y + sessionBounds.height / 2,
                  },
                  selectionBounds: sessionBounds,
                  sessionId: followUpSessionId,
                });
              }
            }}
            onAcknowledgeSessionError={(sessionId: string) => {
              const prompt = agentManager.session.acknowledgeError(sessionId);
              if (prompt) {
                send({ type: "INPUT_CHANGE", value: prompt });
              }
            }}
            onRetrySession={(sessionId: string) => {
              agentManager.session.retry(sessionId);
            }}
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
            nativeSelectionCursorVisible={hasNativeSelection()}
            nativeSelectionCursorX={snapshot().context.nativeSelectionCursor.x}
            nativeSelectionCursorY={snapshot().context.nativeSelectionCursor.y}
            nativeSelectionTagName={nativeSelectionTagName()}
            nativeSelectionComponentName={nativeSelectionComponentName()}
            nativeSelectionBounds={nativeSelectionBounds()}
            onNativeSelectionCopy={() => void handleNativeSelectionCopy()}
            onNativeSelectionEnter={handleNativeSelectionEnter}
            theme={theme()}
            dockVisible={theme().dock.enabled}
            isActive={isActivated()}
            onToggleActive={() => {
              if (isActivated()) {
                deactivateRenderer();
              } else {
                send({ type: "SET_TOGGLE_MODE", value: true });
                activateRenderer();
              }
            }}
          />
        ),
        rendererRoot,
      );
    }

    if (snapshot().context.hasAgentProvider) {
      agentManager.session.tryResume();
    }

    const copyElementAPI = async (
      elements: Element | Element[],
    ): Promise<boolean> => {
      const elementsArray = Array.isArray(elements) ? elements : [elements];
      if (elementsArray.length === 0) return false;
      return await copyWithFallback(elementsArray);
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
          send({ type: "SET_TOGGLE_MODE", value: true });
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
          send({ type: "SET_TOGGLE_MODE", value: true });
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
          onAbort: (session: AgentSession, element: Element | undefined) => {
            newAgentOptions?.onAbort?.(session, element);
            restoreInputFromSession(session, element);
          },
          onUndo: (session: AgentSession, element: Element | undefined) => {
            newAgentOptions?.onUndo?.(session, element);
            restoreInputFromSession(session, element);
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
} from "./types.js";

export { generateSnippet } from "./utils/generate-snippet.js";
export { copyContent } from "./utils/copy-content.js";
