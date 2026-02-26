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
  batch,
} from "solid-js";
import { render } from "solid-js/web";
import { createGrabStore } from "./store.js";
import {
  isKeyboardEventTriggeredByInput,
  hasTextSelectionInInput,
  hasTextSelectionOnPage,
} from "../utils/is-keyboard-event-triggered-by-input.js";
import { mountRoot } from "../utils/mount-root.js";
import {
  nativeCancelAnimationFrame,
  nativeRequestAnimationFrame,
  waitUntilNextFrame,
} from "../utils/native-raf.js";
import { ReactGrabRenderer } from "../components/renderer.js";
import {
  getStack,
  getStackContext,
  getNearestComponentName,
  checkIsSourceComponentName,
  getComponentDisplayName,
  resolveSourceFromStack,
  checkIsNextProject,
} from "./context.js";
import { isSourceFile, normalizeFileName } from "bippy/source";
import { createNoopApi } from "./noop-api.js";
import { createEventListenerManager } from "./events.js";
import { tryCopyWithFallback } from "./copy.js";
import { getElementAtPosition } from "../utils/get-element-at-position.js";
import { isValidGrabbableElement } from "../utils/is-valid-grabbable-element.js";
import { isRootElement } from "../utils/is-root-element.js";
import { isElementConnected } from "../utils/is-element-connected.js";
import { getElementsInDrag } from "../utils/get-elements-in-drag.js";
import { createElementBounds } from "../utils/create-element-bounds.js";
import { createElementSelector } from "../utils/create-element-selector.js";
import { clearAllCaches } from "../utils/clear-all-caches.js";
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
  PENDING_DETECTION_STALENESS_MS,
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
  ZOOM_DETECTION_THRESHOLD,
  ACTION_CYCLE_IDLE_TRIGGER_MS,
  WINDOW_REFOCUS_GRACE_PERIOD_MS,
  DROPDOWN_HOVER_OPEN_DELAY_MS,
  PREVIEW_TEXT_MAX_LENGTH,
  DEFERRED_EXECUTION_DELAY_MS,
  NEXTJS_REVALIDATION_DELAY_MS,
} from "../constants.js";
import { getBoundsCenter } from "../utils/get-bounds-center.js";
import { isCLikeKey } from "../utils/is-c-like-key.js";
import { isTargetKeyCombination } from "../utils/is-target-key-combination.js";
import { parseActivationKey } from "../utils/parse-activation-key.js";
import { isEventFromOverlay } from "../utils/is-event-from-overlay.js";
import { openFile } from "../utils/open-file.js";
import { combineBounds } from "../utils/combine-bounds.js";
import {
  resolveActionEnabled,
  resolveToolbarActionEnabled,
} from "../utils/resolve-action-enabled.js";
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
  PerformWithFeedbackOptions,
  SettableOptions,
  SourceInfo,
  Plugin,
  ToolbarState,
  HistoryItem,
  DropdownAnchor,
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
import { commentPlugin } from "./plugins/comment.js";
import { openPlugin } from "./plugins/open.js";
import { copyHtmlPlugin } from "./plugins/copy-html.js";
import { copyStylesPlugin } from "./plugins/copy-styles.js";
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
import {
  loadHistory,
  addHistoryItem,
  removeHistoryItem,
  clearHistory,
} from "../utils/history-storage.js";
import { copyContent } from "../utils/copy-content.js";
import { joinSnippets } from "../utils/join-snippets.js";

