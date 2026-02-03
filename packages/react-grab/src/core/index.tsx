// @ts-expect-error - CSS imported as text via tsup loader
import cssText from "../../dist/styles.css";
import {
  createMemo,
  createRoot,
  createSignal,
  onCleanup,
  createEffect,
  createResource,
  on,
} from "solid-js";
import { render } from "solid-js/web";
import { createGrabStore } from "./store.js";
import {
  isKeyboardEventTriggeredByInput,
  hasTextSelectionInInput,
  hasTextSelectionOnPage,
} from "../utils/is-keyboard-event-triggered-by-input.js";
import { mountRoot } from "../utils/mount-root.js";
import { ReactGrabRenderer } from "../components/renderer.js";
import {
  getStack,
  getNearestComponentName,
  checkIsSourceComponentName,
  getComponentDisplayName,
} from "./context.js";
import { isSourceFile, normalizeFileName } from "bippy/source";
import { createNoopApi } from "./noop-api.js";
import { createEventListenerManager } from "./events.js";
import { tryCopyWithFallback } from "./copy.js";
import {
  getElementAtPosition,
  clearElementPositionCache,
} from "../utils/get-element-at-position.js";
import {
  isValidGrabbableElement,
  clearVisibilityCache,
} from "../utils/is-valid-grabbable-element.js";
import { isRootElement } from "../utils/is-root-element.js";
import { getElementsInDrag } from "../utils/get-elements-in-drag.js";
import {
  createElementBounds,
  invalidateBoundsCache,
} from "../utils/create-element-bounds.js";
import {
  createBoundsFromDragRect,
  createFlatOverlayBounds,
  createPageRectFromBounds,
} from "../utils/create-bounds-from-drag-rect.js";
import { getTagName } from "../utils/get-tag-name.js";
import {
  ARROW_KEYS,
  FEEDBACK_DURATION_MS,
  FADE_COMPLETE_BUFFER_MS,
  KEYDOWN_SPAM_TIMEOUT_MS,
  DRAG_THRESHOLD_PX,
  ELEMENT_DETECTION_THROTTLE_MS,
  COMPONENT_NAME_DEBOUNCE_MS,
  DRAG_PREVIEW_DEBOUNCE_MS,
  Z_INDEX_LABEL,
  MODIFIER_KEYS,
  BLUR_DEACTIVATION_THRESHOLD_MS,
  BOUNDS_RECALC_INTERVAL_MS,
  INPUT_FOCUS_ACTIVATION_DELAY_MS,
  INPUT_TEXT_SELECTION_ACTIVATION_DELAY_MS,
  DEFAULT_KEY_HOLD_DURATION_MS,
  MIN_HOLD_FOR_ACTIVATION_AFTER_COPY_MS,
  SCREENSHOT_CAPTURE_DELAY_MS,
  ZOOM_DETECTION_THRESHOLD,
  ACTION_CYCLE_IDLE_TRIGGER_MS,
  ACTION_CYCLE_INPUT_THROTTLE_MS,
} from "../constants.js";
import { getBoundsCenter } from "../utils/get-bounds-center.js";
import { isCLikeKey } from "../utils/is-c-like-key.js";
import { isTargetKeyCombination } from "../utils/is-target-key-combination.js";
import { parseActivationKey } from "../utils/parse-activation-key.js";
import { isEventFromOverlay } from "../utils/is-event-from-overlay.js";
import { buildOpenFileUrl } from "../utils/build-open-file-url.js";
import {
  captureElementScreenshot,
  copyImageToClipboard,
  combineBounds,
} from "../utils/capture-screenshot.js";
import { isScreenshotSupported } from "../utils/is-screenshot-supported.js";
import { delay } from "../utils/delay.js";
import { resolveActionEnabled } from "../utils/resolve-action-enabled.js";
import type {
  Options,
  OverlayBounds,
  GrabbedBox,
  ReactGrabAPI,
  ReactGrabState,
  SelectionLabelInstance,
  AgentSession,
  AgentOptions,
  ContextMenuActionContext,
  ContextMenuAction,
  ActionCycleItem,
  ActionCycleState,
  SettableOptions,
  SourceInfo,
  Plugin,
  ToolbarState,
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
import { isMac } from "../utils/is-mac.js";
import {
  loadToolbarState,
  saveToolbarState,
} from "../components/toolbar/state.js";
import { copyPlugin } from "./plugins/copy.js";
import { screenshotPlugin } from "./plugins/screenshot.js";
import { copyHtmlPlugin } from "./plugins/copy-html.js";
import { openPlugin } from "./plugins/open.js";
import { commentPlugin } from "./plugins/comment.js";
import {
  freezeAnimations,
  freezeAllAnimations,
  freezeGlobalAnimations,
  unfreezeGlobalAnimations,
} from "../utils/freeze-animations.js";
import {
  freezePseudoStates,
  unfreezePseudoStates,
} from "../utils/freeze-pseudo-states.js";
import { freezeUpdates } from "../utils/freeze-updates.js";

const builtInPlugins = [
  copyPlugin,
  commentPlugin,
  screenshotPlugin,
  copyHtmlPlugin,
  openPlugin,
];

interface PerformWithFeedbackOptions {
  fallbackBounds?: OverlayBounds;
  fallbackSelectionBounds?: OverlayBounds[];
  position?: { x: number; y: number };
}

let hasInited = false;
const toolbarStateChangeCallbacks = new Set<(state: ToolbarState) => void>();

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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- need to omit enabled from settableOptions to avoid circular dependency
  const { enabled: _enabled, ...settableOptions } = initialOptions;

  return createRoot((dispose) => {
    const pluginRegistry = createPluginRegistry(settableOptions);

    const getAgentFromActions = () => {
      for (const action of pluginRegistry.store.actions) {
        if (action.agent?.provider) {
          return action.agent;
        }
      }
      return undefined;
    };

    const { store, actions } = createGrabStore({
      theme: DEFAULT_THEME,
      hasAgentProvider: Boolean(getAgentFromActions()?.provider),
      keyHoldDuration:
        pluginRegistry.store.options.keyHoldDuration ??
        DEFAULT_KEY_HOLD_DURATION_MS,
    });

    const isHoldingKeys = createMemo(() => store.current.state === "holding");

    const isActivated = createMemo(() => store.current.state === "active");

    createEffect(
      on(isActivated, (activated, previousActivated) => {
        if (activated && !previousActivated) {
          freezePseudoStates();
          freezeGlobalAnimations();
          // HACK: Prevent browser from taking over touch gestures
          document.body.style.touchAction = "none";
        } else if (!activated && previousActivated) {
          unfreezePseudoStates();
          unfreezeGlobalAnimations();
          document.body.style.touchAction = "";
        }
      }),
    );

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

    const isCommentMode = createMemo(
      () => store.pendingCommentMode || isPromptMode(),
    );

    const isPendingDismiss = createMemo(
      () =>
        store.current.state === "active" &&
        store.current.isPromptMode &&
        store.current.isPendingDismiss,
    );

    const savedToolbarState = loadToolbarState();
    const [isEnabled, setIsEnabled] = createSignal(
      savedToolbarState?.enabled ?? true,
    );
    const [toolbarShakeCount, setToolbarShakeCount] = createSignal(0);
    const [currentToolbarState, setCurrentToolbarState] =
      createSignal<ToolbarState | null>(savedToolbarState);
    const [isToolbarSelectHovered, setIsToolbarSelectHovered] =
      createSignal(false);

    const pendingAbortSessionId = createMemo(() => store.pendingAbortSessionId);

    const hasAgentProvider = createMemo(() => store.hasAgentProvider);

    const clearHoldTimer = () => {
      if (holdTimerId !== null) {
        clearTimeout(holdTimerId);
        holdTimerId = null;
      }
    };

    const resetCopyConfirmation = () => {
      copyWaitingForConfirmation = false;
      holdTimerFiredWaitingForConfirmation = false;
      holdStartTimestamp = null;
    };

    createEffect(() => {
      if (store.current.state !== "holding") {
        clearHoldTimer();
        return;
      }
      holdStartTimestamp = Date.now();
      holdTimerId = window.setTimeout(() => {
        holdTimerId = null;
        if (copyWaitingForConfirmation) {
          holdTimerFiredWaitingForConfirmation = true;
          return;
        }
        actions.activate();
      }, store.keyHoldDuration);
      onCleanup(clearHoldTimer);
    });

    createEffect(() => {
      if (
        store.current.state !== "active" ||
        store.current.phase !== "justDragged"
      )
        return;
      const timerId = setTimeout(() => {
        actions.finishJustDragged();
      }, FEEDBACK_DURATION_MS);
      onCleanup(() => clearTimeout(timerId));
    });

    createEffect(() => {
      if (store.current.state !== "justCopied") return;
      const timerId = setTimeout(() => {
        actions.finishJustCopied();
      }, FEEDBACK_DURATION_MS);
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
      actions.setInputText(cachedInput ?? "");
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
    let dragPreviewDebounceTimerId: number | null = null;
    const [debouncedDragPointer, setDebouncedDragPointer] = createSignal<{
      x: number;
      y: number;
    } | null>(null);
    let keydownSpamTimerId: number | null = null;
    let holdTimerId: number | null = null;
    let holdStartTimestamp: number | null = null;
    let copyWaitingForConfirmation = false;
    let holdTimerFiredWaitingForConfirmation = false;
    let isScreenshotInProgress = false;
    let inToggleFeedbackPeriod = false;
    let toggleFeedbackTimerId: number | null = null;
    let actionCycleIdleTimeoutId: number | null = null;
    let lastActionCycleInputTimestamp = 0;
    let selectionSourceRequestVersion = 0;
    let componentNameRequestVersion = 0;
    let componentNameDebounceTimerId: number | null = null;
    let keyboardSelectedElement: Element | null = null;
    const [
      debouncedElementForComponentName,
      setDebouncedElementForComponentName,
    ] = createSignal<Element | null>(null);
    const [resolvedComponentName, setResolvedComponentName] = createSignal<
      string | undefined
    >(undefined);
    const [actionCycleItems, setActionCycleItems] = createSignal<
      ActionCycleItem[]
    >([]);
    const [actionCycleActiveIndex, setActionCycleActiveIndex] = createSignal<
      number | null
    >(null);

    const actionCycleActionIds = ["copy", "screenshot", "copy-html"];

    const arrowNavigator = createArrowNavigator(
      isValidGrabbableElement,
      createElementBounds,
    );

    const autoScroller = createAutoScroller(
      () => store.pointer,
      () => isDragging(),
    );

    const isRendererActive = createMemo(() => isActivated() && !isCopying());

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

    const grabbedBoxTimeouts = new Map<string, number>();

    const showTemporaryGrabbedBox = (
      bounds: OverlayBounds,
      element: Element,
    ) => {
      const boxId = `grabbed-${Date.now()}-${Math.random()}`;
      const createdAt = Date.now();
      const newBox: GrabbedBox = { id: boxId, bounds, createdAt, element };

      actions.addGrabbedBox(newBox);
      pluginRegistry.hooks.onGrabbedBox(bounds, element);

      const timeoutId = window.setTimeout(() => {
        grabbedBoxTimeouts.delete(boxId);
        actions.removeGrabbedBox(boxId);
      }, FEEDBACK_DURATION_MS);
      grabbedBoxTimeouts.set(boxId, timeoutId);
    };

    const notifyElementsSelected = async (
      elements: Element[],
    ): Promise<void> => {
      const elementsPayload = await Promise.all(
        elements.map(async (element) => {
          const stack = await getStack(element);

          let componentName: string | null = null;
          let filePath: string | undefined;
          let lineNumber: number | undefined;
          let columnNumber: number | undefined;

          if (stack && stack.length > 0) {
            for (const frame of stack) {
              const hasSourceComponentName =
                frame.functionName &&
                checkIsSourceComponentName(frame.functionName);
              const hasSourceFile =
                frame.fileName && isSourceFile(frame.fileName);

              if (hasSourceComponentName && !componentName) {
                componentName = frame.functionName!;
              }

              if (hasSourceFile && !filePath) {
                filePath = normalizeFileName(frame.fileName!);
                lineNumber = frame.lineNumber || undefined;
                columnNumber = frame.columnNumber || undefined;
              }

              if (componentName && filePath) break;
            }
          }

          if (!componentName) {
            componentName = getComponentDisplayName(element);
          }

          const textContent =
            element instanceof HTMLElement
              ? element.innerText?.slice(0, 100)
              : undefined;

          return {
            tagName: getTagName(element),
            id: element.id || undefined,
            className: element.getAttribute("class") || undefined,
            textContent,
            componentName: componentName ?? undefined,
            filePath,
            lineNumber,
            columnNumber,
          };
        }),
      );

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
      actions.clearLabelInstances();
      const instanceId = `label-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;
      const boundsCenterX = bounds.x + bounds.width / 2;
      const boundsHalfWidth = bounds.width / 2;
      const mouseXOffset =
        mouseX !== undefined ? mouseX - boundsCenterX : undefined;

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
        mouseXOffsetFromCenter: mouseXOffset,
        mouseXOffsetRatio:
          mouseXOffset !== undefined && boundsHalfWidth > 0
            ? mouseXOffset / boundsHalfWidth
            : undefined,
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
      labelFadeTimeouts.delete(instanceId);
      actions.removeLabelInstance(instanceId);
    };

    const labelFadeTimeouts = new Map<string, number>();

    const cancelLabelFade = (instanceId: string) => {
      const existingTimeout = labelFadeTimeouts.get(instanceId);
      if (existingTimeout !== undefined) {
        window.clearTimeout(existingTimeout);
        labelFadeTimeouts.delete(instanceId);
      }
    };

    const scheduleLabelFade = (instanceId: string) => {
      cancelLabelFade(instanceId);

      const timeoutId = window.setTimeout(() => {
        labelFadeTimeouts.delete(instanceId);
        updateLabelInstance(instanceId, "fading");
        setTimeout(() => {
          removeLabelInstance(instanceId);
        }, FADE_COMPLETE_BUFFER_MS);
      }, FEEDBACK_DURATION_MS);

      labelFadeTimeouts.set(instanceId, timeoutId);
    };

    const handleLabelInstanceHoverChange = (
      instanceId: string,
      isHovered: boolean,
    ) => {
      if (isHovered) {
        cancelLabelFade(instanceId);
      } else {
        const instance = store.labelInstances.find(
          (labelInstance) => labelInstance.id === instanceId,
        );
        if (instance && instance.status === "copied") {
          scheduleLabelFade(instanceId);
        }
      }
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
      inToggleFeedbackPeriod = false;
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
          scheduleLabelFade(instanceId);
        }

        if (shouldDeactivateAfter) {
          deactivateRenderer();
        } else {
          actions.activate();
          inToggleFeedbackPeriod = true;
          if (toggleFeedbackTimerId !== null) {
            window.clearTimeout(toggleFeedbackTimerId);
          }
          toggleFeedbackTimerId = window.setTimeout(() => {
            inToggleFeedbackPeriod = false;
            toggleFeedbackTimerId = null;
          }, FEEDBACK_DURATION_MS);
        }
      });
    };

    const copyWithFallback = (elements: Element[], extraPrompt?: string) => {
      const firstElement = elements[0];
      const componentName = firstElement
        ? getComponentDisplayName(firstElement)
        : null;
      const tagName = firstElement ? getTagName(firstElement) : null;
      const elementName = componentName ?? tagName ?? undefined;

      return tryCopyWithFallback(
        {
          maxContextLines: pluginRegistry.store.options.maxContextLines,
          getContent: pluginRegistry.store.options.getContent,
          componentName: elementName,
        },
        {
          onBeforeCopy: pluginRegistry.hooks.onBeforeCopy,
          transformSnippet: pluginRegistry.hooks.transformSnippet,
          transformCopyContent: pluginRegistry.hooks.transformCopyContent,
          onAfterCopy: pluginRegistry.hooks.onAfterCopy,
          onCopySuccess: pluginRegistry.hooks.onCopySuccess,
          onCopyError: pluginRegistry.hooks.onCopyError,
        },
        elements,
        extraPrompt,
      );
    };

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
      void notifyElementsSelected(targetElements);
    };

    interface CopyWithLabelOptions {
      element: Element;
      positionX: number;
      positionY: number;
      elements?: Element[];
      extraPrompt?: string;
      shouldDeactivateAfter?: boolean;
      onComplete?: () => void;
      dragRect?: {
        pageX: number;
        pageY: number;
        width: number;
        height: number;
      };
    }

    const performCopyWithLabel = ({
      element,
      positionX,
      positionY,
      elements,
      extraPrompt,
      shouldDeactivateAfter,
      onComplete,
      dragRect: passedDragRect,
    }: CopyWithLabelOptions) => {
      const allElements = elements ?? [element];
      const dragRect = passedDragRect ?? store.frozenDragRect;
      let overlayBounds: OverlayBounds;

      if (dragRect && allElements.length > 1) {
        overlayBounds = createBoundsFromDragRect(dragRect);
      } else {
        overlayBounds = createFlatOverlayBounds(createElementBounds(element));
      }

      const labelPositionX =
        allElements.length > 1
          ? overlayBounds.x + overlayBounds.width / 2
          : positionX;

      const tagName = getTagName(element);
      void getNearestComponentName(element).then((componentName) => {
        void executeCopyOperation(
          labelPositionX,
          positionY,
          () => copyElementsToClipboard(allElements, extraPrompt),
          overlayBounds,
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
      }, BOUNDS_RECALC_INTERVAL_MS);

      onCleanup(() => clearInterval(intervalId));
    });

    createEffect(
      on(
        () => effectiveElement(),
        (element) => {
          if (componentNameDebounceTimerId !== null) {
            clearTimeout(componentNameDebounceTimerId);
          }

          if (!element) {
            setDebouncedElementForComponentName(null);
            return;
          }

          componentNameDebounceTimerId = window.setTimeout(() => {
            componentNameDebounceTimerId = null;
            setDebouncedElementForComponentName(element);
          }, COMPONENT_NAME_DEBOUNCE_MS);

          onCleanup(() => {
            if (componentNameDebounceTimerId !== null) {
              clearTimeout(componentNameDebounceTimerId);
              componentNameDebounceTimerId = null;
            }
          });
        },
      ),
    );

    createEffect(() => {
      const elements = store.frozenElements;
      const cleanup = freezeAnimations(elements);
      onCleanup(cleanup);
    });

    createEffect(
      on(isActivated, (activated) => {
        if (!activated) return;
        if (!pluginRegistry.store.options.freezeReactUpdates) return;
        const unfreezeUpdates = freezeUpdates();
        onCleanup(unfreezeUpdates);
      }),
    );

    // HACK: In touch mode during drag, effectiveElement() is null so we use detectedElement
    const getSelectionElement = (): Element | undefined => {
      if (store.isTouchMode && isDragging()) {
        const detected = store.detectedElement;
        if (!detected || isRootElement(detected)) return undefined;
        return detected;
      }
      const element = effectiveElement();
      if (!element || isRootElement(element)) return undefined;
      return element;
    };

    const selectionElement = createMemo(() => getSelectionElement());

    const isSelectionElementVisible = (): boolean => {
      if (store.isTouchMode && isDragging()) {
        const detected = store.detectedElement;
        if (!detected || isRootElement(detected)) return false;
        return isRendererActive();
      }
      const element = effectiveElement();
      if (!element || isRootElement(element)) return false;
      return isRendererActive() && !isDragging();
    };

    const selectionBounds = createMemo((): OverlayBounds | undefined => {
      void store.viewportVersion;

      const frozenElements = store.frozenElements;
      if (frozenElements.length > 0) {
        const firstElement = frozenElements[0];
        if (frozenElements.length === 1 && firstElement) {
          return createElementBounds(firstElement);
        }
        const dragRect = store.frozenDragRect;
        if (dragRect) {
          return createBoundsFromDragRect(dragRect);
        }
        const elementBounds = frozenElements
          .filter((element): element is Element => element !== null)
          .map((element) => createElementBounds(element));
        return createFlatOverlayBounds(combineBounds(elementBounds));
      }

      const element = getSelectionElement();
      if (!element) return undefined;
      return createElementBounds(element);
    });

    const frozenElementsBounds = createMemo((): OverlayBounds[] => {
      void store.viewportVersion;

      const frozenElements = store.frozenElements;
      if (frozenElements.length === 0) return [];

      const dragRect = store.frozenDragRect;
      if (dragRect && frozenElements.length > 1) {
        return [createBoundsFromDragRect(dragRect)];
      }

      return frozenElements
        .filter((element): element is Element => element !== null)
        .map((element) => createElementBounds(element));
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
      void store.viewportVersion;

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

    const dragPreviewBounds = createMemo((): OverlayBounds[] => {
      void store.viewportVersion;

      if (!isDraggingBeyondThreshold()) return [];

      const pointer = debouncedDragPointer();
      if (!pointer) return [];

      const drag = calculateDragRectangle(pointer.x, pointer.y);
      const elements = getElementsInDrag(drag, isValidGrabbableElement);
      const previewElements =
        elements.length > 0
          ? elements
          : getElementsInDrag(drag, isValidGrabbableElement, false);

      return previewElements.map((element) => createElementBounds(element));
    });

    const selectionBoundsMultiple = createMemo((): OverlayBounds[] => {
      const previewBounds = dragPreviewBounds();
      if (previewBounds.length > 0) {
        return previewBounds;
      }
      return frozenElementsBounds();
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
          const currentVersion = ++selectionSourceRequestVersion;

          const clearSource = () => {
            if (selectionSourceRequestVersion === currentVersion) {
              actions.setSelectionSource(null, null);
            }
          };

          if (!element) {
            clearSource();
            return;
          }

          getStack(element)
            .then((stack) => {
              if (selectionSourceRequestVersion !== currentVersion) return;
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
            .catch(() => {
              if (selectionSourceRequestVersion === currentVersion) {
                actions.setSelectionSource(null, null);
              }
            });
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
            crosshairVisible(),
            targetElement(),
            dragBounds(),
            store.grabbedBoxes,
            pluginRegistry.store.theme.enabled,
            pluginRegistry.store.theme.selectionBox.enabled,
            pluginRegistry.store.theme.dragBox.enabled,
            isDraggingBeyondThreshold(),
            effectiveElement(),
            didJustCopy(),
            currentToolbarState(),
          ] as const,
        ([
          active,
          dragging,
          copying,
          inputMode,
          isCrosshairVisible,
          target,
          drag,
          grabbedBoxes,
          themeEnabled,
          selectionBoxEnabled,
          dragBoxEnabled,
          draggingBeyondThreshold,
          effectiveTarget,
          justCopied,
          toolbarState,
        ]) => {
          const isSelectionBoxVisible = Boolean(
            themeEnabled &&
            selectionBoxEnabled &&
            active &&
            !copying &&
            !justCopied &&
            !dragging &&
            effectiveTarget != null,
          );
          const isDragBoxVisible = Boolean(
            themeEnabled &&
            dragBoxEnabled &&
            active &&
            !copying &&
            draggingBeyondThreshold,
          );
          pluginRegistry.hooks.onStateChange({
            isActive: active,
            isDragging: dragging,
            isCopying: copying,
            isPromptMode: inputMode,
            isCrosshairVisible: isCrosshairVisible ?? false,
            isSelectionBoxVisible,
            isDragBoxVisible,
            targetElement: target,
            dragBounds: drag
              ? {
                  x: drag.x,
                  y: drag.y,
                  width: drag.width,
                  height: drag.height,
                }
              : null,
            grabbedBoxes: grabbedBoxes.map((box) => ({
              id: box.id,
              bounds: box.bounds,
              createdAt: box.createdAt,
            })),
            selectionFilePath: store.selectionFilePath,
            toolbarState,
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
        () =>
          [
            labelVisible(),
            labelVariant(),
            cursorPosition(),
            targetElement(),
            store.selectionFilePath,
            store.selectionLineNumber,
          ] as const,
        ([visible, variant, position, element, filePath, lineNumber]) => {
          pluginRegistry.hooks.onElementLabel(Boolean(visible), variant, {
            x: position.x,
            y: position.y,
            content: "",
            element: element ?? undefined,
            tagName: element ? getTagName(element) || undefined : undefined,
            filePath: filePath ?? undefined,
            lineNumber: lineNumber ?? undefined,
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
        () => [isActivated(), isCopying(), isPromptMode()] as const,
        ([activated, copying, inputMode]) => {
          if (copying) {
            setCursorOverride("progress");
          } else if (activated && !inputMode) {
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
      keyboardSelectedElement = null;
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
      agent?: AgentOptions,
    ) => {
      const element = elements[0];
      if (element && document.contains(element)) {
        const rect = element.getBoundingClientRect();
        const centerY = rect.top + rect.height / 2;

        actions.setPointer({ x: session.position.x, y: centerY });
        actions.setFrozenElements(elements);
        actions.setInputText(session.context.prompt);
        actions.setWasActivatedByToggle(true);

        if (agent) {
          actions.setSelectedAgent(agent);
        }

        if (!isActivated()) {
          activateRenderer();
        }
      }
    };

    const wrapAgentWithCallbacks = (agent: AgentOptions): AgentOptions => {
      return {
        ...agent,
        onAbort: (session: AgentSession, elements: Element[]) => {
          agent.onAbort?.(session, elements);
          restoreInputFromSession(session, elements, agent);
        },
        onUndo: (session: AgentSession, elements: Element[]) => {
          agent.onUndo?.(session, elements);
          restoreInputFromSession(session, elements, agent);
        },
      };
    };

    const getAgentOptionsWithCallbacks = () => {
      const agent = getAgentFromActions();
      if (!agent) return undefined;
      return wrapAgentWithCallbacks(agent);
    };

    const agentManager = createAgentManager(getAgentOptionsWithCallbacks(), {
      transformAgentContext: pluginRegistry.hooks.transformAgentContext,
    });

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
      const currentX = firstBounds.x + firstBounds.width / 2;
      const currentY = firstBounds.y + firstBounds.height / 2;
      const labelPositionX = currentX + store.copyOffsetFromCenterX;

      if ((store.selectedAgent || hasAgentProvider()) && prompt) {
        elementInputCache.delete(element);

        const currentReplySessionId = store.replySessionId;
        const selectedAgent = store.selectedAgent;

        deactivateRenderer();

        actions.setReplySessionId(null);
        actions.clearSelectedAgent();

        void agentManager.session.start({
          elements,
          prompt,
          position: { x: labelPositionX, y: currentY },
          selectionBounds: currentSelectionBounds,
          sessionId: currentReplySessionId ?? undefined,
          agent: selectedAgent
            ? wrapAgentWithCallbacks(selectedAgent)
            : undefined,
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
        positionX: labelPositionX,
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
      } else if (isEnabled()) {
        toggleActivate();
      }
    };

    const enterCommentModeForElement = (
      element: Element,
      positionX: number,
      positionY: number,
    ) => {
      actions.setPendingCommentMode(false);
      loadCachedInput(element);
      actions.enterPromptMode({ x: positionX, y: positionY }, element);
    };

    const handleComment = () => {
      if (!isEnabled()) return;

      const isAlreadyInCommentMode = isActivated() && isCommentMode();
      if (isAlreadyInCommentMode) {
        deactivateRenderer();
        return;
      }

      actions.setPendingCommentMode(true);
      if (!isActivated()) {
        toggleActivate();
      }
    };

    const handleToggleEnabled = () => {
      const newEnabled = !isEnabled();
      setIsEnabled(newEnabled);
      const currentState = loadToolbarState();
      const newState = {
        edge: currentState?.edge ?? "bottom",
        ratio: currentState?.ratio ?? 0.5,
        collapsed: currentState?.collapsed ?? false,
        enabled: newEnabled,
      };
      saveToolbarState(newState);
      setCurrentToolbarState(newState);
      toolbarStateChangeCallbacks.forEach((cb) => cb(newState));
      if (!newEnabled) {
        if (isHoldingKeys()) {
          actions.release();
        }
        if (isActivated()) {
          deactivateRenderer();
        }
        // Clear toggle feedback state to prevent stale state from affecting re-enable
        if (toggleFeedbackTimerId !== null) {
          window.clearTimeout(toggleFeedbackTimerId);
          toggleFeedbackTimerId = null;
        }
        inToggleFeedbackPeriod = false;
      }
    };

    const handlePointerMove = (clientX: number, clientY: number) => {
      if (
        !isEnabled() ||
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
        if (dragPreviewDebounceTimerId !== null) {
          clearTimeout(dragPreviewDebounceTimerId);
        }
        setDebouncedDragPointer(null);
        dragPreviewDebounceTimerId = window.setTimeout(() => {
          setDebouncedDragPointer({ x: clientX, y: clientY });
          dragPreviewDebounceTimerId = null;
        }, DRAG_PREVIEW_DEBOUNCE_MS);

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
      actions.setPointer({ x: clientX, y: clientY });
      document.body.style.userSelect = "none";

      if (dragPreviewDebounceTimerId !== null) {
        clearTimeout(dragPreviewDebounceTimerId);
      }
      setDebouncedDragPointer(null);
      dragPreviewDebounceTimerId = window.setTimeout(() => {
        setDebouncedDragPointer({ x: clientX, y: clientY });
        dragPreviewDebounceTimerId = null;
      }, DRAG_PREVIEW_DEBOUNCE_MS);

      pluginRegistry.hooks.onDragStart(
        clientX + window.scrollX,
        clientY + window.scrollY,
      );

      return true;
    };

    const handleDragSelection = (
      dragSelectionRect: ReturnType<typeof calculateDragRectangle>,
      hasModifierKeyHeld: boolean,
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

      freezeAllAnimations(selectedElements);

      pluginRegistry.hooks.onDragEnd(selectedElements, dragSelectionRect);
      const firstElement = selectedElements[0];
      const center = getBoundsCenter(createElementBounds(firstElement));

      actions.setPointer(center);
      actions.setFrozenElements(selectedElements);
      const dragRect = createPageRectFromBounds(dragSelectionRect);
      actions.setFrozenDragRect(dragRect);
      actions.freeze();
      actions.setLastGrabbed(firstElement);

      if (store.pendingCommentMode) {
        enterCommentModeForElement(firstElement, center.x, center.y);
        return;
      }

      const shouldDeactivateAfter =
        store.wasActivatedByToggle && !hasModifierKeyHeld;

      performCopyWithLabel({
        element: firstElement,
        positionX: center.x,
        positionY: center.y,
        elements: selectedElements,
        shouldDeactivateAfter,
        dragRect,
      });
    };

    const handleSingleClick = (
      clientX: number,
      clientY: number,
      hasModifierKeyHeld: boolean,
    ) => {
      const validFrozenElement =
        store.frozenElement && document.contains(store.frozenElement)
          ? store.frozenElement
          : null;

      const validKeyboardSelectedElement =
        keyboardSelectedElement && document.contains(keyboardSelectedElement)
          ? keyboardSelectedElement
          : null;

      const element =
        validFrozenElement ??
        validKeyboardSelectedElement ??
        getElementAtPosition(clientX, clientY) ??
        (store.detectedElement && document.contains(store.detectedElement)
          ? store.detectedElement
          : null);
      if (!element) return;

      const didSelectViaKeyboard =
        !validFrozenElement && validKeyboardSelectedElement === element;

      let positionX: number;
      let positionY: number;

      if (validFrozenElement) {
        positionX = store.pointer.x;
        positionY = store.pointer.y;
      } else if (didSelectViaKeyboard) {
        const elementCenter = getBoundsCenter(createElementBounds(element));
        positionX = elementCenter.x;
        positionY = elementCenter.y;
      } else {
        positionX = clientX;
        positionY = clientY;
      }

      keyboardSelectedElement = null;

      if (store.pendingCommentMode) {
        enterCommentModeForElement(element, positionX, positionY);
        return;
      }

      const shouldDeactivateAfter =
        store.wasActivatedByToggle && !hasModifierKeyHeld;

      actions.setLastGrabbed(element);

      performCopyWithLabel({
        element,
        positionX,
        positionY,
        shouldDeactivateAfter,
      });
    };

    const handlePointerUp = (
      clientX: number,
      clientY: number,
      hasModifierKeyHeld: boolean,
    ) => {
      if (!isDragging()) return;

      if (dragPreviewDebounceTimerId !== null) {
        clearTimeout(dragPreviewDebounceTimerId);
        dragPreviewDebounceTimerId = null;
      }
      setDebouncedDragPointer(null);

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
        handleDragSelection(dragSelectionRect, hasModifierKeyHeld);
      } else {
        handleSingleClick(clientX, clientY, hasModifierKeyHeld);
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
      if (!ARROW_KEYS.has(event.key)) return false;

      let currentElement = effectiveElement();
      const isInitialSelection = !currentElement;

      if (!currentElement) {
        const viewportCenterX = window.innerWidth / 2;
        const viewportCenterY = window.innerHeight / 2;
        currentElement = getElementAtPosition(viewportCenterX, viewportCenterY);
      }

      if (!currentElement) return false;

      const nextElement = arrowNavigator.findNext(event.key, currentElement);

      if (!nextElement && !isInitialSelection) return false;

      const elementToSelect = nextElement ?? currentElement;

      event.preventDefault();
      event.stopPropagation();
      actions.setFrozenElement(elementToSelect);
      actions.freeze();
      keyboardSelectedElement = elementToSelect;

      const selectionBounds = createElementBounds(elementToSelect);
      const selectionCenter = getBoundsCenter(selectionBounds);
      actions.setPointer(selectionCenter);

      if (store.contextMenuPosition !== null) {
        actions.showContextMenu(selectionCenter, elementToSelect);
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

      const canActivateFromHolding = isHoldingKeys() && !isPromptMode();

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

      const wasHandled = pluginRegistry.hooks.onOpenFile(
        filePath,
        lineNumber ?? undefined,
      );
      if (!wasHandled) {
        const rawUrl = buildOpenFileUrl(filePath, lineNumber ?? undefined);
        const url = pluginRegistry.hooks.transformOpenFileUrl(
          rawUrl,
          filePath,
          lineNumber ?? undefined,
        );
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
      const overlayBounds = createFlatOverlayBounds(bounds);
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

      const elementsForScreenshot =
        store.frozenElements.length > 0
          ? [...store.frozenElements]
          : element
            ? [element]
            : [];

      void (async () => {
        await delay(SCREENSHOT_CAPTURE_DELAY_MS);

        let didSucceed = false;
        let errorMessage: string | undefined;

        try {
          const rawBlob = await captureElementScreenshot(bounds);
          const transformedBlob =
            await pluginRegistry.hooks.transformScreenshot(
              rawBlob,
              elementsForScreenshot,
              bounds,
            );
          didSucceed = await copyImageToClipboard(transformedBlob);
          if (!didSucceed) {
            errorMessage = "Failed to copy";
          }
        } catch (error) {
          errorMessage =
            error instanceof Error && error.message
              ? error.message
              : "Screenshot failed";
        }

        isScreenshotInProgress = false;
        rendererRoot.style.visibility = "";

        updateLabelInstance(
          instanceId,
          didSucceed ? "copied" : "error",
          didSucceed ? undefined : errorMessage || "Unknown error",
        );

        scheduleLabelFade(instanceId);

        if (shouldDeactivate) {
          deactivateRenderer();
        } else {
          actions.unfreeze();
        }
      })();

      return true;
    };

    const clearActionCycleIdleTimeout = () => {
      if (actionCycleIdleTimeoutId !== null) {
        window.clearTimeout(actionCycleIdleTimeoutId);
        actionCycleIdleTimeoutId = null;
      }
    };

    const resetActionCycle = () => {
      clearActionCycleIdleTimeout();
      setActionCycleItems([]);
      setActionCycleActiveIndex(null);
    };

    const canCycleActions = createMemo(() => {
      const element = selectionElement();
      return (
        Boolean(element) &&
        isRendererActive() &&
        !isPromptMode() &&
        !isDragging() &&
        store.contextMenuPosition === null
      );
    });

    const actionCycleState = createMemo<ActionCycleState>(() => ({
      items: actionCycleItems(),
      activeIndex: actionCycleActiveIndex(),
      isVisible:
        actionCycleActiveIndex() !== null && actionCycleItems().length > 0,
    }));

    createEffect(
      on(selectionElement, () => {
        resetActionCycle();
      }),
    );

    createEffect(
      on(canCycleActions, (isEnabled) => {
        if (!isEnabled) {
          resetActionCycle();
        }
      }),
    );

    const getActionById = (
      actionId: string,
    ): ContextMenuAction | undefined =>
      pluginRegistry.store.actions.find((action) => action.id === actionId);

    const getActionCycleItems = (
      context: ContextMenuActionContext | undefined,
    ): ActionCycleItem[] => {
      if (!context) return [];
      const actionsById = new Map<string, ContextMenuAction>();
      for (const action of pluginRegistry.store.actions) {
        actionsById.set(action.id, action);
      }

      return actionCycleActionIds.flatMap((actionId) => {
        const action = actionsById.get(actionId);
        if (!action) return [];
        if (!resolveActionEnabled(action, context)) return [];
        return [{ id: action.id, label: action.label }];
      });
    };

    const handleActionCycleCopy = (
      element: Element,
      elements: Element[],
    ) => {
      const position = store.pointer;
      performCopyWithLabel({
        element,
        positionX: position.x,
        positionY: position.y,
        elements: elements.length > 1 ? elements : undefined,
        shouldDeactivateAfter: store.wasActivatedByToggle,
      });
    };

    const getActionCycleContext = (): ContextMenuActionContext | undefined => {
      const element = selectionElement();
      if (!element) return undefined;
      const elements =
        store.frozenElements.length > 0 ? store.frozenElements : [element];
      const tagName = getTagName(element) || undefined;
      const componentName = selectionComponentName();
      const filePath = store.selectionFilePath ?? undefined;
      const lineNumber = store.selectionLineNumber ?? undefined;
      const fallbackBounds = selectionBounds();
      const fallbackSelectionBounds = fallbackBounds ? [fallbackBounds] : [];

      const context: ContextMenuActionContext = {
        element,
        elements,
        filePath,
        lineNumber,
        componentName,
        tagName,
        copy: () => handleActionCycleCopy(element, elements),
        hooks: {
          transformHtmlContent: pluginRegistry.hooks.transformHtmlContent,
          transformScreenshot: pluginRegistry.hooks.transformScreenshot,
          onOpenFile: pluginRegistry.hooks.onOpenFile,
          transformOpenFileUrl: pluginRegistry.hooks.transformOpenFileUrl,
        },
        performWithFeedback: createPerformWithFeedback(
          element,
          elements,
          tagName,
          componentName,
          {
            fallbackBounds,
            fallbackSelectionBounds,
          },
        ),
        hideContextMenu: () => {
          actions.hideContextMenu();
        },
        hideOverlay: () => {
          isScreenshotInProgress = true;
          rendererRoot.style.visibility = "hidden";
        },
        showOverlay: () => {
          isScreenshotInProgress = false;
          rendererRoot.style.visibility = "";
        },
        cleanup: () => {
          if (store.wasActivatedByToggle) {
            deactivateRenderer();
          } else {
            actions.unfreeze();
          }
        },
      };

      return pluginRegistry.hooks.transformActionContext(
        context,
      ) as ContextMenuActionContext;
    };

    const scheduleActionCycleActivation = () => {
      clearActionCycleIdleTimeout();
      actionCycleIdleTimeoutId = window.setTimeout(() => {
        actionCycleIdleTimeoutId = null;
        const activeIndex = actionCycleActiveIndex();
        const items = actionCycleItems();
        if (activeIndex === null || items.length === 0) return;
        const selectedItem = items[activeIndex];
        if (!selectedItem) return;
        const action = getActionById(selectedItem.id);
        if (!action) {
          resetActionCycle();
          return;
        }
        const context = getActionCycleContext();
        if (!context || !resolveActionEnabled(action, context)) {
          resetActionCycle();
          return;
        }
        resetActionCycle();
        const result = action.onAction(context);
        if (result instanceof Promise) {
          void result;
        }
      }, ACTION_CYCLE_IDLE_TRIGGER_MS);
    };

    const handleActionCycleInput = (
      direction: "forward" | "backward",
    ): boolean => {
      if (!canCycleActions()) return false;
      const context = getActionCycleContext();
      if (!context) return false;
      const availableItems = getActionCycleItems(context);
      if (availableItems.length === 0) return false;

      setActionCycleItems(availableItems);

      const currentIndex = actionCycleActiveIndex();
      const normalizedIndex =
        currentIndex !== null && currentIndex < availableItems.length
          ? currentIndex
          : null;
      const directionOffset = direction === "forward" ? 1 : -1;
      const nextIndex =
        normalizedIndex === null
          ? direction === "forward"
            ? 0
            : availableItems.length - 1
          : (normalizedIndex + directionOffset + availableItems.length) %
            availableItems.length;

      setActionCycleActiveIndex(nextIndex);
      scheduleActionCycleActivation();
      return true;
    };

    const handleActionCycleKey = (event: KeyboardEvent): boolean => {
      if (event.code !== "KeyC") return false;
      if (event.metaKey || event.ctrlKey || event.altKey) return false;
      if (event.repeat) return false;
      if (isKeyboardEventTriggeredByInput(event)) return false;
      if (!handleActionCycleInput("forward")) return false;
      event.preventDefault();
      event.stopPropagation();
      return true;
    };

    const handleActionCycleWheel = (event: WheelEvent) => {
      if (!canCycleActions()) return;
      const now = Date.now();
      if (now - lastActionCycleInputTimestamp < ACTION_CYCLE_INPUT_THROTTLE_MS)
        return;
      lastActionCycleInputTimestamp = now;

      const delta =
        Math.abs(event.deltaY) >= Math.abs(event.deltaX)
          ? event.deltaY
          : event.deltaX;
      if (delta === 0) return;

      handleActionCycleInput(delta < 0 ? "backward" : "forward");
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
        }, KEYDOWN_SPAM_TIMEOUT_MS);
        return;
      }

      if (isHoldingKeys() && event.repeat) {
        if (copyWaitingForConfirmation) {
          const shouldActivate = holdTimerFiredWaitingForConfirmation;
          resetCopyConfirmation();
          if (shouldActivate) {
            actions.activate();
          }
        }
        return;
      }

      if (isCopying() || didJustCopy()) return;

      if (!isHoldingKeys()) {
        const keyHoldDuration =
          pluginRegistry.store.options.keyHoldDuration ??
          DEFAULT_KEY_HOLD_DURATION_MS;

        let activationDuration = keyHoldDuration;
        if (isKeyboardEventTriggeredByInput(event)) {
          if (hasTextSelectionInInput(event)) {
            activationDuration += INPUT_TEXT_SELECTION_ACTIVATION_DELAY_MS;
          } else {
            activationDuration += INPUT_FOCUS_ACTIVATION_DELAY_MS;
          }
        } else if (hasTextSelectionOnPage()) {
          activationDuration += INPUT_TEXT_SELECTION_ACTIVATION_DELAY_MS;
        }
        resetCopyConfirmation();
        actions.startHold(activationDuration);
      }
    };

    eventListenerManager.addWindowListener(
      "keydown",
      (event: KeyboardEvent) => {
        blockEnterIfNeeded(event);

        if (!isEnabled()) {
          if (
            isTargetKeyCombination(event, pluginRegistry.store.options) &&
            !event.repeat
          ) {
            setToolbarShakeCount((count) => count + 1);
          }
          return;
        }

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

        const isFromOverlay =
          isEventFromOverlay(event, "data-react-grab-ignore-events") &&
          !isEnterToActivateInput;

        if (isPromptMode() || isFromOverlay) {
          if (event.key === "Escape") {
            if (pendingAbortSessionId()) {
              event.preventDefault();
              event.stopPropagation();
              actions.setPendingAbortSessionId(null);
            } else if (store.wasActivatedByToggle && !isPromptMode()) {
              deactivateRenderer();
            }
          }

          if (isFromOverlay && ARROW_KEYS.has(event.key)) {
            if (handleArrowNavigation(event)) return;
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

        if (handleActionCycleKey(event)) return;
        if (handleArrowNavigation(event)) return;
        if (handleEnterKeyActivation(event)) return;
        if (handleOpenFileShortcut(event)) return;
        if (handleScreenshotShortcut(event)) return;

        handleActivationKeys(event);
      },
      { capture: true },
    );

    eventListenerManager.addWindowListener("wheel", handleActionCycleWheel, {
      passive: true,
    });

    eventListenerManager.addWindowListener(
      "keyup",
      (event: KeyboardEvent) => {
        if (blockEnterIfNeeded(event)) return;

        const requiredModifiers = getRequiredModifiers(
          pluginRegistry.store.options,
        );
        const isReleasingModifier =
          requiredModifiers.metaKey || requiredModifiers.ctrlKey
            ? isMac()
              ? !event.metaKey
              : !event.ctrlKey
            : (requiredModifiers.shiftKey && !event.shiftKey) ||
              (requiredModifiers.altKey && !event.altKey);

        const isReleasingActivationKey = pluginRegistry.store.options
          .activationKey
          ? typeof pluginRegistry.store.options.activationKey === "function"
            ? pluginRegistry.store.options.activationKey(event)
            : parseActivationKey(pluginRegistry.store.options.activationKey)(
                event,
              )
          : isCLikeKey(event.key, event.code);

        if (didJustCopy() || inToggleFeedbackPeriod) {
          if (isReleasingActivationKey || isReleasingModifier) {
            inToggleFeedbackPeriod = false;
            deactivateRenderer();
          }
          return;
        }

        if (!isHoldingKeys() && !isActivated()) return;
        if (isPromptMode()) return;

        const hasCustomShortcut = Boolean(
          pluginRegistry.store.options.activationKey,
        );

        const isHoldMode =
          pluginRegistry.store.options.activationMode === "hold";

        if (isActivated()) {
          const hasContextMenu = store.contextMenuPosition !== null;
          if (isReleasingModifier) {
            if (
              store.wasActivatedByToggle &&
              pluginRegistry.store.options.activationMode !== "hold"
            )
              return;
            if (hasContextMenu) return;
            deactivateRenderer();
          } else if (isHoldMode && isReleasingActivationKey) {
            if (keydownSpamTimerId !== null) {
              window.clearTimeout(keydownSpamTimerId);
              keydownSpamTimerId = null;
            }
            if (hasContextMenu) return;
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

          const shouldRelease =
            isHoldingKeys() ||
            (holdTimerFiredWaitingForConfirmation && isReleasingModifier);

          if (shouldRelease) {
            clearHoldTimer();
            const elapsedSinceHoldStart = holdStartTimestamp
              ? Date.now() - holdStartTimestamp
              : 0;
            const heldLongEnoughForActivation =
              elapsedSinceHoldStart >= MIN_HOLD_FOR_ACTIVATION_AFTER_COPY_MS;
            const shouldActivateAfterCopy =
              holdTimerFiredWaitingForConfirmation &&
              heldLongEnoughForActivation &&
              (pluginRegistry.store.options.allowActivationInsideInput ||
                !isKeyboardEventTriggeredByInput(event));
            resetCopyConfirmation();
            if (shouldActivateAfterCopy) {
              actions.activate();
            } else {
              actions.release();
            }
          } else {
            deactivateRenderer();
          }
        }
      },
      { capture: true },
    );

    eventListenerManager.addDocumentListener("copy", () => {
      if (isHoldingKeys()) {
        copyWaitingForConfirmation = true;
      }
    });

    eventListenerManager.addWindowListener("keypress", blockEnterIfNeeded, {
      capture: true,
    });

    eventListenerManager.addWindowListener(
      "pointermove",
      (event: PointerEvent) => {
        if (!event.isPrimary) return;
        const isTouchPointer = event.pointerType === "touch";
        actions.setTouchMode(isTouchPointer);
        if (isEventFromOverlay(event, "data-react-grab-ignore-events")) return;
        if (store.contextMenuPosition !== null) return;
        const isActiveState = isTouchPointer ? isHoldingKeys() : isActivated();
        if (isActiveState && !isPromptMode() && isToggleFrozen()) {
          actions.unfreeze();
          arrowNavigator.clearHistory();
        }
        handlePointerMove(event.clientX, event.clientY);
      },
      { passive: true },
    );

    eventListenerManager.addWindowListener(
      "pointerdown",
      (event: PointerEvent) => {
        if (event.button !== 0) return;
        if (!event.isPrimary) return;
        actions.setTouchMode(event.pointerType === "touch");
        if (isEventFromOverlay(event, "data-react-grab-ignore-events")) return;
        if (store.contextMenuPosition !== null) return;

        if (isPromptMode()) {
          const bounds = selectionBounds();
          const isClickOnSelection =
            bounds &&
            event.clientX >= bounds.x &&
            event.clientX <= bounds.x + bounds.width &&
            event.clientY >= bounds.y &&
            event.clientY <= bounds.y + bounds.height;

          if (isClickOnSelection) {
            void handleInputSubmit();
          } else {
            handleInputCancel();
          }
          return;
        }

        const didHandle = handlePointerDown(event.clientX, event.clientY);
        if (didHandle) {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
        }
      },
      { capture: true },
    );

    eventListenerManager.addWindowListener(
      "pointerup",
      (event: PointerEvent) => {
        if (event.button !== 0) return;
        if (!event.isPrimary) return;
        if (isEventFromOverlay(event, "data-react-grab-ignore-events")) return;
        if (store.contextMenuPosition !== null) return;
        const hasModifierKeyHeld = event.metaKey || event.ctrlKey;
        handlePointerUp(event.clientX, event.clientY, hasModifierKeyHeld);
      },
      { capture: true },
    );

    eventListenerManager.addWindowListener(
      "contextmenu",
      (event: MouseEvent) => {
        if (!isRendererActive() || isCopying() || isPromptMode()) return;
        if (isEventFromOverlay(event, "data-react-grab-ignore-events")) return;
        if (store.contextMenuPosition !== null) {
          event.preventDefault();
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        const element = getElementAtPosition(event.clientX, event.clientY);
        if (!element) return;

        const existingFrozenElements = store.frozenElements;
        const isClickedElementAlreadyFrozen =
          existingFrozenElements.length > 1 &&
          existingFrozenElements.includes(element);

        if (isClickedElementAlreadyFrozen) {
          freezeAllAnimations(existingFrozenElements);
        } else {
          freezeAllAnimations([element]);
          actions.setFrozenElement(element);
        }

        const position = { x: event.clientX, y: event.clientY };
        actions.setPointer(position);
        actions.freeze();
        actions.showContextMenu(position, element);
        pluginRegistry.hooks.onContextMenu(element, position);
      },
      { capture: true },
    );

    eventListenerManager.addWindowListener(
      "pointercancel",
      (event: PointerEvent) => {
        if (!event.isPrimary) return;
        if (isDragging()) {
          actions.cancelDrag();
          autoScroller.stop();
          document.body.style.userSelect = "";
        }
      },
    );

    eventListenerManager.addWindowListener(
      "click",
      (event: MouseEvent) => {
        if (isEventFromOverlay(event, "data-react-grab-ignore-events")) return;
        if (store.contextMenuPosition !== null) return;

        if (isRendererActive() || isCopying() || didJustDrag()) {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();

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

    const redetectElementUnderPointer = () => {
      if (
        isEnabled() &&
        !isPromptMode() &&
        !isToggleFrozen() &&
        !isDragging() &&
        store.contextMenuPosition === null &&
        store.frozenElements.length === 0
      ) {
        const candidate = getElementAtPosition(
          store.pointer.x,
          store.pointer.y,
        );
        actions.setDetectedElement(candidate);
      }
    };

    const handleViewportChange = () => {
      invalidateBoundsCache();
      clearElementPositionCache();
      clearVisibilityCache();
      redetectElementUnderPointer();
      actions.incrementViewportVersion();
      actions.updateSessionBounds();
      actions.updateContextMenuPosition();
    };

    eventListenerManager.addWindowListener("scroll", handleViewportChange, {
      capture: true,
    });

    let previousViewportWidth = window.innerWidth;
    let previousViewportHeight = window.innerHeight;

    eventListenerManager.addWindowListener("resize", () => {
      const currentViewportWidth = window.innerWidth;
      const currentViewportHeight = window.innerHeight;

      if (previousViewportWidth > 0 && previousViewportHeight > 0) {
        const scaleX = currentViewportWidth / previousViewportWidth;
        const scaleY = currentViewportHeight / previousViewportHeight;
        const isUniformScale =
          Math.abs(scaleX - scaleY) < ZOOM_DETECTION_THRESHOLD;
        const hasScaleChanged = Math.abs(scaleX - 1) > ZOOM_DETECTION_THRESHOLD;

        if (isUniformScale && hasScaleChanged) {
          actions.setPointer({
            x: store.pointer.x * scaleX,
            y: store.pointer.y * scaleY,
          });
        }
      }

      previousViewportWidth = currentViewportWidth;
      previousViewportHeight = currentViewportHeight;

      handleViewportChange();
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
      if (toggleFeedbackTimerId) window.clearTimeout(toggleFeedbackTimerId);
      if (actionCycleIdleTimeoutId) {
        window.clearTimeout(actionCycleIdleTimeoutId);
      }
      grabbedBoxTimeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
      grabbedBoxTimeouts.clear();
      autoScroller.stop();
      document.body.style.userSelect = "";
      document.body.style.touchAction = "";
      setCursorOverride(null);
      keyboardClaimer.restore();
    });

    const rendererRoot = mountRoot(cssText as string);

    const selectionVisible = createMemo(() => {
      if (!pluginRegistry.store.theme.enabled) return false;
      if (!pluginRegistry.store.theme.selectionBox.enabled) return false;
      if (didJustCopy()) return false;

      const hasDragPreview = dragPreviewBounds().length > 0;
      if (hasDragPreview) return true;

      return isSelectionElementVisible();
    });

    const selectionTagName = createMemo(() => {
      const element = getSelectionElement();
      if (!element) return undefined;
      return getTagName(element) || undefined;
    });

    createEffect(
      on(
        () => debouncedElementForComponentName(),
        (element) => {
          const currentVersion = ++componentNameRequestVersion;

          if (!element) {
            setResolvedComponentName(undefined);
            return;
          }

          getNearestComponentName(element)
            .then((name) => {
              if (componentNameRequestVersion !== currentVersion) return;
              setResolvedComponentName(name ?? undefined);
            })
            .catch(() => {
              if (componentNameRequestVersion !== currentVersion) return;
              setResolvedComponentName(undefined);
            });
        },
      ),
    );

    const selectionComponentName = resolvedComponentName;

    const selectionLabelVisible = createMemo(() => {
      if (store.contextMenuPosition !== null) return false;
      if (!pluginRegistry.store.theme.elementLabel.enabled) return false;
      if (didJustCopy()) return false;

      return isSelectionElementVisible();
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
        const hasMultipleElements =
          instance.elements && instance.elements.length > 1;
        const instanceElement = instance.element;
        const canRecalculateBounds =
          !hasMultipleElements &&
          instanceElement &&
          document.body.contains(instanceElement);
        const newBounds = canRecalculateBounds
          ? createElementBounds(instanceElement)
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
        const newBoundsCenterX = newBounds.x + newBounds.width / 2;
        const newBoundsHalfWidth = newBounds.width / 2;
        const newMouseX =
          instance.mouseXOffsetRatio !== undefined && newBoundsHalfWidth > 0
            ? newBoundsCenterX + instance.mouseXOffsetRatio * newBoundsHalfWidth
            : instance.mouseXOffsetFromCenter !== undefined
              ? newBoundsCenterX + instance.mouseXOffsetFromCenter
              : instance.mouseX;
        const newCached = { ...instance, bounds: newBounds, mouseX: newMouseX };
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
      const frozenCount = store.frozenElements.length;
      if (frozenCount > 1) {
        return `${frozenCount} elements`;
      }
      return getTagName(element) || undefined;
    });

    const [contextMenuComponentName] = createResource(
      () => ({
        element: store.contextMenuElement,
        frozenCount: store.frozenElements.length,
      }),
      async ({ element, frozenCount }) => {
        if (!element) return undefined;
        if (frozenCount > 1) return undefined;
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

    const createPerformWithFeedback = (
      element: Element,
      elements: Element[],
      tagName: string | undefined,
      componentName: string | undefined,
      options?: PerformWithFeedbackOptions,
    ) => {
      return async (action: () => Promise<boolean>): Promise<void> => {
        const fallbackBounds = options?.fallbackBounds ?? null;
        const fallbackSelectionBounds =
          options?.fallbackSelectionBounds ?? [];
        const position =
          options?.position ?? store.contextMenuPosition ?? store.pointer;
        const frozenBounds = frozenElementsBounds();
        const singleElementBounds = contextMenuBounds() ?? fallbackBounds;
        const hasMultipleElements = elements.length > 1;

        const labelBounds = hasMultipleElements
          ? createFlatOverlayBounds(combineBounds(frozenBounds))
          : singleElementBounds;

        const shouldDeactivateAfter = store.wasActivatedByToggle;
        const selectionBoundsForLabel = hasMultipleElements
          ? frozenBounds
          : singleElementBounds
            ? [singleElementBounds]
            : fallbackSelectionBounds;

        actions.hideContextMenu();

        if (labelBounds) {
          const labelPositionX = hasMultipleElements
            ? labelBounds.x + labelBounds.width / 2
            : position.x;

          const labelInstanceId = createLabelInstance(
            labelBounds,
            tagName || "element",
            componentName,
            "copying",
            element,
            labelPositionX,
            hasMultipleElements ? elements : undefined,
            selectionBoundsForLabel,
          );

          let didSucceed = false;
          let errorMessage: string | undefined;

          try {
            didSucceed = await action();
            if (!didSucceed) {
              errorMessage = "Failed to copy";
            }
          } catch (error) {
            errorMessage =
              error instanceof Error && error.message
                ? error.message
                : "Action failed";
          }

          updateLabelInstance(
            labelInstanceId,
            didSucceed ? "copied" : "error",
            didSucceed ? undefined : errorMessage || "Unknown error",
          );

          scheduleLabelFade(labelInstanceId);
        } else {
          try {
            await action();
          } catch {}
        }

        if (shouldDeactivateAfter) {
          deactivateRenderer();
        } else {
          actions.unfreeze();
        }
      };
    };

    const contextMenuActionContext = createMemo(
      (): ContextMenuActionContext | undefined => {
        const element = store.contextMenuElement;
        if (!element) return undefined;
        const fileInfo = contextMenuFilePath();
        const elements =
          store.frozenElements.length > 0 ? store.frozenElements : [element];
        const tagName = contextMenuTagName();
        const componentName = contextMenuComponentName();

        const context: ContextMenuActionContext = {
          element,
          elements,
          filePath: fileInfo?.filePath,
          lineNumber: fileInfo?.lineNumber,
          componentName,
          tagName,
          enterPromptMode: handleContextMenuPrompt,
          copy: handleContextMenuCopy,
          hooks: {
            transformHtmlContent: pluginRegistry.hooks.transformHtmlContent,
            transformScreenshot: pluginRegistry.hooks.transformScreenshot,
            onOpenFile: pluginRegistry.hooks.onOpenFile,
            transformOpenFileUrl: pluginRegistry.hooks.transformOpenFileUrl,
          },
          performWithFeedback: createPerformWithFeedback(
            element,
            elements,
            tagName,
            componentName,
          ),
          hideContextMenu: () => {
            // HACK: Defer hiding context menu until after click event propagates fully
            setTimeout(() => {
              actions.hideContextMenu();
            }, 0);
          },
          hideOverlay: () => {
            isScreenshotInProgress = true;
            rendererRoot.style.visibility = "hidden";
          },
          showOverlay: () => {
            isScreenshotInProgress = false;
            rendererRoot.style.visibility = "";
          },
          cleanup: () => {
            if (store.wasActivatedByToggle) {
              deactivateRenderer();
            } else {
              actions.unfreeze();
            }
          },
        };

        return pluginRegistry.hooks.transformActionContext(
          context,
        ) as ContextMenuActionContext;
      },
    );

    const handleContextMenuCopy = () => {
      const element = store.contextMenuElement;
      if (!element) return;

      keyboardSelectedElement = null;

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

    const handleContextMenuPrompt = (agent?: AgentOptions) => {
      const element = store.contextMenuElement;
      const position = store.contextMenuPosition;
      if (!element || !position) return;

      if (agent) {
        actions.setSelectedAgent(agent);
      }

      loadCachedInput(element);
      actions.enterPromptMode(position, element);

      // HACK: Defer hiding context menu until after click event propagates fully
      setTimeout(() => {
        actions.hideContextMenu();
      }, 0);
    };

    const handleContextMenuDismiss = () => {
      // HACK: Defer hiding context menu until after click event propagates fully
      setTimeout(() => {
        actions.hideContextMenu();
        deactivateRenderer();
      }, 0);
    };

    const handleContextMenuHide = () => {
      // HACK: Defer hiding context menu until after click event propagates fully
      setTimeout(() => {
        actions.hideContextMenu();
      }, 0);
    };

    const handleShowContextMenuSession = (sessionId: string) => {
      const session = agentManager.sessions().get(sessionId);
      if (!session) return;

      const element = agentManager.session.getElement(sessionId);
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
        const hasMultipleElements = elementsToFreeze.length > 1;
        if (hasMultipleElements && instance.bounds) {
          actions.setFrozenDragRect(createPageRectFromBounds(instance.bounds));
        }
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
      render(() => {
        return (
          <ReactGrabRenderer
            selectionVisible={selectionVisible()}
            selectionBounds={selectionBounds()}
            selectionBoundsMultiple={selectionBoundsMultiple()}
            selectionShouldSnap={
              store.frozenElements.length > 0 || dragPreviewBounds().length > 0
            }
            selectionElementsCount={frozenElementsCount()}
            selectionFilePath={store.selectionFilePath ?? undefined}
            selectionLineNumber={store.selectionLineNumber ?? undefined}
            selectionTagName={selectionTagName()}
            selectionComponentName={selectionComponentName()}
            selectionLabelVisible={selectionLabelVisible()}
            selectionLabelStatus="idle"
            selectionActionCycleState={actionCycleState()}
            labelInstances={computedLabelInstances()}
            dragVisible={dragVisible()}
            dragBounds={dragBounds()}
            grabbedBoxes={computedGrabbedBoxes()}
            labelZIndex={Z_INDEX_LABEL}
            mouseX={
              store.frozenElements.length > 1 ? undefined : cursorPosition().x
            }
            mouseY={cursorPosition().y}
            crosshairVisible={crosshairVisible()}
            isFrozen={
              isToggleFrozen() || isActivated() || isToolbarSelectHovered()
            }
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
            onLabelInstanceHoverChange={handleLabelInstanceHoverChange}
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
            isCommentMode={isCommentMode()}
            onToggleActive={handleToggleActive}
            onComment={handleComment}
            enabled={isEnabled()}
            onToggleEnabled={handleToggleEnabled}
            shakeCount={toolbarShakeCount()}
            onToolbarStateChange={(state) => {
              setCurrentToolbarState(state);
              toolbarStateChangeCallbacks.forEach((cb) => cb(state));
            }}
            onSubscribeToToolbarStateChanges={(callback) => {
              toolbarStateChangeCallbacks.add(callback);
              return () => {
                toolbarStateChangeCallbacks.delete(callback);
              };
            }}
            onToolbarSelectHoverChange={setIsToolbarSelectHovered}
            contextMenuPosition={contextMenuPosition()}
            contextMenuBounds={contextMenuBounds()}
            contextMenuTagName={contextMenuTagName()}
            contextMenuComponentName={contextMenuComponentName()}
            contextMenuHasFilePath={Boolean(contextMenuFilePath()?.filePath)}
            actions={pluginRegistry.store.actions}
            actionContext={contextMenuActionContext()}
            onContextMenuDismiss={handleContextMenuDismiss}
            onContextMenuHide={handleContextMenuHide}
          />
        );
      }, rendererRoot);
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
      const hasProvider = Boolean(agentOpts?.provider);
      actions.setHasAgentProvider(hasProvider);
      if (hasProvider && agentOpts?.provider) {
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
        if (!isActivated() && isEnabled()) {
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
        } else if (isEnabled()) {
          toggleActivate();
        }
      },
      isActive: () => isActivated(),
      isEnabled: () => isEnabled(),
      setEnabled: (enabled: boolean) => {
        if (enabled === isEnabled()) return;
        setIsEnabled(enabled);
        if (!enabled) {
          if (isHoldingKeys()) {
            actions.release();
          }
          if (isActivated()) {
            deactivateRenderer();
          }
          if (toggleFeedbackTimerId !== null) {
            window.clearTimeout(toggleFeedbackTimerId);
            toggleFeedbackTimerId = null;
          }
          inToggleFeedbackPeriod = false;
        }
      },
      getToolbarState: () => loadToolbarState(),
      setToolbarState: (state: Partial<ToolbarState>) => {
        const currentState = loadToolbarState();
        const newState = {
          edge: state.edge ?? currentState?.edge ?? "bottom",
          ratio: state.ratio ?? currentState?.ratio ?? 0.5,
          collapsed: state.collapsed ?? currentState?.collapsed ?? false,
          enabled: state.enabled ?? currentState?.enabled ?? true,
        };
        saveToolbarState(newState);
        setCurrentToolbarState(newState);
        if (state.enabled !== undefined && state.enabled !== isEnabled()) {
          setIsEnabled(state.enabled);
        }
        toolbarStateChangeCallbacks.forEach((cb) => cb(newState));
      },
      onToolbarStateChange: (callback: (state: ToolbarState) => void) => {
        toolbarStateChangeCallbacks.add(callback);
        return () => {
          toolbarStateChangeCallbacks.delete(callback);
        };
      },
      dispose: () => {
        hasInited = false;
        toolbarStateChangeCallbacks.clear();
        dispose();
      },
      copyElement: copyElementAPI,
      getSource: async (element: Element): Promise<SourceInfo | null> => {
        const stack = await getStack(element);
        if (!stack) return null;
        for (const frame of stack) {
          if (frame.fileName && isSourceFile(frame.fileName)) {
            return {
              filePath: normalizeFileName(frame.fileName),
              lineNumber: frame.lineNumber ?? null,
              componentName:
                frame.functionName &&
                checkIsSourceComponentName(frame.functionName)
                  ? frame.functionName
                  : null,
            };
          }
        }
        return null;
      },
      getState: (): ReactGrabState => ({
        isActive: isActivated(),
        isDragging: isDragging(),
        isCopying: isCopying(),
        isPromptMode: isPromptMode(),
        isCrosshairVisible: crosshairVisible() ?? false,
        isSelectionBoxVisible: selectionVisible() ?? false,
        isDragBoxVisible: dragVisible() ?? false,
        targetElement: targetElement(),
        dragBounds: dragBounds() ?? null,
        grabbedBoxes: store.grabbedBoxes.map((box) => ({
          id: box.id,
          bounds: box.bounds,
          createdAt: box.createdAt,
        })),
        selectionFilePath: store.selectionFilePath,
        toolbarState: currentToolbarState(),
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
      getDisplayName: getComponentDisplayName,
    };

    for (const plugin of builtInPlugins) {
      pluginRegistry.register(plugin, api);
    }

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
  SourceInfo,
  AgentContext,
  AgentSession,
  AgentSessionStorage,
  AgentProvider,
  AgentCompleteResult,
  AgentOptions,
  SettableOptions,
  ContextMenuAction,
  ActionContext,
  Plugin,
  PluginConfig,
  PluginHooks,
} from "../types.js";

export { generateSnippet } from "../utils/generate-snippet.js";
export { copyContent } from "../utils/copy-content.js";