const builtInPlugins = [
  copyPlugin,
  commentPlugin,
  copyHtmlPlugin,
  copyStylesPlugin,
  openPlugin,
];

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
    const [historyItems, setHistoryItems] =
      createSignal<HistoryItem[]>(loadHistory());
    const [historyDropdownPosition, setHistoryDropdownPosition] =
      createSignal<DropdownAnchor | null>(null);
    const [toolbarMenuPosition, setToolbarMenuPosition] =
      createSignal<DropdownAnchor | null>(null);
    const [clearPromptPosition, setClearPromptPosition] =
      createSignal<DropdownAnchor | null>(null);
    let toolbarElement: HTMLDivElement | undefined;
    let dropdownTrackingFrameId: number | null = null;
    const historyElementMap = new Map<string, Element[]>();
    const [hasUnreadHistoryItems, setHasUnreadHistoryItems] =
      createSignal(false);
    const [clockFlashTrigger, setClockFlashTrigger] = createSignal(0);
    const [isHistoryHoverOpen, setIsHistoryHoverOpen] = createSignal(false);
    let historyHoverPreviews: { boxId: string; labelId: string | null }[] = [];

    const getMappedHistoryElements = (historyItemId: string): Element[] =>
      historyElementMap.get(historyItemId) ?? [];

    const reacquireHistoryElements = (historyItem: HistoryItem): Element[] => {
      const selectors = historyItem.elementSelectors ?? [];
      if (selectors.length === 0) return [];

      const reacquiredElements: Element[] = [];
      for (const selector of selectors) {
        if (!selector) continue;
        try {
          const reacquiredElement = document.querySelector(selector);
          if (isElementConnected(reacquiredElement)) {
            reacquiredElements.push(reacquiredElement);
          }
          // HACK: querySelector can throw on invalid selectors stored from previous sessions
        } catch {}
      }
      return reacquiredElements;
    };

    const getConnectedHistoryElements = (
      historyItem: HistoryItem,
    ): Element[] => {
      const mappedElements = getMappedHistoryElements(historyItem.id);
      const connectedMappedElements = mappedElements.filter((mappedElement) =>
        isElementConnected(mappedElement),
      );
      const areAllMappedElementsConnected =
        mappedElements.length > 0 &&
        connectedMappedElements.length === mappedElements.length;

      if (areAllMappedElementsConnected) {
        return connectedMappedElements;
      }

      const reacquiredElements = reacquireHistoryElements(historyItem);
      if (reacquiredElements.length > 0) {
        historyElementMap.set(historyItem.id, reacquiredElements);
        return reacquiredElements;
      }

      return connectedMappedElements;
    };

    const getFirstConnectedHistoryElement = (
      historyItem: HistoryItem,
    ): Element | undefined => getConnectedHistoryElements(historyItem)[0];

    const historyDisconnectedItemIds = createMemo(
      () => {
        // HACK: subscribe to dropdown position so connectivity refreshes when dropdown opens
        void historyDropdownPosition();
        const disconnectedIds = new Set<string>();
        for (const item of historyItems()) {
          if (getConnectedHistoryElements(item).length === 0) {
            disconnectedIds.add(item.id);
          }
        }
        return disconnectedIds;
      },
      undefined,
      {
        equals: (prev, next) => {
          if (prev.size !== next.size) return false;
          for (const id of next) {
            if (!prev.has(id)) return false;
          }
          return true;
        },
      },
    );

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

    createEffect(
      on(isHoldingKeys, (currentlyHolding, previouslyHolding = false) => {
        if (!previouslyHolding || currentlyHolding || !isActivated()) {
          return;
        }
        if (pluginRegistry.store.options.activationMode !== "hold") {
          actions.setWasActivatedByToggle(true);
        }
        pluginRegistry.hooks.onActivate();
      }),
    );

    const preparePromptMode = (
      element: Element,
      positionX: number,
      positionY: number,
    ) => {
      setCopyStartPosition(element, positionX, positionY);
      actions.clearInputText();
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
    let pendingDetectionScheduledAt = 0;
    let latestDetectionX = 0;
    let latestDetectionY = 0;
    let dragPreviewDebounceTimerId: number | null = null;
    const [debouncedDragPointer, setDebouncedDragPointer] = createSignal<{
      x: number;
      y: number;
    } | null>(null);
    const scheduleDragPreviewUpdate = (clientX: number, clientY: number) => {
      if (dragPreviewDebounceTimerId !== null) {
        clearTimeout(dragPreviewDebounceTimerId);
      }
      setDebouncedDragPointer(null);
      dragPreviewDebounceTimerId = window.setTimeout(() => {
        setDebouncedDragPointer({ x: clientX, y: clientY });
        dragPreviewDebounceTimerId = null;
      }, DRAG_PREVIEW_DEBOUNCE_MS);
    };
    let keydownSpamTimerId: number | null = null;
    let holdTimerId: number | null = null;
    let holdStartTimestamp: number | null = null;
    let copyWaitingForConfirmation = false;
    let holdTimerFiredWaitingForConfirmation = false;
    let lastWindowFocusTimestamp = 0;
    let inToggleFeedbackPeriod = false;
    let toggleFeedbackTimerId: number | null = null;
    let actionCycleIdleTimeoutId: number | null = null;
    let selectionSourceRequestVersion = 0;
    let componentNameRequestVersion = 0;
    let componentNameDebounceTimerId: number | null = null;
    let keyboardSelectedElement: Element | null = null;
    let isPendingContextMenuSelect = false;
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
        !isToolbarSelectHovered() &&
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
              ? element.innerText?.slice(0, PREVIEW_TEXT_MAX_LENGTH)
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
      options?: {
        element?: Element;
        mouseX?: number;
        elements?: Element[];
        boundsMultiple?: OverlayBounds[];
        hideArrow?: boolean;
      },
    ): string => {
      actions.clearLabelInstances();
      const instanceId = `label-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;
      const boundsCenterX = bounds.x + bounds.width / 2;
      const boundsHalfWidth = bounds.width / 2;
      const mouseX = options?.mouseX;
      const mouseXOffset =
        mouseX !== undefined ? mouseX - boundsCenterX : undefined;

      const instance: SelectionLabelInstance = {
        id: instanceId,
        bounds,
        boundsMultiple: options?.boundsMultiple,
        tagName,
        componentName,
        status,
        createdAt: Date.now(),
        element: options?.element,
        elements: options?.elements,
        mouseX,
        mouseXOffsetFromCenter: mouseXOffset,
        mouseXOffsetRatio:
          mouseXOffset !== undefined && boundsHalfWidth > 0
            ? mouseXOffset / boundsHalfWidth
            : undefined,
        hideArrow: options?.hideArrow,
      };
      actions.addLabelInstance(instance);
      return instanceId;
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
        actions.updateLabelInstance(instanceId, "fading");
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

    interface ExecuteCopyOptions {
      positionX: number;
      operation: () => Promise<void>;
      bounds?: OverlayBounds;
      tagName?: string;
      componentName?: string;
      element?: Element;
      shouldDeactivateAfter?: boolean;
      elements?: Element[];
      existingInstanceId?: string | null;
    }

    const executeCopyOperation = async ({
      positionX,
      operation,
      bounds,
      tagName,
      componentName,
      element,
      shouldDeactivateAfter,
      elements,
      existingInstanceId,
    }: ExecuteCopyOptions) => {
      inToggleFeedbackPeriod = false;
      if (store.current.state !== "copying") {
        actions.startCopy();
      }
      let instanceId = existingInstanceId ?? null;
      if (!instanceId && bounds && tagName) {
        instanceId = createLabelInstance(
          bounds,
          tagName,
          componentName,
          "copying",
          {
            element,
            mouseX: positionX,
            elements,
          },
        );
      }

      let didSucceed = false;
      let errorMessage: string | undefined;

      try {
        await operation();
        didSucceed = true;
      } catch (error) {
        errorMessage =
          error instanceof Error && error.message
            ? error.message
            : "Action failed";
      }

      if (instanceId) {
        if (didSucceed) {
          actions.updateLabelInstance(instanceId, "copied");
        } else {
          actions.updateLabelInstance(
            instanceId,
            "error",
            errorMessage || "Unknown error",
          );
        }
        scheduleLabelFade(instanceId);
      }

      if (store.current.state === "copying") {
        if (didSucceed) {
          actions.completeCopy(element);
        }

        if (shouldDeactivateAfter) {
          deactivateRenderer();
        } else if (didSucceed) {
          actions.activate();
          inToggleFeedbackPeriod = true;
          if (toggleFeedbackTimerId !== null) {
            window.clearTimeout(toggleFeedbackTimerId);
          }
          toggleFeedbackTimerId = window.setTimeout(() => {
            inToggleFeedbackPeriod = false;
            toggleFeedbackTimerId = null;
          }, FEEDBACK_DURATION_MS);
        } else {
          actions.unfreeze();
        }
      }
    };

    const copyWithFallback = (
      elements: Element[],
      extraPrompt?: string,
      resolvedComponentName?: string,
    ) => {
      const firstElement = elements[0];
      const componentName =
        resolvedComponentName ??
        (firstElement ? getComponentDisplayName(firstElement) : null);
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
          onCopySuccess: (copiedElements: Element[], content: string) => {
            pluginRegistry.hooks.onCopySuccess(copiedElements, content);

            const hasCopiedElements = copiedElements.length > 0;
            const isComment = Boolean(extraPrompt);

            if (hasCopiedElements) {
              const currentItems = historyItems();
              for (const [
                existingItemId,
                mappedElements,
              ] of historyElementMap.entries()) {
                const isSameSelection =
                  mappedElements.length === copiedElements.length &&
                  mappedElements.every(
                    (element, index) => element === copiedElements[index],
                  );
                if (!isSameSelection) continue;
                const existingItem = currentItems.find(
                  (item) => item.id === existingItemId,
                );
                if (!existingItem) continue;

                const shouldDedup = isComment
                  ? existingItem.isComment &&
                    existingItem.commentText === extraPrompt
                  : !existingItem.isComment;

                if (shouldDedup) {
                  removeHistoryItem(existingItemId);
                  historyElementMap.delete(existingItemId);
                  break;
                }
              }
            }

            const elementSelectors = copiedElements.map((element, index) =>
              createElementSelector(element, index === 0),
            );

            const updatedHistoryItems = addHistoryItem({
              content,
              elementName: elementName ?? "element",
              tagName: tagName ?? "div",
              componentName: componentName ?? undefined,
              elementsCount: copiedElements.length,
              previewBounds: copiedElements.map((element) =>
                createElementBounds(element),
              ),
              elementSelectors,
              isComment,
              commentText: extraPrompt ?? undefined,
              timestamp: Date.now(),
            });
            setHistoryItems(updatedHistoryItems);
            setHasUnreadHistoryItems(true);
            setClockFlashTrigger((previous) => previous + 1);
            const newestHistoryItem = updatedHistoryItems[0];
            if (newestHistoryItem && hasCopiedElements) {
              historyElementMap.set(newestHistoryItem.id, [...copiedElements]);
            }

            const currentItemIds = new Set(
              updatedHistoryItems.map((item) => item.id),
            );
            for (const mapItemId of historyElementMap.keys()) {
              if (!currentItemIds.has(mapItemId)) {
                historyElementMap.delete(mapItemId);
              }
            }
          },
          onCopyError: pluginRegistry.hooks.onCopyError,
        },
        elements,
        extraPrompt,
      );
    };

    const copyElementsToClipboard = async (
      targetElements: Element[],
      extraPrompt?: string,
      resolvedComponentName?: string,
    ): Promise<void> => {
      if (targetElements.length === 0) return;

      const unhandledElements: Element[] = [];
      const pendingResults: Promise<boolean>[] = [];
      for (const element of targetElements) {
        const { wasIntercepted, pendingResult } =
          pluginRegistry.hooks.onElementSelect(element);
        if (!wasIntercepted) {
          unhandledElements.push(element);
        }
        if (pendingResult) {
          pendingResults.push(pendingResult);
        }
        if (pluginRegistry.store.theme.grabbedBoxes.enabled) {
          showTemporaryGrabbedBox(createElementBounds(element), element);
        }
      }
      await waitUntilNextFrame();
      if (unhandledElements.length > 0) {
        await copyWithFallback(
          unhandledElements,
          extraPrompt,
          resolvedComponentName,
        );
      } else if (pendingResults.length > 0) {
        const results = await Promise.all(pendingResults);
        if (!results.every(Boolean)) {
          throw new Error("Failed to copy");
        }
      }
      void notifyElementsSelected(targetElements);
    };

    interface CopyWithLabelOptions {
      element: Element;
      positionX: number;
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
      inToggleFeedbackPeriod = false;
      actions.startCopy();

      const labelInstanceId = tagName
        ? createLabelInstance(overlayBounds, tagName, undefined, "copying", {
            element,
            mouseX: labelPositionX,
            elements,
          })
        : null;

      void getNearestComponentName(element).then((componentName) => {
        void executeCopyOperation({
          positionX: labelPositionX,
          operation: () =>
            copyElementsToClipboard(
              allElements,
              extraPrompt,
              componentName ?? undefined,
            ),
          bounds: overlayBounds,
          tagName,
          componentName: componentName ?? undefined,
          element,
          shouldDeactivateAfter,
          elements,
          existingInstanceId: labelInstanceId,
        }).then(() => {
          onComplete?.();
        });
      });
    };

    const targetElement = createMemo(() => {
      void store.viewportVersion;
      if (!isRendererActive() || isDragging()) return null;
      const element = store.detectedElement;
      if (!isElementConnected(element)) return null;
      return element;
    });

    const effectiveElement = createMemo(
      () => store.frozenElement || (isToggleFrozen() ? null : targetElement()),
    );

    createEffect(() => {
      const element = store.detectedElement;
      if (!element) return;

      const intervalId = setInterval(() => {
        if (!isElementConnected(element)) {
          actions.setDetectedElement(null);
        }
      }, BOUNDS_RECALC_INTERVAL_MS);

      onCleanup(() => clearInterval(intervalId));
    });

    createEffect(
      on(effectiveElement, (element) => {
        if (componentNameDebounceTimerId !== null) {
          clearTimeout(componentNameDebounceTimerId);
          componentNameDebounceTimerId = null;
        }

        if (!element) {
          setDebouncedElementForComponentName(null);
          return;
        }

        componentNameDebounceTimerId = window.setTimeout(() => {
          componentNameDebounceTimerId = null;
          setDebouncedElementForComponentName(element);
        }, COMPONENT_NAME_DEBOUNCE_MS);
      }),
    );

    onCleanup(() => {
      if (componentNameDebounceTimerId !== null) {
        clearTimeout(componentNameDebounceTimerId);
        componentNameDebounceTimerId = null;
      }
    });

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
      const element = selectionElement();
      if (!element) return false;
      if (store.isTouchMode && isDragging()) {
        return isRendererActive();
      }
      return isRendererActive() && !isDragging();
    };

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

    const selectionBounds = createMemo((): OverlayBounds | undefined => {
      void store.viewportVersion;

      const frozenElements = store.frozenElements;
      if (frozenElements.length > 0) {
        const frozenBounds = frozenElementsBounds();
        if (frozenElements.length === 1) {
          const firstBounds = frozenBounds[0];
          if (firstBounds) return firstBounds;
        }
        const dragRect = store.frozenDragRect;
        if (dragRect) {
          const dragBounds = frozenBounds[0];
          return dragBounds ?? createBoundsFromDragRect(dragRect);
        }
        return createFlatOverlayBounds(combineBounds(frozenBounds));
      }

      const element = selectionElement();
      if (!element) return undefined;
      return createElementBounds(element);
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

    const stateChangeGrabbedBoxes = createMemo(() =>
      store.grabbedBoxes.map((box) => ({
        id: box.id,
        bounds: box.bounds,
        createdAt: box.createdAt,
      })),
    );

    const stateChangeLabelInstances = createMemo(() =>
      store.labelInstances.map((instance) => ({
        id: instance.id,
        status: instance.status,
        tagName: instance.tagName,
        componentName: instance.componentName,
        createdAt: instance.createdAt,
      })),
    );

    const derivedStateForHook = createMemo(() => {
      const active = isActivated();
      const dragging = isDragging();
      const copying = isCopying();
      const inputMode = isPromptMode();
      const crosshairState = crosshairVisible();
      const target = targetElement();
      const drag = dragBounds();
      const themeEnabled = pluginRegistry.store.theme.enabled;
      const selectionBoxEnabled =
        pluginRegistry.store.theme.selectionBox.enabled;
      const dragBoxEnabled = pluginRegistry.store.theme.dragBox.enabled;
      const draggingBeyondThreshold = isDraggingBeyondThreshold();
      const effectiveTarget = effectiveElement();
      const justCopied = didJustCopy();

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

      return {
        isActive: active,
        isDragging: dragging,
        isCopying: copying,
        isPromptMode: inputMode,
        isCrosshairVisible: crosshairState ?? false,
        isSelectionBoxVisible,
        isDragBoxVisible,
        targetElement: target,
        dragBounds: drag
          ? { x: drag.x, y: drag.y, width: drag.width, height: drag.height }
          : null,
        grabbedBoxes: stateChangeGrabbedBoxes(),
        labelInstances: stateChangeLabelInstances(),
        selectionFilePath: store.selectionFilePath,
        toolbarState: currentToolbarState(),
      };
    });

    createEffect(
      on(derivedStateForHook, (state) => {
        pluginRegistry.hooks.onStateChange(state);
      }),
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

    const clearToggleFeedbackState = () => {
      if (toggleFeedbackTimerId !== null) {
        window.clearTimeout(toggleFeedbackTimerId);
        toggleFeedbackTimerId = null;
      }
      inToggleFeedbackPeriod = false;
    };

    const deactivateRenderer = () => {
      const wasDragging = isDragging();
      const previousFocused = store.previouslyFocusedElement;
      actions.deactivate();
      arrowNavigator.clearHistory();
      keyboardSelectedElement = null;
      isPendingContextMenuSelect = false;
      if (wasDragging) {
        document.body.style.userSelect = "";
      }
      if (keydownSpamTimerId) window.clearTimeout(keydownSpamTimerId);
      autoScroller.stop();
      if (
        previousFocused instanceof HTMLElement &&
        isElementConnected(previousFocused)
      ) {
        previousFocused.focus();
      }
      pluginRegistry.hooks.onDeactivate();
    };

    const forceDeactivateAll = () => {
      if (isHoldingKeys()) {
        actions.release();
      }
      if (isActivated()) {
        deactivateRenderer();
      }
      clearToggleFeedbackState();
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
      if (isElementConnected(element)) {
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

    const handleInputSubmit = () => {
      actions.clearLastCopied();
      const frozenElements = [...store.frozenElements];
      const element = store.frozenElement || targetElement();
      const prompt = isPromptMode() ? store.inputText.trim() : "";

      if (!element) {
        deactivateRenderer();
        return;
      }

      const elements =
        frozenElements.length > 0 ? frozenElements : element ? [element] : [];

      const currentSelectionBounds = elements.map((selectedElement) =>
        createElementBounds(selectedElement),
      );
      const firstBounds = currentSelectionBounds[0];
      const currentX = firstBounds.x + firstBounds.width / 2;
      const currentY = firstBounds.y + firstBounds.height / 2;
      const labelPositionX = currentX + store.copyOffsetFromCenterX;

      if ((store.selectedAgent || hasAgentProvider()) && prompt) {
        const currentReplySessionId = store.replySessionId;
        const selectedAgent = store.selectedAgent;

        deactivateRenderer();

        actions.clearReplySessionId();
        actions.setSelectedAgent(null);

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

      performCopyWithLabel({
        element,
        positionX: labelPositionX,
        elements,
        extraPrompt: prompt || undefined,
        onComplete: deactivateRenderer,
      });
    };

    const handleInputCancel = () => {
      actions.clearLastCopied();
      if (!isPromptMode()) return;

      const currentInput = store.inputText.trim();
      if (currentInput && !isPendingDismiss()) {
        actions.setPendingDismiss(true);
        return;
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
        isPendingContextMenuSelect = true;
        toggleActivate();
      }
    };

    const enterCommentModeForElement = (
      element: Element,
      positionX: number,
      positionY: number,
    ) => {
      actions.setPendingCommentMode(false);
      actions.clearInputText();
      actions.enterPromptMode({ x: positionX, y: positionY }, element);
    };

    const openContextMenu = (
      element: Element,
      position: { x: number; y: number },
    ) => {
      actions.showContextMenu(position, element);
      dismissAllPopups();
      pluginRegistry.hooks.onContextMenu(element, position);
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
      toolbarStateChangeCallbacks.forEach((callback) => callback(newState));
      if (!newEnabled) {
        forceDeactivateAll();
        dismissAllPopups();
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

      latestDetectionX = clientX;
      latestDetectionY = clientY;

      const now = performance.now();
      const isDetectionPending =
        pendingDetectionScheduledAt > 0 &&
        now - pendingDetectionScheduledAt < PENDING_DETECTION_STALENESS_MS;
      if (
        now - lastElementDetectionTime >= ELEMENT_DETECTION_THROTTLE_MS &&
        !isDetectionPending
      ) {
        lastElementDetectionTime = now;
        pendingDetectionScheduledAt = now;
        onIdle(() => {
          const candidate = getElementAtPosition(
            latestDetectionX,
            latestDetectionY,
          );
          if (candidate !== store.detectedElement) {
            actions.setDetectedElement(candidate);
          }
          pendingDetectionScheduledAt = 0;
        });
      }

      if (isDragging()) {
        scheduleDragPreviewUpdate(clientX, clientY);

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

      scheduleDragPreviewUpdate(clientX, clientY);

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

      if (isPendingContextMenuSelect) {
        isPendingContextMenuSelect = false;
        openContextMenu(firstElement, center);
        return;
      }

      const shouldDeactivateAfter =
        store.wasActivatedByToggle && !hasModifierKeyHeld;

      performCopyWithLabel({
        element: firstElement,
        positionX: center.x,
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
      const validFrozenElement = isElementConnected(store.frozenElement)
        ? store.frozenElement
        : null;

      const validKeyboardSelectedElement = isElementConnected(
        keyboardSelectedElement,
      )
        ? keyboardSelectedElement
        : null;

      const element =
        validFrozenElement ??
        validKeyboardSelectedElement ??
        getElementAtPosition(clientX, clientY) ??
        (isElementConnected(store.detectedElement)
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

      if (isPendingContextMenuSelect) {
        isPendingContextMenuSelect = false;
        const { wasIntercepted } =
          pluginRegistry.hooks.onElementSelect(element);
        if (wasIntercepted) return;

        freezeAllAnimations([element]);
        actions.setFrozenElement(element);
        const position = { x: positionX, y: positionY };
        actions.setPointer(position);
        actions.freeze();
        openContextMenu(element, position);
        return;
      }

      const shouldDeactivateAfter =
        store.wasActivatedByToggle && !hasModifierKeyHeld;

      actions.setLastGrabbed(element);

      performCopyWithLabel({
        element,
        positionX,
        shouldDeactivateAfter,
      });
    };

    const cancelActiveDrag = () => {
      if (!isDragging()) return;
      actions.cancelDrag();
      autoScroller.stop();
      document.body.style.userSelect = "";
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
        !store.wasActivatedByToggle &&
        clearPromptPosition() === null;

      if (shouldBlockEnter) {
        keyboardClaimer.claimedEvents.add(event);
        event.preventDefault();
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
      if (isKeyboardEventTriggeredByInput(event)) return false;

      const copiedElement = store.lastCopiedElement;
      const canActivateFromCopied =
        !isHoldingKeys() &&
        !isPromptMode() &&
        !isActivated() &&
        copiedElement &&
        isElementConnected(copiedElement) &&
        !store.labelInstances.some(
          (instance) =>
            instance.status === "copied" || instance.status === "fading",
        );

      if (canActivateFromCopied) {
        event.preventDefault();
        event.stopImmediatePropagation();

        const center = getBoundsCenter(createElementBounds(copiedElement));

        actions.setPointer(center);
        preparePromptMode(copiedElement, center.x, center.y);
        actions.setFrozenElement(copiedElement);
        actions.clearLastCopied();

        activatePromptMode();
        if (!isActivated()) {
          activateRenderer();
        }
        return true;
      }

      const canActivateFromHolding = isHoldingKeys() && !isPromptMode();

      if (canActivateFromHolding) {
        event.preventDefault();
        event.stopImmediatePropagation();

        const element = store.frozenElement || targetElement();
        if (element) {
          preparePromptMode(element, store.pointer.x, store.pointer.y);
        }

        actions.setPointer({ x: store.pointer.x, y: store.pointer.y });
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
        openFile(
          filePath,
          lineNumber ?? undefined,
          pluginRegistry.hooks.transformOpenFileUrl,
        );
      }
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

    const getActionById = (actionId: string): ContextMenuAction | undefined =>
      pluginRegistry.store.actions.find((action) => action.id === actionId);

    const getActionCycleContext = (): ContextMenuActionContext | undefined => {
      const element = selectionElement();
      if (!element) return undefined;

      const fallbackBounds = selectionBounds();

      return buildActionContext({
        element,
        filePath: store.selectionFilePath ?? undefined,
        lineNumber: store.selectionLineNumber ?? undefined,
        tagName: getTagName(element) || undefined,
        componentName: resolvedComponentName(),
        position: store.pointer,
        performWithFeedbackOptions: {
          fallbackBounds,
          fallbackSelectionBounds: fallbackBounds ? [fallbackBounds] : [],
        },
        shouldDeferHideContextMenu: false,
        onBeforePrompt: resetActionCycle,
      });
    };

    const availableActionCycleItems = createMemo((): ActionCycleItem[] => {
      if (!selectionElement()) return [];

      const cycleItems: ActionCycleItem[] = [];
      for (const action of pluginRegistry.store.actions) {
        const isStaticallyDisabled =
          typeof action.enabled === "boolean" && !action.enabled;
        if (isStaticallyDisabled) continue;
        cycleItems.push({
          id: action.id,
          label: action.label,
          shortcut: action.shortcut,
        });
      }
      return cycleItems;
    });

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

    const advanceActionCycle = (): boolean => {
      if (!canCycleActions()) return false;
      const cycleItems = availableActionCycleItems();
      if (cycleItems.length === 0) return false;

      setActionCycleItems(cycleItems);

      const currentIndex = actionCycleActiveIndex();
      const isCurrentIndexValid =
        currentIndex !== null && currentIndex < cycleItems.length;
      const nextIndex = isCurrentIndexValid
        ? (currentIndex + 1) % cycleItems.length
        : 0;

      setActionCycleActiveIndex(nextIndex);
      scheduleActionCycleActivation();
      return true;
    };

    const handleActionCycleKey = (event: KeyboardEvent): boolean => {
      if (event.code !== "KeyC") return false;
      if (event.altKey || event.repeat) return false;
      if (isKeyboardEventTriggeredByInput(event)) return false;
      if (!advanceActionCycle()) return false;

      event.preventDefault();
      event.stopPropagation();
      if (event.metaKey || event.ctrlKey) {
        event.stopImmediatePropagation();
      }
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
          (event.metaKey || event.ctrlKey) &&
          !MODIFIER_KEYS.includes(event.key) &&
          !isEnterCode(event.code)
        ) {
          if (isActivated() && !store.wasActivatedByToggle) {
            deactivateRenderer();
          } else if (isHoldingKeys()) {
            clearHoldTimer();
            resetCopyConfirmation();
            actions.release();
          }
        }
        if (!isEnterCode(event.code) || !isHoldingKeys()) {
          return;
        }
      }

      if ((isActivated() || isHoldingKeys()) && !isPromptMode()) {
        event.preventDefault();
        if (isEnterCode(event.code)) {
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

        const isFromReactGrabInput = isEventFromOverlay(
          event,
          "data-react-grab-input",
        );
        if (
          isPromptMode() &&
          isTargetKeyCombination(event, pluginRegistry.store.options) &&
          !event.repeat &&
          !isFromReactGrabInput
        ) {
          event.preventDefault();
          event.stopPropagation();
          handleInputCancel();
          return;
        }

        if (event.key === "Escape" && clearPromptPosition() !== null) {
          return;
        }

        if (event.key === "Escape" && historyDropdownPosition() !== null) {
          dismissHistoryDropdown();
          return;
        }

        if (toolbarMenuPosition() !== null) {
          if (event.key === "Escape") {
            dismissToolbarMenu();
            return;
          }

          const toolbarActions = pluginRegistry.store.toolbarActions;
          const isModifierPressed =
            (event.metaKey || event.ctrlKey) && !event.repeat;
          const matchedAction = toolbarActions.find((action) => {
            if (!action.shortcut) return false;
            if (event.key === "Enter") return action.shortcut === "Enter";
            return (
              isModifierPressed &&
              event.key.toLowerCase() === action.shortcut.toLowerCase()
            );
          });

          if (matchedAction && resolveToolbarActionEnabled(matchedAction)) {
            event.preventDefault();
            event.stopPropagation();
            matchedAction.onAction();
            dismissToolbarMenu();
          }
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
            } else if (isPromptMode()) {
              handleInputCancel();
            } else if (store.wasActivatedByToggle) {
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

        const didWindowJustRegainFocus =
          Date.now() - lastWindowFocusTimestamp <
          WINDOW_REFOCUS_GRACE_PERIOD_MS;

        if (!didWindowJustRegainFocus && handleActionCycleKey(event)) return;
        if (handleArrowNavigation(event)) return;
        if (handleEnterKeyActivation(event)) return;
        if (handleOpenFileShortcut(event)) return;

        if (!didWindowJustRegainFocus) {
          handleActivationKeys(event);
        }
      },
      { capture: true },
    );

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
        if (isTouchPointer && !isHoldingKeys() && !isActivated()) return;
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
        if (toolbarMenuPosition() !== null) return;

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
          document.documentElement.setPointerCapture(event.pointerId);
          event.preventDefault();
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
        openContextMenu(element, position);
      },
      { capture: true },
    );

    eventListenerManager.addWindowListener(
      "pointercancel",
      (event: PointerEvent) => {
        if (!event.isPrimary) return;
        cancelActiveDrag();
      },
    );

    eventListenerManager.addWindowListener(
      "click",
      (event: MouseEvent) => {
        if (isEventFromOverlay(event, "data-react-grab-ignore-events")) return;
        if (store.contextMenuPosition !== null) return;

        if (isRendererActive() || isCopying() || didJustDrag()) {
          event.preventDefault();
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
          storeActivationTimestamp !== null &&
          Date.now() - storeActivationTimestamp > BLUR_DEACTIVATION_THRESHOLD_MS
        ) {
          deactivateRenderer();
        }
      }
    });

    eventListenerManager.addWindowListener("blur", () => {
      cancelActiveDrag();
      if (isHoldingKeys()) {
        clearHoldTimer();
        actions.release();
        resetCopyConfirmation();
      }
    });

    eventListenerManager.addWindowListener("focus", () => {
      lastWindowFocusTimestamp = Date.now();
    });

    const redetectElementUnderPointer = () => {
      if (store.isTouchMode && !isHoldingKeys() && !isActivated()) return;
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
      clearAllCaches();
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

          viewportChangeFrameId = nativeRequestAnimationFrame(() => {
            viewportChangeFrameId = null;
            actions.incrementViewportVersion();
            actions.updateSessionBounds();
          });
        }, BOUNDS_RECALC_INTERVAL_MS);
      } else if (!shouldRunInterval && boundsRecalcIntervalId !== null) {
        window.clearInterval(boundsRecalcIntervalId);
        boundsRecalcIntervalId = null;
        if (viewportChangeFrameId !== null) {
          nativeCancelAnimationFrame(viewportChangeFrameId);
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
        nativeCancelAnimationFrame(viewportChangeFrameId);
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
      if (dragPreviewDebounceTimerId !== null) {
        window.clearTimeout(dragPreviewDebounceTimerId);
      }
      if (keydownSpamTimerId) window.clearTimeout(keydownSpamTimerId);
      if (toggleFeedbackTimerId) window.clearTimeout(toggleFeedbackTimerId);
      if (actionCycleIdleTimeoutId) {
        window.clearTimeout(actionCycleIdleTimeoutId);
      }
      if (dropdownTrackingFrameId !== null) {
        nativeCancelAnimationFrame(dropdownTrackingFrameId);
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

    const isThemeEnabled = createMemo(() => pluginRegistry.store.theme.enabled);
    const isSelectionBoxThemeEnabled = createMemo(
      () => pluginRegistry.store.theme.selectionBox.enabled,
    );
    const isElementLabelThemeEnabled = createMemo(
      () => pluginRegistry.store.theme.elementLabel.enabled,
    );
    const isDragBoxThemeEnabled = createMemo(
      () => pluginRegistry.store.theme.dragBox.enabled,
    );
    const isSelectionSuppressed = createMemo(
      () => didJustCopy() || (isToolbarSelectHovered() && !isToggleFrozen()),
    );
    const hasDragPreviewBounds = createMemo(
      () => dragPreviewBounds().length > 0,
    );

    const selectionVisible = createMemo(() => {
      if (!isThemeEnabled()) return false;
      if (!isSelectionBoxThemeEnabled()) return false;
      if (isSelectionSuppressed()) return false;
      if (hasDragPreviewBounds()) return true;
      return isSelectionElementVisible();
    });

    const selectionTagName = createMemo(() => {
      const element = selectionElement();
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

    const selectionLabelVisible = createMemo(() => {
      if (store.contextMenuPosition !== null) return false;
      if (!isElementLabelThemeEnabled()) return false;
      if (isSelectionSuppressed()) return false;

      return isSelectionElementVisible();
    });

    const labelInstanceCache = new Map<string, SelectionLabelInstance>();
    const computedLabelInstances = createMemo(() => {
      if (!isThemeEnabled()) return [];
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
      if (!isThemeEnabled()) return [];
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
        isThemeEnabled() &&
        isDragBoxThemeEnabled() &&
        isRendererActive() &&
        isDraggingBeyondThreshold(),
    );

    const labelVariant = createMemo(() =>
      isCopying() ? "processing" : "hover",
    );

    const labelVisible = createMemo(() => {
      if (!isThemeEnabled()) return false;
      const themeEnabled = isElementLabelThemeEnabled();
      const inPromptMode = isPromptMode();
      const copying = isCopying();
      const rendererActive = isRendererActive();
      const dragging = isDragging();
      const hasElement = Boolean(effectiveElement());
      const toolbarSelectHovered = isToolbarSelectHovered();
      const frozen = isToggleFrozen();

      if (!themeEnabled) return false;
      if (inPromptMode) return false;
      if (toolbarSelectHovered && !frozen) return false;
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
      async (element) => {
        if (!element) return null;
        const stack = await getStack(element);
        return resolveSourceFromStack(stack);
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
        const fallbackSelectionBounds = options?.fallbackSelectionBounds ?? [];
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
            {
              element,
              mouseX: labelPositionX,
              elements: hasMultipleElements ? elements : undefined,
              boundsMultiple: selectionBoundsForLabel,
            },
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

          actions.updateLabelInstance(
            labelInstanceId,
            didSucceed ? "copied" : "error",
            didSucceed ? undefined : errorMessage || "Unknown error",
          );

          scheduleLabelFade(labelInstanceId);
        } else {
          // HACK: Fire-and-forget when no label bounds to display feedback on
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

    // HACK: Defer hiding context menu until after click event propagates fully
    const deferHideContextMenu = () => {
      setTimeout(() => {
        actions.hideContextMenu();
      }, DEFERRED_EXECUTION_DELAY_MS);
    };

    interface BuildActionContextOptions {
      element: Element;
      filePath: string | undefined;
      lineNumber: number | undefined;
      tagName: string | undefined;
      componentName: string | undefined;
      position: { x: number; y: number };
      performWithFeedbackOptions?: PerformWithFeedbackOptions;
      shouldDeferHideContextMenu: boolean;
      onBeforeCopy?: () => void;
      onBeforePrompt?: () => void;
      customEnterPromptMode?: (agent?: AgentOptions) => void;
    }

    const buildActionContext = (
      options: BuildActionContextOptions,
    ): ContextMenuActionContext => {
      const {
        element,
        filePath,
        lineNumber,
        tagName,
        componentName,
        position,
        performWithFeedbackOptions,
        shouldDeferHideContextMenu,
        onBeforeCopy,
        onBeforePrompt,
        customEnterPromptMode,
      } = options;

      const elements =
        store.frozenElements.length > 0 ? store.frozenElements : [element];

      const hideContextMenuAction = shouldDeferHideContextMenu
        ? deferHideContextMenu
        : actions.hideContextMenu;

      const copyAction = () => {
        onBeforeCopy?.();
        performCopyWithLabel({
          element,
          positionX: position.x,
          elements: elements.length > 1 ? elements : undefined,
          shouldDeactivateAfter: store.wasActivatedByToggle,
        });
        hideContextMenuAction();
      };

      const defaultEnterPromptMode = (agent?: AgentOptions) => {
        if (agent) {
          actions.setSelectedAgent(agent);
        }
        actions.clearLabelInstances();
        onBeforePrompt?.();
        preparePromptMode(element, position.x, position.y);
        actions.setPointer({ x: position.x, y: position.y });
        actions.setFrozenElement(element);
        activatePromptMode();
        if (!isActivated()) {
          activateRenderer();
        }
        hideContextMenuAction();
      };

      const context: ContextMenuActionContext = {
        element,
        elements,
        filePath,
        lineNumber,
        componentName,
        tagName,
        enterPromptMode: customEnterPromptMode ?? defaultEnterPromptMode,
        copy: copyAction,
        hooks: {
          transformHtmlContent: pluginRegistry.hooks.transformHtmlContent,
          onOpenFile: pluginRegistry.hooks.onOpenFile,
          transformOpenFileUrl: pluginRegistry.hooks.transformOpenFileUrl,
        },
        performWithFeedback: createPerformWithFeedback(
          element,
          elements,
          tagName,
          componentName,
          performWithFeedbackOptions,
        ),
        hideContextMenu: hideContextMenuAction,
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

    const contextMenuActionContext = createMemo(
      (): ContextMenuActionContext | undefined => {
        const element = store.contextMenuElement;
        if (!element) return undefined;
        const fileInfo = contextMenuFilePath();
        const position = store.contextMenuPosition ?? store.pointer;

        return buildActionContext({
          element,
          filePath: fileInfo?.filePath,
          lineNumber: fileInfo?.lineNumber,
          tagName: contextMenuTagName(),
          componentName: contextMenuComponentName(),
          position,
          shouldDeferHideContextMenu: true,
          onBeforeCopy: () => {
            keyboardSelectedElement = null;
          },
          customEnterPromptMode: (agent?: AgentOptions) => {
            if (agent) {
              actions.setSelectedAgent(agent);
            }
            actions.clearLabelInstances();
            actions.clearInputText();
            actions.enterPromptMode(position, element);
            deferHideContextMenu();
          },
        });
      },
    );

    const handleContextMenuDismiss = () => {
      setTimeout(() => {
        actions.hideContextMenu();
        deactivateRenderer();
      }, DEFERRED_EXECUTION_DELAY_MS);
    };

    const clearHistoryHoverPreviews = () => {
      for (const { boxId, labelId } of historyHoverPreviews) {
        actions.removeGrabbedBox(boxId);
        if (labelId) {
          actions.removeLabelInstance(labelId);
        }
      }
      historyHoverPreviews = [];
    };

    const addHistoryItemPreview = (
      item: HistoryItem,
      previewBounds: OverlayBounds[],
      previewElements: Element[],
      idPrefix: string,
    ) => {
      if (previewBounds.length === 0) return;

      const hasCommentText = item.isComment && item.commentText;
      for (const [index, bounds] of previewBounds.entries()) {
        const previewElement = previewElements[index];
        const boxId = `${idPrefix}-${item.id}-${index}`;
        // HACK: createdAt=0 is falsy, which skips the auto-fade logic in the overlay canvas animation loop
        actions.addGrabbedBox({
          id: boxId,
          bounds,
          createdAt: 0,
          element: previewElement,
        });

        let labelId: string | null = null;
        if (index === 0) {
          labelId = `${idPrefix}-label-${item.id}`;
          actions.addLabelInstance({
            id: labelId,
            bounds,
            tagName: item.tagName,
            componentName: item.componentName,
            elementsCount: item.elementsCount,
            status: "idle",
            isPromptMode: Boolean(hasCommentText),
            inputValue: hasCommentText ? item.commentText : undefined,
            createdAt: 0,
            element: previewElement,
            mouseX: bounds.x + bounds.width / 2,
          });
        }

        historyHoverPreviews.push({ boxId, labelId });
      }
    };

    const showHistoryItemPreview = (
      item: HistoryItem,
      idPrefix: string,
    ): void => {
      const connectedElements = getConnectedHistoryElements(item);
      const previewBounds = connectedElements.map((element) =>
        createElementBounds(element),
      );
      addHistoryItemPreview(item, previewBounds, connectedElements, idPrefix);
    };

    const stopTrackingDropdownPosition = () => {
      if (dropdownTrackingFrameId !== null) {
        nativeCancelAnimationFrame(dropdownTrackingFrameId);
        dropdownTrackingFrameId = null;
      }
    };

    const startTrackingDropdownPosition = (computePosition: () => void) => {
      stopTrackingDropdownPosition();
      const updatePosition = () => {
        computePosition();
        dropdownTrackingFrameId = nativeRequestAnimationFrame(updatePosition);
      };
      updatePosition();
    };

    const getNearestEdge = (rect: DOMRect): ToolbarState["edge"] => {
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const distanceToTop = centerY;
      const distanceToBottom = window.innerHeight - centerY;
      const distanceToLeft = centerX;
      const distanceToRight = window.innerWidth - centerX;
      const minimumDistance = Math.min(
        distanceToTop,
        distanceToBottom,
        distanceToLeft,
        distanceToRight,
      );
      if (minimumDistance === distanceToTop) return "top";
      if (minimumDistance === distanceToLeft) return "left";
      if (minimumDistance === distanceToRight) return "right";
      return "bottom";
    };

    const computeDropdownAnchor = (): DropdownAnchor | null => {
      if (!toolbarElement) return null;
      const toolbarRect = toolbarElement.getBoundingClientRect();
      const edge = getNearestEdge(toolbarRect);

      if (edge === "left" || edge === "right") {
        return {
          x: edge === "left" ? toolbarRect.right : toolbarRect.left,
          y: toolbarRect.top + toolbarRect.height / 2,
          edge,
          toolbarWidth: toolbarRect.width,
        };
      }

      return {
        x: toolbarRect.left + toolbarRect.width / 2,
        y: edge === "top" ? toolbarRect.bottom : toolbarRect.top,
        edge,
        toolbarWidth: toolbarRect.width,
      };
    };

    const dismissHistoryDropdown = () => {
      cancelHistoryHoverOpenTimeout();
      cancelHistoryHoverCloseTimeout();
      stopTrackingDropdownPosition();
      clearHistoryHoverPreviews();
      setHistoryDropdownPosition(null);
      setIsHistoryHoverOpen(false);
    };

    const openHistoryDropdown = () => {
      actions.hideContextMenu();
      dismissToolbarMenu();
      dismissClearPrompt();
      setHistoryItems(loadHistory());
      setHasUnreadHistoryItems(false);
      startTrackingDropdownPosition(() => {
        const anchor = computeDropdownAnchor();
        if (anchor) setHistoryDropdownPosition(anchor);
      });
    };

    let historyHoverOpenTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let historyHoverCloseTimeoutId: ReturnType<typeof setTimeout> | null = null;

    const cancelHistoryHoverOpenTimeout = () => {
      if (historyHoverOpenTimeoutId !== null) {
        clearTimeout(historyHoverOpenTimeoutId);
        historyHoverOpenTimeoutId = null;
      }
    };

    const cancelHistoryHoverCloseTimeout = () => {
      if (historyHoverCloseTimeoutId !== null) {
        clearTimeout(historyHoverCloseTimeoutId);
        historyHoverCloseTimeoutId = null;
      }
    };

    const dismissToolbarMenu = () => {
      stopTrackingDropdownPosition();
      setToolbarMenuPosition(null);
    };

    const showClearPrompt = () => {
      dismissHistoryDropdown();
      dismissToolbarMenu();
      startTrackingDropdownPosition(() => {
        const anchor = computeDropdownAnchor();
        if (anchor) setClearPromptPosition(anchor);
      });
    };

    const dismissClearPrompt = () => {
      stopTrackingDropdownPosition();
      setClearPromptPosition(null);
    };

    const dismissAllPopups = () => {
      dismissHistoryDropdown();
      dismissToolbarMenu();
      dismissClearPrompt();
    };

    const handleToggleMenu = () => {
      if (toolbarMenuPosition() !== null) {
        dismissToolbarMenu();
      } else {
        actions.hideContextMenu();
        dismissHistoryDropdown();
        dismissClearPrompt();
        startTrackingDropdownPosition(() => {
          const anchor = computeDropdownAnchor();
          if (anchor) setToolbarMenuPosition(anchor);
        });
      }
    };

    const handleToggleHistory = () => {
      cancelHistoryHoverOpenTimeout();
      cancelHistoryHoverCloseTimeout();
      const isCurrentlyOpen = historyDropdownPosition() !== null;
      if (isCurrentlyOpen) {
        if (isHistoryHoverOpen()) {
          clearHistoryHoverPreviews();
          setIsHistoryHoverOpen(false);
        } else {
          dismissHistoryDropdown();
        }
      } else {
        clearHistoryHoverPreviews();
        openHistoryDropdown();
      }
    };

    const copyHistoryItemContent = (item: HistoryItem) => {
      copyContent(item.content, {
        tagName: item.tagName,
        componentName: item.componentName ?? item.elementName,
        commentText: item.commentText,
      });
      const element = getFirstConnectedHistoryElement(item);
      if (!element) return;

      actions.clearLabelInstances();

      // HACK: defer to next frame so idle preview label clears visually before "copied" appears
      nativeRequestAnimationFrame(() => {
        if (!isElementConnected(element)) return;
        const bounds = createElementBounds(element);
        const instanceId = createLabelInstance(
          bounds,
          item.tagName,
          item.componentName,
          "copied",
          { element, mouseX: bounds.x + bounds.width / 2 },
        );
        scheduleLabelFade(instanceId);
      });
    };

    const handleHistoryItemSelect = (item: HistoryItem) => {
      clearHistoryHoverPreviews();
      if (isPromptMode()) {
        actions.exitPromptMode();
        actions.clearInputText();
      }
      const element = getFirstConnectedHistoryElement(item);

      if (item.isComment && item.commentText && element) {
        const bounds = createElementBounds(element);
        const centerX = bounds.x + bounds.width / 2;
        const centerY = bounds.y + bounds.height / 2;
        actions.enterPromptMode({ x: centerX, y: centerY }, element);
        actions.setInputText(item.commentText);
      } else {
        copyHistoryItemContent(item);
      }
    };

    const handleHistoryItemRemove = (item: HistoryItem) => {
      clearHistoryHoverPreviews();
      historyElementMap.delete(item.id);
      const updatedHistoryItems = removeHistoryItem(item.id);
      setHistoryItems(updatedHistoryItems);
      if (updatedHistoryItems.length === 0) {
        setHasUnreadHistoryItems(false);
        dismissHistoryDropdown();
      }
    };

    const handleHistoryCopyAll = () => {
      clearHistoryHoverPreviews();
      const currentHistoryItems = historyItems();
      if (currentHistoryItems.length === 0) return;

      const combinedContent = joinSnippets(
        currentHistoryItems.map((historyItem) => historyItem.content),
      );

      const firstItem = currentHistoryItems[0];
      copyContent(combinedContent, {
        componentName: firstItem.componentName ?? firstItem.tagName,
        entries: currentHistoryItems.map((historyItem) => ({
          tagName: historyItem.tagName,
          componentName: historyItem.componentName ?? historyItem.elementName,
          content: historyItem.content,
          commentText: historyItem.commentText,
        })),
      });

      showClearPrompt();

      actions.clearLabelInstances();

      // HACK: defer to next frame so idle preview labels clear visually before "copied" appears
      nativeRequestAnimationFrame(() => {
        batch(() => {
          for (const historyItem of currentHistoryItems) {
            const connectedElements = getConnectedHistoryElements(historyItem);
            for (const element of connectedElements) {
              const bounds = createElementBounds(element);
              const labelId = `label-${Date.now()}-${Math.random().toString(36).slice(2)}`;

              actions.addLabelInstance({
                id: labelId,
                bounds,
                tagName: historyItem.tagName,
                componentName: historyItem.componentName,
                status: "copied",
                createdAt: Date.now(),
                element,
                mouseX: bounds.x + bounds.width / 2,
              });
              scheduleLabelFade(labelId);
            }
          }
        });
      });
    };

    const handleHistoryItemHover = (historyItemId: string | null) => {
      clearHistoryHoverPreviews();
      if (!historyItemId) return;

      const item = historyItems().find(
        (innerItem) => innerItem.id === historyItemId,
      );
      if (!item) return;
      showHistoryItemPreview(item, "history-hover");
    };

    const handleHistoryButtonHover = (isHovered: boolean) => {
      cancelHistoryHoverOpenTimeout();
      clearHistoryHoverPreviews();
      if (isHovered) {
        cancelHistoryHoverCloseTimeout();
        if (
          historyDropdownPosition() === null &&
          clearPromptPosition() === null
        ) {
          showAllHistoryItemPreviews();
          historyHoverOpenTimeoutId = setTimeout(() => {
            historyHoverOpenTimeoutId = null;
            setIsHistoryHoverOpen(true);
            openHistoryDropdown();
          }, DROPDOWN_HOVER_OPEN_DELAY_MS);
        }
      } else if (isHistoryHoverOpen()) {
        historyHoverCloseTimeoutId = setTimeout(() => {
          historyHoverCloseTimeoutId = null;
          dismissHistoryDropdown();
        }, DROPDOWN_HOVER_OPEN_DELAY_MS);
      }
    };

    const handleHistoryDropdownHover = (isHovered: boolean) => {
      if (isHovered) {
        cancelHistoryHoverCloseTimeout();
      } else if (isHistoryHoverOpen()) {
        historyHoverCloseTimeoutId = setTimeout(() => {
          historyHoverCloseTimeoutId = null;
          dismissHistoryDropdown();
        }, DROPDOWN_HOVER_OPEN_DELAY_MS);
      }
    };

    const handleHistoryCopyAllHover = (isHovered: boolean) => {
      clearHistoryHoverPreviews();
      if (isHovered) {
        cancelHistoryHoverCloseTimeout();
        showAllHistoryItemPreviews();
      } else if (isHistoryHoverOpen()) {
        historyHoverCloseTimeoutId = setTimeout(() => {
          historyHoverCloseTimeoutId = null;
          dismissHistoryDropdown();
        }, DROPDOWN_HOVER_OPEN_DELAY_MS);
      }
    };

    const showAllHistoryItemPreviews = () => {
      for (const item of historyItems()) {
        showHistoryItemPreview(item, "history-all-hover");
      }
    };

    const handleHistoryClear = () => {
      historyElementMap.clear();
      const updatedHistoryItems = clearHistory();
      setHistoryItems(updatedHistoryItems);
      setHasUnreadHistoryItems(false);
      dismissHistoryDropdown();
    };

    const handleShowContextMenuSession = (sessionId: string) => {
      const session = agentManager.sessions().get(sessionId);
      if (!session) return;

      const element = agentManager.session.getElement(sessionId);
      if (!element) return;
      if (!isElementConnected(element)) return;

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
      }, DEFERRED_EXECUTION_DELAY_MS);
    };

    const handleShowContextMenuInstance = (instanceId: string) => {
      const instance = store.labelInstances.find(
        (labelInstance) => labelInstance.id === instanceId,
      );
      if (!instance?.element) return;
      if (!isElementConnected(instance.element)) return;

      const elementBounds = createElementBounds(instance.element);
      const position = {
        x: instance.mouseX ?? elementBounds.x + elementBounds.width / 2,
        y: elementBounds.y + elementBounds.height / 2,
      };

      const elementsToFreeze =
        instance.elements && instance.elements.length > 0
          ? instance.elements.filter((element) => isElementConnected(element))
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
      }, DEFERRED_EXECUTION_DELAY_MS);
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
            selectionComponentName={resolvedComponentName()}
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
            onInputChange={actions.setInputText}
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
            enabled={isEnabled()}
            onToggleEnabled={handleToggleEnabled}
            shakeCount={toolbarShakeCount()}
            onToolbarStateChange={(state) => {
              setCurrentToolbarState(state);
              toolbarStateChangeCallbacks.forEach((callback) =>
                callback(state),
              );
            }}
            onSubscribeToToolbarStateChanges={(callback) => {
              toolbarStateChangeCallbacks.add(callback);
              return () => {
                toolbarStateChangeCallbacks.delete(callback);
              };
            }}
            onToolbarSelectHoverChange={setIsToolbarSelectHovered}
            onToolbarRef={(element) => {
              toolbarElement = element;
            }}
            contextMenuPosition={contextMenuPosition()}
            contextMenuBounds={contextMenuBounds()}
            contextMenuTagName={contextMenuTagName()}
            contextMenuComponentName={contextMenuComponentName()}
            contextMenuHasFilePath={Boolean(contextMenuFilePath()?.filePath)}
            actions={pluginRegistry.store.actions}
            toolbarActions={pluginRegistry.store.toolbarActions}
            actionContext={contextMenuActionContext()}
            onContextMenuDismiss={handleContextMenuDismiss}
            onContextMenuHide={deferHideContextMenu}
            historyItems={historyItems()}
            historyDisconnectedItemIds={historyDisconnectedItemIds()}
            historyItemCount={historyItems().length}
            clockFlashTrigger={clockFlashTrigger()}
            hasUnreadHistoryItems={hasUnreadHistoryItems()}
            historyDropdownPosition={historyDropdownPosition()}
            isHistoryPinned={
              historyDropdownPosition() !== null && !isHistoryHoverOpen()
            }
            onToggleHistory={handleToggleHistory}
            onCopyAll={handleHistoryCopyAll}
            onCopyAllHover={handleHistoryCopyAllHover}
            onHistoryButtonHover={handleHistoryButtonHover}
            onHistoryItemSelect={handleHistoryItemSelect}
            onHistoryItemRemove={handleHistoryItemRemove}
            onHistoryItemCopy={copyHistoryItemContent}
            onHistoryItemHover={handleHistoryItemHover}
            onHistoryCopyAll={handleHistoryCopyAll}
            onHistoryCopyAllHover={handleHistoryCopyAllHover}
            onHistoryClear={handleHistoryClear}
            onHistoryDismiss={dismissHistoryDropdown}
            onHistoryDropdownHover={handleHistoryDropdownHover}
            toolbarMenuPosition={toolbarMenuPosition()}
            onToggleMenu={handleToggleMenu}
            onToolbarMenuDismiss={dismissToolbarMenu}
            clearPromptPosition={clearPromptPosition()}
            onClearHistoryConfirm={() => {
              dismissClearPrompt();
              handleHistoryClear();
            }}
            onClearHistoryCancel={dismissClearPrompt}
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
        actions.setPendingCommentMode(false);
        if (!isActivated() && isEnabled()) {
          toggleActivate();
        }
      },
      deactivate: () => {
        if (isActivated() || isCopying()) {
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
      comment: handleComment,
      isActive: () => isActivated(),
      isEnabled: () => isEnabled(),
      setEnabled: (enabled: boolean) => {
        if (enabled === isEnabled()) return;
        setIsEnabled(enabled);
        if (!enabled) {
          forceDeactivateAll();
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
        toolbarStateChangeCallbacks.forEach((callback) => callback(newState));
      },
      onToolbarStateChange: (callback: (state: ToolbarState) => void) => {
        toolbarStateChangeCallbacks.add(callback);
        return () => {
          toolbarStateChangeCallbacks.delete(callback);
        };
      },
      dispose: () => {
        hasInited = false;
        cancelHistoryHoverOpenTimeout();
        cancelHistoryHoverCloseTimeout();
        stopTrackingDropdownPosition();
        toolbarStateChangeCallbacks.clear();
        dispose();
      },
      copyElement: copyElementAPI,
      getSource: async (element: Element): Promise<SourceInfo | null> => {
        const stack = await getStack(element);
        const source = resolveSourceFromStack(stack);
        if (!source) return null;
        return {
          filePath: source.filePath,
          lineNumber: source.lineNumber ?? null,
          componentName: source.componentName,
        };
      },
      getStackContext,
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
        labelInstances: store.labelInstances.map((instance) => ({
          id: instance.id,
          status: instance.status,
          tagName: instance.tagName,
          componentName: instance.componentName,
          createdAt: instance.createdAt,
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

    // HACK: Force revalidation of Next.js project detection
    // since it's cached in the browser and not updated when the project is changed
    setTimeout(() => {
      checkIsNextProject(true);
    }, NEXTJS_REVALIDATION_DELAY_MS);

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
