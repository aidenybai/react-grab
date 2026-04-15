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
import {
  getStackContext,
  getNearestComponentName,
  getComponentDisplayName,
  checkIsNextProject,
  resolveSource,
} from "./context.js";
import { createNoopApi } from "./noop-api.js";
import { createEventListenerManager } from "./events.js";
import { tryCopyWithFallback } from "./copy.js";
import { getElementAtPosition, getElementsAtPoint } from "../utils/get-element-at-position.js";
import { isValidGrabbableElement } from "../utils/is-valid-grabbable-element.js";
import { isRootElement } from "../utils/is-root-element.js";
import { isElementConnected } from "../utils/is-element-connected.js";
import { getElementsInDrag } from "../utils/get-elements-in-drag.js";
import { getAncestorElements } from "../utils/get-ancestor-elements.js";
import { createElementBounds } from "../utils/create-element-bounds.js";
import { createElementSelector } from "../utils/create-element-selector.js";
import { getVisibleBoundsCenter } from "../utils/get-visible-bounds-center.js";
import { invalidateInteractionCaches } from "../utils/invalidate-interaction-caches.js";
import { normalizeErrorMessage } from "../utils/normalize-error.js";
import { resolveSingleClickSelection } from "../utils/resolve-single-click-selection.js";
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
  MODIFIER_KEYS,
  BLUR_DEACTIVATION_THRESHOLD_MS,
  BOUNDS_RECALC_INTERVAL_MS,
  INPUT_FOCUS_ACTIVATION_DELAY_MS,
  INPUT_TEXT_SELECTION_ACTIVATION_DELAY_MS,
  DEFAULT_KEY_HOLD_DURATION_MS,
  DEFAULT_MAX_CONTEXT_LINES,
  MIN_HOLD_FOR_ACTIVATION_AFTER_COPY_MS,
  ZOOM_DETECTION_THRESHOLD,
  ACTION_CYCLE_IDLE_TRIGGER_MS,
  WINDOW_REFOCUS_GRACE_PERIOD_MS,
  DROPDOWN_HOVER_OPEN_DELAY_MS,
  PREVIEW_TEXT_MAX_LENGTH,
  NEXTJS_REVALIDATION_DELAY_MS,
  TOOLBAR_DEFAULT_POSITION_RATIO,
  DEFAULT_ACTION_ID,
} from "../constants.js";
import { getBoundsCenter } from "../utils/get-bounds-center.js";
import { hideFromThirdParties } from "../utils/hide-from-third-parties.js";
import { detectCspNonce } from "../utils/detect-csp-nonce.js";
import { isCLikeKey } from "../utils/is-c-like-key.js";
import { isTargetKeyCombination } from "../utils/is-target-key-combination.js";
import {
  parseActivationKey,
  getModifiersFromActivationKey,
} from "../utils/parse-activation-key.js";
import { keyMatchesCode } from "../utils/key-matches-code.js";
import { isEventFromOverlay } from "../utils/is-event-from-overlay.js";
import { openFile } from "../utils/open-file.js";
import { combineBounds } from "../utils/combine-bounds.js";
import { resolveActionEnabled } from "../utils/resolve-action-enabled.js";
import type {
  Position,
  Options,
  OverlayBounds,
  GrabbedBox,
  ReactGrabAPI,
  ReactGrabState,
  SelectionLabelInstance,
  ContextMenuActionContext,
  ContextMenuAction,
  ActionCycleItem,
  ActionCycleState,
  ArrowNavigationState,
  PerformWithFeedbackOptions,
  SettableOptions,
  SourceInfo,
  Plugin,
  ToolbarState,
  CommentItem,
  DropdownAnchor,
} from "../types.js";
import { DEFAULT_THEME } from "./theme.js";
import { createPluginRegistry } from "./plugin-registry.js";
import { createArrowNavigator } from "./arrow-navigation.js";
import { getRequiredModifiers, setupKeyboardEventClaimer } from "./keyboard-handlers.js";
import { createAutoScroller, getAutoScrollDirection } from "./auto-scroll.js";
import { logIntro } from "./log-intro.js";
import { getScriptOptions } from "../utils/get-script-options.js";
import { isEnterCode } from "../utils/is-enter-code.js";
import { isMac } from "../utils/is-mac.js";
import { loadToolbarState, saveToolbarState } from "../components/toolbar/state.js";
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
import { freezePseudoStates, unfreezePseudoStates } from "../utils/freeze-pseudo-states.js";
import { freezeUpdates } from "../utils/freeze-updates.js";
import {
  loadComments,
  addCommentItem,
  removeCommentItem,
  clearComments,
  isClearConfirmed,
  confirmClear,
} from "../utils/comment-storage.js";
import { copyContent } from "../utils/copy-content.js";
import { joinSnippets } from "../utils/join-snippets.js";
import { generateId } from "../utils/generate-id.js";
import { logRecoverableError } from "../utils/log-recoverable-error.js";
import { lockViewportZoom } from "../utils/lock-viewport-zoom.js";
import { getNearestEdge } from "../utils/get-nearest-edge.js";

const builtInPlugins = [copyPlugin, commentPlugin, copyHtmlPlugin, copyStylesPlugin, openPlugin];

interface CopyWithLabelOptions {
  element: Element;
  cursorX: number;
  selectedElements?: Element[];
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

interface BuildActionContextOptions {
  element: Element;
  filePath: string | undefined;
  lineNumber: number | undefined;
  tagName: string | undefined;
  componentName: string | undefined;
  position: Position;
  performWithFeedbackOptions?: PerformWithFeedbackOptions;
  shouldDeferHideContextMenu: boolean;
  onBeforeCopy?: () => void;
  onBeforePrompt?: () => void;
  customEnterPromptMode?: () => void;
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
    maxContextLines: DEFAULT_MAX_CONTEXT_LINES,
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
    let disposed = false;
    let disposeRenderer: (() => void) | undefined;

    const pluginRegistry = createPluginRegistry(settableOptions);

    const { store, actions } = createGrabStore({
      theme: DEFAULT_THEME,
      keyHoldDuration: pluginRegistry.store.options.keyHoldDuration ?? DEFAULT_KEY_HOLD_DURATION_MS,
    });

    const isHoldingKeys = createMemo(() => store.current.state === "holding");
    const isActivated = createMemo(() => store.current.state === "active");
    const isFrozenPhase = createMemo(
      () => store.current.state === "active" && store.current.phase === "frozen",
    );
    const isDragging = createMemo(
      () =>
        store.current.state === "active" &&
        (store.current.phase === "dragging-select" ||
          store.current.phase === "dragging-reposition"),
    );
    const isDragRepositioning = createMemo(
      () => store.current.state === "active" && store.current.phase === "dragging-reposition",
    );
    const didJustDrag = createMemo(
      () => store.current.state === "active" && store.current.phase === "justDragged",
    );
    const isCopying = createMemo(() => store.current.state === "copying");
    const didJustCopy = createMemo(() => store.current.state === "justCopied");
    const isPromptMode = createMemo(
      () => store.current.state === "active" && Boolean(store.current.isPromptMode),
    );
    const isCommentMode = createMemo(() => store.pendingCommentMode || isPromptMode());
    const isPendingDismiss = createMemo(
      () =>
        store.current.state === "active" &&
        Boolean(store.current.isPromptMode) &&
        Boolean(store.current.isPendingDismiss),
    );

    let unlockViewportZoom: (() => void) | null = null;

    createEffect(
      on(isActivated, (activated, previousActivated) => {
        if (activated && !previousActivated) {
          freezePseudoStates(store.pointer.x, store.pointer.y);
          freezeGlobalAnimations();
          document.body.style.touchAction = "none";
          // iOS Safari auto-zooms on focused inputs with font-size < 16px,
          // which would disrupt the overlay positioning.
          unlockViewportZoom = lockViewportZoom();
        } else if (!activated && previousActivated) {
          unfreezePseudoStates();
          unfreezeGlobalAnimations();
          document.body.style.touchAction = "";
          unlockViewportZoom?.();
          unlockViewportZoom = null;
        }
      }),
    );

    const savedToolbarState = loadToolbarState();
    const [isEnabled, setIsEnabled] = createSignal(
      savedToolbarState ? !savedToolbarState.collapsed : true,
    );
    const [toolbarShakeCount, setToolbarShakeCount] = createSignal(0);
    const [selectionLabelShakeCount, setSelectionLabelShakeCount] = createSignal(0);
    const [currentToolbarState, setCurrentToolbarState] = createSignal<ToolbarState | null>(
      savedToolbarState,
    );
    const [isToolbarSelectHovered, setIsToolbarSelectHovered] = createSignal(false);
    const [commentItems, setCommentItems] = createSignal<CommentItem[]>(loadComments());
    const [commentsDropdownPosition, setCommentsDropdownPosition] =
      createSignal<DropdownAnchor | null>(null);
    const [toolbarMenuPosition, setToolbarMenuPosition] = createSignal<DropdownAnchor | null>(null);
    const [clearPromptPosition, setClearPromptPosition] = createSignal<DropdownAnchor | null>(null);
    let toolbarElement: HTMLDivElement | undefined;
    let dropdownTrackingFrameId: number | null = null;
    const commentElementMap = new Map<string, Element[]>();
    const [clockFlashTrigger, setClockFlashTrigger] = createSignal(0);
    const [isCommentsHoverOpen, setIsCommentsHoverOpen] = createSignal(false);
    let commentsHoverPreviews: { boxId: string; labelId: string | null }[] = [];

    const updateToolbarState = (updates: Partial<ToolbarState>) => {
      const currentState = currentToolbarState() ?? loadToolbarState();
      const newState: ToolbarState = {
        edge: currentState?.edge ?? "bottom",
        ratio: currentState?.ratio ?? TOOLBAR_DEFAULT_POSITION_RATIO,
        collapsed: currentState?.collapsed ?? false,
        enabled: currentState?.enabled ?? true,
        defaultAction: currentState?.defaultAction ?? DEFAULT_ACTION_ID,
        ...updates,
      };
      saveToolbarState(newState);
      setCurrentToolbarState(newState);
      for (const callback of toolbarStateChangeCallbacks) {
        callback(newState);
      }
    };

    const getMappedCommentElements = (commentItemId: string): Element[] =>
      commentElementMap.get(commentItemId) ?? [];

    const reacquireCommentElements = (commentItem: CommentItem): Element[] => {
      const selectors = commentItem.elementSelectors ?? [];
      if (selectors.length === 0) return [];

      const reacquiredElements: Element[] = [];
      for (const selector of selectors) {
        if (!selector) continue;
        try {
          const reacquiredElement = document.querySelector(selector);
          if (isElementConnected(reacquiredElement)) {
            reacquiredElements.push(reacquiredElement);
          }
        } catch (error) {
          logRecoverableError("Invalid stored selector", error);
        }
      }
      return reacquiredElements;
    };

    const getConnectedCommentElements = (commentItem: CommentItem): Element[] => {
      const mappedElements = getMappedCommentElements(commentItem.id);
      const connectedMappedElements = mappedElements.filter((mappedElement) =>
        isElementConnected(mappedElement),
      );
      const areAllMappedElementsConnected =
        mappedElements.length > 0 && connectedMappedElements.length === mappedElements.length;

      if (areAllMappedElementsConnected) {
        return connectedMappedElements;
      }

      const reacquiredElements = reacquireCommentElements(commentItem);
      if (reacquiredElements.length > 0) {
        commentElementMap.set(commentItem.id, reacquiredElements);
        return reacquiredElements;
      }

      return connectedMappedElements;
    };

    const getFirstConnectedCommentElement = (commentItem: CommentItem): Element | undefined =>
      getConnectedCommentElements(commentItem)[0];

    const commentsDisconnectedItemIds = createMemo(
      () => {
        void commentsDropdownPosition();
        const disconnectedIds = new Set<string>();
        for (const item of commentItems()) {
          if (getConnectedCommentElements(item).length === 0) {
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

    const clearHoldTimer = () => {
      if (activationHoldState.timerId !== null) {
        clearTimeout(activationHoldState.timerId);
        activationHoldState.timerId = null;
      }
    };

    const resetCopyConfirmation = () => {
      activationHoldState.copyWaiting = false;
      activationHoldState.holdTimerFired = false;
      activationHoldState.startTimestamp = null;
    };

    // The hold timer does not call activate when copyWaiting is true (the user
    // held the activation key and pressed Ctrl+C). Instead it sets holdTimerFired
    // so the keyup handler can activate after the clipboard operation finishes.
    createEffect(() => {
      if (store.current.state !== "holding") {
        clearHoldTimer();
        return;
      }
      activationHoldState.startTimestamp = Date.now();
      activationHoldState.timerId = window.setTimeout(() => {
        activationHoldState.timerId = null;
        if (activationHoldState.copyWaiting) {
          activationHoldState.holdTimerFired = true;
          return;
        }
        actions.activate();
      }, store.keyHoldDuration);
      onCleanup(clearHoldTimer);
    });

    createEffect(() => {
      if (store.current.state !== "active" || store.current.phase !== "justDragged") return;
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

    const preparePromptMode = (element: Element, positionX: number, positionY: number) => {
      setCopyStartPosition(element, positionX, positionY);
      actions.clearInputText();
    };

    const activatePromptMode = () => {
      const element = store.frozenElement || targetElement();
      if (element) {
        actions.enterPromptMode({ x: store.pointer.x, y: store.pointer.y }, element);
      }
    };

    const setCopyStartPosition = (element: Element, positionX: number, positionY: number) => {
      actions.setCopyStart({ x: positionX, y: positionY }, element);
    };

    const elementDetectionState = {
      lastDetectionTimestamp: 0,
      pendingDetectionScheduledAt: 0,
      latestPointerX: 0,
      latestPointerY: 0,
    };
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
    const activationHoldState = {
      timerId: null as number | null,
      startTimestamp: null as number | null,
      copyWaiting: false,
      holdTimerFired: false,
    };
    let previousSpaceDragPointerPage: Position | null = null;
    const [isInspectMode, setIsInspectMode] = createSignal(false);
    let lastWindowFocusTimestamp = 0;
    let isCopyFeedbackCooldownActive = false;
    let copyFeedbackCooldownTimerId: number | null = null;

    const startCopyFeedbackCooldown = () => {
      isCopyFeedbackCooldownActive = true;
      if (copyFeedbackCooldownTimerId !== null) {
        window.clearTimeout(copyFeedbackCooldownTimerId);
      }
      copyFeedbackCooldownTimerId = window.setTimeout(() => {
        isCopyFeedbackCooldownActive = false;
        copyFeedbackCooldownTimerId = null;
      }, FEEDBACK_DURATION_MS);
    };

    const clearCopyFeedbackCooldown = () => {
      if (copyFeedbackCooldownTimerId !== null) {
        window.clearTimeout(copyFeedbackCooldownTimerId);
        copyFeedbackCooldownTimerId = null;
      }
      isCopyFeedbackCooldownActive = false;
    };
    let actionCycleIdleTimeoutId: number | null = null;
    let selectionSourceRequestVersion = 0;
    let componentNameRequestVersion = 0;
    let componentNameDebounceTimerId: number | null = null;
    let keyboardSelectedElement: Element | null = null;
    let isPendingContextMenuSelect = false;
    let pendingDefaultActionId: string | null = null;
    const [debouncedElementForComponentName, setDebouncedElementForComponentName] =
      createSignal<Element | null>(null);
    const [resolvedComponentName, setResolvedComponentName] = createSignal<string | undefined>(
      undefined,
    );
    const [actionCycleItems, setActionCycleItems] = createSignal<ActionCycleItem[]>([]);
    const [actionCycleActiveIndex, setActionCycleActiveIndex] = createSignal<number | null>(null);

    const [arrowNavigationElements, setArrowNavigationElements] = createSignal<Element[]>([]);
    const [arrowNavigationActiveIndex, setArrowNavigationActiveIndex] = createSignal(0);

    const arrowNavigator = createArrowNavigator(isValidGrabbableElement, createElementBounds);

    const autoScroller = createAutoScroller(
      () => store.pointer,
      () => isDragging(),
      (scrollDelta) => {
        if (isDragRepositioning()) {
          actions.shiftDragStart(scrollDelta);
          if (previousSpaceDragPointerPage) {
            previousSpaceDragPointerPage = {
              x: previousSpaceDragPointerPage.x + scrollDelta.x,
              y: previousSpaceDragPointerPage.y + scrollDelta.y,
            };
            return;
          }
          const { pageX, pageY } = toPageCoordinates(store.pointer.x, store.pointer.y);
          previousSpaceDragPointerPage = { x: pageX, y: pageY };
        }
      },
    );

    const isRendererActive = createMemo(() => isActivated() && !isCopying());

    const grabbedBoxTimeouts = new Map<string, number>();

    const showTemporaryGrabbedBox = (bounds: OverlayBounds, element: Element) => {
      const boxId = generateId("grabbed");
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

    const notifyElementsSelected = async (elements: Element[]): Promise<void> => {
      const elementsPayload = await Promise.all(
        elements.map(async (element) => {
          const source = await resolveSource(element);
          let componentName = source?.componentName ?? null;
          const filePath = source?.filePath;
          const lineNumber = source?.lineNumber ?? undefined;
          const columnNumber = source?.columnNumber ?? undefined;

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

    const labelFadeTimeouts = new Map<string, number>();

    const cancelLabelFade = (instanceId: string) => {
      const existingTimeout = labelFadeTimeouts.get(instanceId);
      if (existingTimeout !== undefined) {
        window.clearTimeout(existingTimeout);
        labelFadeTimeouts.delete(instanceId);
      }
    };

    const cancelAllLabelFades = () => {
      for (const timeoutId of labelFadeTimeouts.values()) {
        window.clearTimeout(timeoutId);
      }
      labelFadeTimeouts.clear();
    };

    const scheduleLabelFade = (instanceId: string) => {
      cancelLabelFade(instanceId);

      const timeoutId = window.setTimeout(() => {
        labelFadeTimeouts.delete(instanceId);
        actions.updateLabelInstance(instanceId, "fading");
        setTimeout(() => {
          labelFadeTimeouts.delete(instanceId);
          actions.removeLabelInstance(instanceId);
        }, FADE_COMPLETE_BUFFER_MS);
      }, FEEDBACK_DURATION_MS);

      labelFadeTimeouts.set(instanceId, timeoutId);
    };

    const handleLabelInstanceHoverChange = (instanceId: string, isHovered: boolean) => {
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
      cancelAllLabelFades();
      const instanceId = generateId("label");
      const boundsCenterX = bounds.x + bounds.width / 2;
      const boundsHalfWidth = bounds.width / 2;
      const mouseX = options?.mouseX;
      const mouseXOffset = mouseX !== undefined ? mouseX - boundsCenterX : undefined;

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

    const clearAllLabels = () => {
      cancelAllLabelFades();
      actions.clearLabelInstances();
    };

    const updateLabelAfterCopy = (
      labelInstanceId: string,
      didSucceed: boolean,
      errorMessage?: string,
    ) => {
      if (didSucceed) {
        actions.updateLabelInstance(labelInstanceId, "copied");
      } else {
        actions.updateLabelInstance(labelInstanceId, "error", errorMessage || "Unknown error");
      }
      scheduleLabelFade(labelInstanceId);
    };

    const executeCopyOperation = async (
      clipboardOperation: () => Promise<void>,
      labelInstanceId: string | null,
      copiedElement?: Element,
      shouldDeactivateAfter?: boolean,
    ) => {
      clearCopyFeedbackCooldown();
      if (store.current.state !== "copying") {
        actions.startCopy();
      }

      let didSucceed = false;
      let errorMessage: string | undefined;

      try {
        await clipboardOperation();
        didSucceed = true;
      } catch (error) {
        errorMessage = normalizeErrorMessage(error, "Action failed");
      }

      if (labelInstanceId) {
        updateLabelAfterCopy(labelInstanceId, didSucceed, errorMessage);
      }

      if (store.current.state !== "copying") return;

      if (didSucceed) {
        actions.completeCopy(copiedElement);
      }

      if (shouldDeactivateAfter) {
        deactivateRenderer();
      } else if (didSucceed) {
        actions.activate();
        startCopyFeedbackCooldown();
      } else {
        actions.unfreeze();
      }
    };

    const handleCopySuccessWithComments = (options: {
      copiedElements: Element[];
      content: string;
      extraPrompt: string | undefined;
      elementName: string | undefined;
      tagName: string | null;
      componentName: string | null;
    }) => {
      const { copiedElements, content, extraPrompt, elementName, tagName, componentName } = options;
      pluginRegistry.hooks.onCopySuccess(copiedElements, content);

      if (!extraPrompt) return;

      const hasCopiedElements = copiedElements.length > 0;

      if (hasCopiedElements) {
        const currentItems = commentItems();
        for (const [existingItemId, mappedElements] of commentElementMap.entries()) {
          const isSameSelection =
            mappedElements.length === copiedElements.length &&
            mappedElements.every((mappedElement, index) => mappedElement === copiedElements[index]);
          if (!isSameSelection) continue;
          const existingItem = currentItems.find((item) => item.id === existingItemId);
          if (!existingItem) continue;

          if (existingItem.commentText === extraPrompt) {
            removeCommentItem(existingItemId);
            commentElementMap.delete(existingItemId);
            break;
          }
        }
      }

      const elementSelectors = copiedElements.map((copiedElement, index) =>
        createElementSelector(copiedElement, index === 0),
      );

      const updatedCommentItems = addCommentItem({
        content,
        elementName: elementName ?? "element",
        tagName: tagName ?? "div",
        componentName: componentName ?? undefined,
        elementsCount: copiedElements.length,
        previewBounds: copiedElements.map((copiedElement) => createElementBounds(copiedElement)),
        elementSelectors,
        commentText: extraPrompt,
        timestamp: Date.now(),
      });
      setCommentItems(updatedCommentItems);
      setClockFlashTrigger((previous) => previous + 1);
      const newestCommentItem = updatedCommentItems[0];
      if (newestCommentItem && hasCopiedElements) {
        commentElementMap.set(newestCommentItem.id, [...copiedElements]);
      }

      const currentItemIds = new Set(updatedCommentItems.map((item) => item.id));
      for (const mapItemId of commentElementMap.keys()) {
        if (!currentItemIds.has(mapItemId)) {
          commentElementMap.delete(mapItemId);
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
        resolvedComponentName ?? (firstElement ? getComponentDisplayName(firstElement) : null);
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
            handleCopySuccessWithComments({
              copiedElements,
              content,
              extraPrompt,
              elementName,
              tagName,
              componentName,
            });
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
        const { wasIntercepted, pendingResult } = pluginRegistry.hooks.onElementSelect(element);
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
        await copyWithFallback(unhandledElements, extraPrompt, resolvedComponentName);
      } else if (pendingResults.length > 0) {
        const results = await Promise.all(pendingResults);
        if (!results.every(Boolean)) {
          throw new Error("Failed to copy");
        }
      }
      void notifyElementsSelected(targetElements);
    };

    const performCopyWithLabel = (options: CopyWithLabelOptions) => {
      const {
        element,
        cursorX,
        selectedElements,
        extraPrompt,
        shouldDeactivateAfter,
        onComplete,
        dragRect: passedDragRect,
      } = options;

      const allTargetElements = selectedElements ?? [element];
      const dragRect = passedDragRect ?? store.frozenDragRect;
      const isMultiSelect = allTargetElements.length > 1;

      const selectionBounds =
        dragRect && isMultiSelect
          ? createBoundsFromDragRect(dragRect)
          : createFlatOverlayBounds(createElementBounds(element));

      const labelCursorX = isMultiSelect ? selectionBounds.x + selectionBounds.width / 2 : cursorX;

      const tagName = getTagName(element);
      clearCopyFeedbackCooldown();
      actions.startCopy();

      const labelInstanceId = tagName
        ? createLabelInstance(selectionBounds, tagName, undefined, "copying", {
            element,
            mouseX: labelCursorX,
            elements: selectedElements,
          })
        : null;

      void getNearestComponentName(element)
        .then(async (componentName) => {
          await executeCopyOperation(
            () =>
              copyElementsToClipboard(allTargetElements, extraPrompt, componentName ?? undefined),
            labelInstanceId,
            element,
            shouldDeactivateAfter,
          );
          onComplete?.();
        })
        .catch((error) => {
          logRecoverableError("Copy operation failed", error);
          if (labelInstanceId) {
            updateLabelAfterCopy(
              labelInstanceId,
              false,
              normalizeErrorMessage(error, "Action failed"),
            );
          }
          if (store.current.state === "copying") {
            actions.unfreeze();
          }
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
      () => store.frozenElement || (isFrozenPhase() ? null : targetElement()),
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

    // In touch mode during a drag, effectiveElement() is null because pointer
    // events are captured by the drag handler. We fall back to detectedElement,
    // which was stored before the drag started.
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

    const toPageCoordinates = (clientX: number, clientY: number) => ({
      pageX: clientX + window.scrollX,
      pageY: clientY + window.scrollY,
    });

    const calculateDragDistance = (endX: number, endY: number) => {
      const { pageX: endPageX, pageY: endPageY } = toPageCoordinates(endX, endY);

      return {
        x: Math.abs(endPageX - store.dragStart.x),
        y: Math.abs(endPageY - store.dragStart.y),
      };
    };

    const isDraggingBeyondThreshold = createMemo(() => {
      if (!isDragging()) return false;

      const dragDistance = calculateDragDistance(store.pointer.x, store.pointer.y);

      return dragDistance.x > DRAG_THRESHOLD_PX || dragDistance.y > DRAG_THRESHOLD_PX;
    });

    const calculateDragRectangle = (endX: number, endY: number) => {
      const { pageX: endPageX, pageY: endPageY } = toPageCoordinates(endX, endY);

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

    const isSpaceActivationKey = (event: KeyboardEvent) =>
      event.code === "Space" || event.key === " ";

    const startSpaceDragRepositioning = () => {
      if (!isDragging()) return;
      actions.startDragReposition();
      const { pageX, pageY } = toPageCoordinates(store.pointer.x, store.pointer.y);
      previousSpaceDragPointerPage = { x: pageX, y: pageY };
    };

    const stopSpaceDragRepositioning = () => {
      actions.stopDragReposition();
      previousSpaceDragPointerPage = null;
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
        elements.length > 0 ? elements : getElementsInDrag(drag, isValidGrabbableElement, false);

      return previewElements.map((element) => createElementBounds(element));
    });

    const selectionBoundsMultiple = createMemo((): OverlayBounds[] => {
      const previewBounds = dragPreviewBounds();
      if (previewBounds.length > 0) {
        return previewBounds;
      }
      return frozenElementsBounds();
    });

    const inspectBounds = createMemo((): OverlayBounds[] => {
      if (!isInspectMode()) return [];

      const element = effectiveElement();
      if (!element) return [];

      void store.viewportVersion;

      return [...getAncestorElements(element), element].map((ancestor) =>
        createElementBounds(ancestor),
      );
    });

    const cursorPosition = createMemo(() => {
      if (isCopying() || isPromptMode()) {
        void store.viewportVersion;
        const element = store.frozenElement || targetElement();
        if (element) {
          const center = getBoundsCenter(createElementBounds(element));
          return {
            x: center.x + store.copyOffsetFromCenterX,
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

          resolveSource(element)
            .then((source) => {
              if (selectionSourceRequestVersion !== currentVersion) return;
              if (!source) {
                clearSource();
                return;
              }
              actions.setSelectionSource(source.filePath, source.lineNumber);
            })
            .catch(() => {
              if (selectionSourceRequestVersion === currentVersion) {
                actions.setSelectionSource(null, null);
              }
            });
        },
      ),
    );

    const publicGrabbedBoxes = createMemo(() =>
      store.grabbedBoxes.map((box) => ({
        id: box.id,
        bounds: box.bounds,
        createdAt: box.createdAt,
      })),
    );

    const publicLabelInstances = createMemo(() =>
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
      const target = targetElement();
      const drag = dragBounds();
      const themeEnabled = pluginRegistry.store.theme.enabled;
      const selectionBoxEnabled = pluginRegistry.store.theme.selectionBox.enabled;
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
        themeEnabled && dragBoxEnabled && active && !copying && draggingBeyondThreshold,
      );

      return {
        isActive: active,
        isDragging: dragging,
        isCopying: copying,
        isPromptMode: inputMode,
        isSelectionBoxVisible,
        isDragBoxVisible,
        targetElement: target,
        dragBounds: drag ? { x: drag.x, y: drag.y, width: drag.width, height: drag.height } : null,
        grabbedBoxes: [...publicGrabbedBoxes()],
        labelInstances: [...publicLabelInstances()],
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
        () => [isPromptMode(), store.pointer.x, store.pointer.y, targetElement()] as const,
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
          pluginRegistry.hooks.onSelectionBox(Boolean(visible), bounds ?? null, element);
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
          const nonce = detectCspNonce();
          if (nonce) cursorStyleElement.nonce = nonce;
          hideFromThirdParties(cursorStyleElement);
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
        ([activated, copying, promptMode]) => {
          if (copying) {
            setCursorOverride("progress");
          } else if (activated && !promptMode) {
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
      if (!wasInHoldingState) {
        pluginRegistry.hooks.onActivate();
      }
    };

    const deactivateRenderer = () => {
      const wasDragging = isDragging();
      const previousFocused = store.previouslyFocusedElement;
      stopSpaceDragRepositioning();
      actions.deactivate();
      setIsInspectMode(false);
      clearArrowNavigation();
      keyboardSelectedElement = null;
      isPendingContextMenuSelect = false;
      if (wasDragging) {
        document.body.style.userSelect = "";
      }
      if (keydownSpamTimerId) window.clearTimeout(keydownSpamTimerId);
      autoScroller.stop();
      if (previousFocused instanceof HTMLElement && isElementConnected(previousFocused)) {
        previousFocused.focus();
      }
      pluginRegistry.hooks.onDeactivate();
    };

    const forceDeactivateAll = () => {
      if (isHoldingKeys()) {
        actions.releaseHold();
      }
      if (isActivated()) {
        deactivateRenderer();
      }
      clearCopyFeedbackCooldown();
    };

    const toggleActivate = () => {
      actions.setWasActivatedByToggle(true);
      activateRenderer();
    };

    const handleInputSubmit = () => {
      actions.clearLastCopied();
      const frozenElements = [...store.frozenElements];
      const element = store.frozenElement || targetElement();
      const prompt = isPromptMode() ? store.inputText.trim() : "";

      if (!element) {
        deactivateRenderer();
        return;
      }

      const elements = frozenElements.length > 0 ? frozenElements : [element];

      const currentSelectionBounds = elements.map((selectedElement) =>
        createElementBounds(selectedElement),
      );
      const firstBounds = currentSelectionBounds[0];
      const { x: currentX, y: currentY } = getBoundsCenter(firstBounds);
      const labelPositionX = currentX + store.copyOffsetFromCenterX;

      actions.setPointer({ x: currentX, y: currentY });
      actions.exitPromptMode();
      actions.clearInputText();

      performCopyWithLabel({
        element,
        cursorX: labelPositionX,
        selectedElements: elements,
        extraPrompt: prompt || undefined,
        shouldDeactivateAfter: true,
      });
    };

    const handleInputCancel = () => {
      actions.clearLastCopied();
      if (!isPromptMode()) return;

      if (isPendingDismiss()) {
        actions.clearInputText();
        deactivateRenderer();
        return;
      }

      actions.setPendingDismiss(true);
      setSelectionLabelShakeCount((count) => count + 1);
    };

    const handleConfirmDismiss = () => {
      actions.clearInputText();
      deactivateRenderer();
    };

    const handleCancelDismiss = () => {
      actions.setPendingDismiss(false);
    };

    const handleToggleExpand = () => {
      const element = store.frozenElement || targetElement();
      if (element) {
        preparePromptMode(element, store.pointer.x, store.pointer.y);
      }
      activatePromptMode();
    };

    const handleToggleActive = () => {
      if (isActivated()) {
        deactivateRenderer();
      } else if (isEnabled()) {
        const defaultActionId = currentToolbarState()?.defaultAction ?? DEFAULT_ACTION_ID;
        if (defaultActionId === DEFAULT_ACTION_ID) {
          actions.setPendingCommentMode(true);
        } else {
          pendingDefaultActionId = defaultActionId;
          isPendingContextMenuSelect = true;
        }
        toggleActivate();
      }
    };

    const enterCommentModeForElement = (element: Element, positionX: number, positionY: number) => {
      actions.setPendingCommentMode(false);
      actions.clearInputText();
      actions.enterPromptMode({ x: positionX, y: positionY }, element);
    };

    const openContextMenu = (element: Element, position: Position) => {
      actions.showContextMenu(position, element);
      clearArrowNavigation();
      dismissAllPopups();
      pluginRegistry.hooks.onContextMenu(element, position);
    };

    const runPendingDefaultAction = (element: Element, position: Position) => {
      const actionId = pendingDefaultActionId;
      pendingDefaultActionId = null;
      if (!actionId) return;

      const action = pluginRegistry.store.actions.find(
        (registeredAction) => registeredAction.id === actionId,
      );
      if (!action) {
        handleSetDefaultAction(DEFAULT_ACTION_ID);
        openContextMenu(element, position);
        return;
      }

      const elementBounds = createElementBounds(element);
      const context = buildActionContext({
        element,
        filePath: store.selectionFilePath ?? undefined,
        lineNumber: store.selectionLineNumber ?? undefined,
        tagName: getTagName(element) || undefined,
        componentName: resolvedComponentName(),
        position,
        shouldDeferHideContextMenu: false,
        performWithFeedbackOptions: {
          fallbackBounds: elementBounds,
          fallbackSelectionBounds: [elementBounds],
          position,
        },
      });
      action.onAction(context);
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

    const handlePointerMove = (clientX: number, clientY: number) => {
      if (!isEnabled() || isPromptMode() || isFrozenPhase() || store.contextMenuPosition !== null)
        return;

      actions.setPointer({ x: clientX, y: clientY });

      elementDetectionState.latestPointerX = clientX;
      elementDetectionState.latestPointerY = clientY;

      const now = performance.now();
      const isDetectionPending =
        elementDetectionState.pendingDetectionScheduledAt > 0 &&
        now - elementDetectionState.pendingDetectionScheduledAt < PENDING_DETECTION_STALENESS_MS;
      if (
        now - elementDetectionState.lastDetectionTimestamp >= ELEMENT_DETECTION_THROTTLE_MS &&
        !isDetectionPending
      ) {
        elementDetectionState.lastDetectionTimestamp = now;
        elementDetectionState.pendingDetectionScheduledAt = now;
        setTimeout(() => {
          const candidate = getElementAtPosition(
            elementDetectionState.latestPointerX,
            elementDetectionState.latestPointerY,
          );
          if (candidate !== store.detectedElement) {
            actions.setDetectedElement(candidate);
          }
          elementDetectionState.pendingDetectionScheduledAt = 0;
        });
      }

      if (isDragging()) {
        if (isDragRepositioning()) {
          const { pageX, pageY } = toPageCoordinates(clientX, clientY);
          if (previousSpaceDragPointerPage) {
            actions.shiftDragStart({
              x: pageX - previousSpaceDragPointerPage.x,
              y: pageY - previousSpaceDragPointerPage.y,
            });
          }
          previousSpaceDragPointerPage = { x: pageX, y: pageY };
        }

        scheduleDragPreviewUpdate(clientX, clientY);

        const direction = getAutoScrollDirection(clientX, clientY);
        const isNearEdge = direction.top || direction.bottom || direction.left || direction.right;

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

      pluginRegistry.hooks.onDragStart(clientX + window.scrollX, clientY + window.scrollY);

      return true;
    };

    const handleDragSelection = (
      dragSelectionRect: ReturnType<typeof calculateDragRectangle>,
      hasModifierKeyHeld: boolean,
    ) => {
      const elements = getElementsInDrag(dragSelectionRect, isValidGrabbableElement);
      const selectedElements =
        elements.length > 0
          ? elements
          : getElementsInDrag(dragSelectionRect, isValidGrabbableElement, false);

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
        if (pendingDefaultActionId) {
          runPendingDefaultAction(firstElement, center);
        } else {
          openContextMenu(firstElement, center);
        }
        return;
      }

      const shouldDeactivateAfter = store.wasActivatedByToggle && !hasModifierKeyHeld;

      performCopyWithLabel({
        element: firstElement,
        cursorX: center.x,
        selectedElements,
        shouldDeactivateAfter,
        dragRect,
      });
    };

    const handleSingleClick = (clientX: number, clientY: number, hasModifierKeyHeld: boolean) => {
      const validFrozenElement = isElementConnected(store.frozenElement)
        ? store.frozenElement
        : null;

      const validKeyboardSelectedElement = isElementConnected(keyboardSelectedElement)
        ? keyboardSelectedElement
        : null;

      const validDetectedElement = isElementConnected(store.detectedElement)
        ? store.detectedElement
        : null;
      const {
        selectedElement,
        didResolveFromPointer,
        didResolveFromFrozenElement,
        didResolveFromKeyboardElement,
      } = resolveSingleClickSelection({
        pointerX: clientX,
        pointerY: clientY,
        frozenElement: validFrozenElement,
        keyboardSelectedElement: validKeyboardSelectedElement,
        detectedElement: validDetectedElement,
        getElementsAtPoint,
        isValidGrabbableElement,
      });
      if (!selectedElement) return;

      let positionX: number;
      let positionY: number;

      if (didResolveFromFrozenElement) {
        positionX = store.pointer.x;
        positionY = store.pointer.y;
      } else if (didResolveFromKeyboardElement) {
        const elementCenter = getBoundsCenter(createElementBounds(selectedElement));
        positionX = elementCenter.x;
        positionY = elementCenter.y;
      } else if (didResolveFromPointer) {
        positionX = clientX;
        positionY = clientY;
      } else {
        positionX = clientX;
        positionY = clientY;
      }

      keyboardSelectedElement = null;

      if (store.pendingCommentMode) {
        enterCommentModeForElement(selectedElement, positionX, positionY);
        return;
      }

      if (isPendingContextMenuSelect) {
        isPendingContextMenuSelect = false;
        const { wasIntercepted } = pluginRegistry.hooks.onElementSelect(selectedElement);
        if (wasIntercepted) return;

        freezeAllAnimations([selectedElement]);
        actions.setFrozenElement(selectedElement);
        const position = { x: positionX, y: positionY };
        actions.setPointer(position);
        actions.freeze();
        if (pendingDefaultActionId) {
          runPendingDefaultAction(selectedElement, position);
        } else {
          openContextMenu(selectedElement, position);
        }
        return;
      }

      const shouldDeactivateAfter = store.wasActivatedByToggle && !hasModifierKeyHeld;

      actions.setLastGrabbed(selectedElement);

      performCopyWithLabel({
        element: selectedElement,
        cursorX: positionX,
        shouldDeactivateAfter,
      });
    };

    const cancelActiveDrag = () => {
      if (!isDragging()) return;
      stopSpaceDragRepositioning();
      actions.cancelDrag();
      autoScroller.stop();
      document.body.style.userSelect = "";
    };

    const handlePointerUp = (clientX: number, clientY: number, hasModifierKeyHeld: boolean) => {
      if (!isDragging()) return;

      if (dragPreviewDebounceTimerId !== null) {
        clearTimeout(dragPreviewDebounceTimerId);
        dragPreviewDebounceTimerId = null;
      }
      setDebouncedDragPointer(null);

      const dragDistance = calculateDragDistance(clientX, clientY);
      const wasDragGesture =
        dragDistance.x > DRAG_THRESHOLD_PX || dragDistance.y > DRAG_THRESHOLD_PX;

      // The rectangle needs to be calculated before endDrag() because endDrag
      // resets dragStart in the store, which would zero out the rectangle.
      const dragSelectionRect = wasDragGesture ? calculateDragRectangle(clientX, clientY) : null;

      if (wasDragGesture) {
        actions.endDrag();
      } else {
        actions.cancelDrag();
      }
      stopSpaceDragRepositioning();
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

    const clearArrowNavigation = () => {
      setArrowNavigationElements([]);
      setArrowNavigationActiveIndex(0);
      arrowNavigator.clearHistory();
    };

    const selectAndFocusElement = (element: Element) => {
      actions.setFrozenElement(element);
      actions.freeze();
      keyboardSelectedElement = element;

      const center = getBoundsCenter(createElementBounds(element));
      actions.setPointer(center);

      if (store.contextMenuPosition !== null) {
        actions.showContextMenu(center, element);
      }
    };

    const openArrowNavigationMenu = (anchorElement: Element) => {
      const bounds = createElementBounds(anchorElement);
      const probePoint = getVisibleBoundsCenter(bounds);
      const elementsAtPoint = getElementsAtPoint(probePoint.x, probePoint.y)
        .filter(isValidGrabbableElement)
        .reverse();

      setArrowNavigationElements(elementsAtPoint);
      setArrowNavigationActiveIndex(Math.max(0, elementsAtPoint.indexOf(anchorElement)));
    };

    const handleArrowNavigationSelect = (index: number) => {
      const targetElement = arrowNavigationElements()[index];
      if (!targetElement) return;

      setArrowNavigationActiveIndex(index);
      arrowNavigator.clearHistory();
      selectAndFocusElement(targetElement);
    };

    const handleArrowNavigation = (event: KeyboardEvent): boolean => {
      if (!isActivated() || isPromptMode()) return false;
      if (!ARROW_KEYS.has(event.key)) return false;

      let currentElement = effectiveElement();
      const isInitialSelection = !currentElement;

      if (!currentElement) {
        currentElement = getElementAtPosition(window.innerWidth / 2, window.innerHeight / 2);
      }

      if (!currentElement) return false;

      const isVertical = event.key === "ArrowUp" || event.key === "ArrowDown";

      if (!isVertical) {
        clearArrowNavigation();
        const nextElement = arrowNavigator.findNext(event.key, currentElement);
        if (!nextElement && !isInitialSelection) return false;
        event.preventDefault();
        event.stopPropagation();
        selectAndFocusElement(nextElement ?? currentElement);
        return true;
      }

      if (arrowNavigationElements().length === 0) {
        openArrowNavigationMenu(currentElement);
      }

      const nextElement = arrowNavigator.findNext(event.key, currentElement);
      const elementToSelect = nextElement ?? currentElement;

      event.preventDefault();
      event.stopPropagation();
      selectAndFocusElement(elementToSelect);

      const newIndex = arrowNavigationElements().indexOf(elementToSelect);
      if (newIndex !== -1) {
        setArrowNavigationActiveIndex(newIndex);
      } else {
        openArrowNavigationMenu(elementToSelect);
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
          (instance) => instance.status === "copied" || instance.status === "fading",
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

      const wasHandled = pluginRegistry.hooks.onOpenFile(filePath, lineNumber ?? undefined);
      if (!wasHandled) {
        openFile(filePath, lineNumber ?? undefined, pluginRegistry.hooks.transformOpenFileUrl);
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

    const activationBaseKey = createMemo(() => {
      const { key } = getModifiersFromActivationKey(pluginRegistry.store.options.activationKey);
      return (key ?? "c").toUpperCase();
    });

    const actionCycleState = createMemo<ActionCycleState>(() => ({
      items: actionCycleItems(),
      activeIndex: actionCycleActiveIndex(),
      isVisible:
        actionCycleActiveIndex() !== null && actionCycleItems().length > 0 && !isCommentMode(),
    }));

    const arrowNavigationItems = createMemo(() =>
      arrowNavigationElements().map((element) => ({
        tagName: getTagName(element) || "element",
        componentName: getComponentDisplayName(element) ?? undefined,
      })),
    );

    const arrowNavigationState = createMemo<ArrowNavigationState>(() => ({
      items: arrowNavigationItems(),
      activeIndex: arrowNavigationActiveIndex(),
      isVisible: arrowNavigationElements().length > 0,
    }));

    const inspectAncestorElements = createMemo((): Element[] => {
      if (!isInspectMode()) return [];
      const element = effectiveElement();
      if (!element) return [];
      return [...getAncestorElements(element).reverse(), element];
    });

    const inspectNavigationItems = createMemo(() =>
      inspectAncestorElements().map((element) => ({
        tagName: getTagName(element) || "element",
        componentName: getComponentDisplayName(element) ?? undefined,
      })),
    );

    const [inspectActiveIndex, setInspectActiveIndex] = createSignal(-1);

    createEffect(
      on(inspectAncestorElements, (elements) => {
        setInspectActiveIndex(elements.length - 1);
      }),
    );

    const inspectNavigationState = createMemo<ArrowNavigationState>(() => {
      const elements = inspectAncestorElements();
      return {
        items: inspectNavigationItems(),
        activeIndex: inspectActiveIndex(),
        isVisible: isInspectMode() && elements.length > 0,
      };
    });

    const handleInspectSelect = (index: number) => {
      setInspectActiveIndex(index);
    };

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
        const isStaticallyDisabled = typeof action.enabled === "boolean" && !action.enabled;
        if (isStaticallyDisabled) continue;
        const hasNonMatchingShortcut =
          action.shortcut && action.shortcut.toUpperCase() !== activationBaseKey();
        if (hasNonMatchingShortcut) continue;
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
      const isCurrentIndexValid = currentIndex !== null && currentIndex < cycleItems.length;
      const nextIndex = isCurrentIndexValid ? (currentIndex + 1) % cycleItems.length : 0;

      setActionCycleActiveIndex(nextIndex);
      scheduleActionCycleActivation();
      return true;
    };

    const handleActionCycleKey = (event: KeyboardEvent): boolean => {
      if (!keyMatchesCode(activationBaseKey(), event.code)) return false;
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
            actions.releaseHold();
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
        if (store.wasActivatedByToggle && pluginRegistry.store.options.activationMode !== "hold")
          return;
        if (event.repeat) return;

        // If the overlay gets stuck active (e.g. the modifier keyup was lost
        // during a window blur), repeated keydowns will auto-dismiss it after
        // 200ms of idle keyboard activity.
        if (keydownSpamTimerId !== null) {
          window.clearTimeout(keydownSpamTimerId);
        }
        keydownSpamTimerId = window.setTimeout(() => {
          deactivateRenderer();
        }, KEYDOWN_SPAM_TIMEOUT_MS);
        return;
      }

      if (isHoldingKeys() && event.repeat) {
        if (activationHoldState.copyWaiting) {
          const shouldActivate = activationHoldState.holdTimerFired;
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
          pluginRegistry.store.options.keyHoldDuration ?? DEFAULT_KEY_HOLD_DURATION_MS;

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
          if (isTargetKeyCombination(event, pluginRegistry.store.options) && !event.repeat) {
            setToolbarShakeCount((count) => count + 1);
          }
          return;
        }

        const isEnterToActivateInput =
          isEnterCode(event.code) && isHoldingKeys() && !isPromptMode();

        const isFromReactGrabInput = isEventFromOverlay(event, "data-react-grab-input");
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

        if (event.key === "Escape" && commentsDropdownPosition() !== null) {
          dismissCommentsDropdown();
          return;
        }

        if (event.key === "Escape" && toolbarMenuPosition() !== null) {
          dismissToolbarMenu();
          return;
        }

        const isFromOverlay =
          isEventFromOverlay(event, "data-react-grab-ignore-events") && !isEnterToActivateInput;

        if (isPromptMode() || isFromOverlay) {
          if (event.key === "Escape") {
            if (isPromptMode()) {
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

        if (isDragging() && isSpaceActivationKey(event)) {
          if (!event.repeat) {
            startSpaceDragRepositioning();
          }
          event.preventDefault();
          event.stopPropagation();
          return;
        }

        if (event.key === "Shift" && !event.repeat && isActivated()) {
          setIsInspectMode(true);
          if (isFrozenPhase()) {
            actions.unfreeze();
            clearArrowNavigation();
          }
        }

        if (event.key === "Escape") {
          if (isHoldingKeys() || store.wasActivatedByToggle) {
            deactivateRenderer();
            return;
          }
        }

        if (isActivated() && !MODIFIER_KEYS.includes(event.key)) {
          event.preventDefault();
        }

        // After the window regains focus we briefly ignore activation keys to
        // prevent accidental activation from the modifier keys used to alt-tab.
        const didWindowJustRegainFocus =
          Date.now() - lastWindowFocusTimestamp < WINDOW_REFOCUS_GRACE_PERIOD_MS;

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

        if (isSpaceActivationKey(event) && isDragRepositioning()) {
          stopSpaceDragRepositioning();
          event.preventDefault();
          event.stopPropagation();
        }

        if (event.key === "Shift") {
          setIsInspectMode(false);
        }

        if (isEventFromOverlay(event, "data-react-grab-ignore-events")) return;

        const requiredModifiers = getRequiredModifiers(pluginRegistry.store.options);
        const isReleasingModifier =
          requiredModifiers.metaKey || requiredModifiers.ctrlKey
            ? isMac()
              ? !event.metaKey
              : !event.ctrlKey
            : (requiredModifiers.shiftKey && !event.shiftKey) ||
              (requiredModifiers.altKey && !event.altKey);

        const isReleasingActivationKey = pluginRegistry.store.options.activationKey
          ? typeof pluginRegistry.store.options.activationKey === "function"
            ? pluginRegistry.store.options.activationKey(event)
            : parseActivationKey(pluginRegistry.store.options.activationKey)(event)
          : isCLikeKey(event.key, event.code);

        if (didJustCopy() || isCopyFeedbackCooldownActive) {
          if (isReleasingActivationKey || isReleasingModifier) {
            clearCopyFeedbackCooldown();
            deactivateRenderer();
          }
          return;
        }

        if (!isHoldingKeys() && !isActivated()) return;
        if (isPromptMode()) return;

        const hasCustomShortcut = Boolean(pluginRegistry.store.options.activationKey);

        const isHoldMode = pluginRegistry.store.options.activationMode === "hold";
        const isDragGestureInProgress = isDragging();

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
            if (isDragGestureInProgress) return;
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
          if (store.wasActivatedByToggle && pluginRegistry.store.options.activationMode !== "hold")
            return;

          const shouldRelease =
            isHoldingKeys() || (activationHoldState.holdTimerFired && isReleasingModifier);

          if (shouldRelease) {
            clearHoldTimer();
            const elapsedSinceHoldStart = activationHoldState.startTimestamp
              ? Date.now() - activationHoldState.startTimestamp
              : 0;
            const heldLongEnoughForActivation =
              elapsedSinceHoldStart >= MIN_HOLD_FOR_ACTIVATION_AFTER_COPY_MS;
            const shouldActivateAfterCopy =
              activationHoldState.holdTimerFired &&
              heldLongEnoughForActivation &&
              (pluginRegistry.store.options.allowActivationInsideInput ||
                !isKeyboardEventTriggeredByInput(event));
            resetCopyConfirmation();
            if (shouldActivateAfterCopy) {
              actions.activate();
            } else {
              actions.releaseHold();
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
        activationHoldState.copyWaiting = true;
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
        if (isActiveState && !isPromptMode() && isFrozenPhase()) {
          actions.unfreeze();
          clearArrowNavigation();
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
          if (event.pointerId !== undefined) {
            document.documentElement.setPointerCapture(event.pointerId);
          }
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
        const isActive = isRendererActive() || isCopying() || isDragging();
        const hasModifierKeyHeld = event.metaKey || event.ctrlKey;
        handlePointerUp(event.clientX, event.clientY, hasModifierKeyHeld);
        if (isActive) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      },
      { capture: true },
    );

    eventListenerManager.addWindowListener(
      "contextmenu",
      (event: MouseEvent) => {
        if (!isRendererActive() || isCopying() || isPromptMode()) return;

        const isFromOverlay = isEventFromOverlay(event, "data-react-grab-ignore-events");
        if (isFromOverlay && arrowNavigationElements().length > 0) {
          clearArrowNavigation();
        } else if (isFromOverlay) {
          return;
        }

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
          existingFrozenElements.length > 1 && existingFrozenElements.includes(element);

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

    eventListenerManager.addWindowListener("pointercancel", (event: PointerEvent) => {
      if (!event.isPrimary) return;
      cancelActiveDrag();
    });

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

    // On blur we release the hold state (modifier keyup events are lost when
    // the window loses focus) but do not deactivate if already active, since
    // the user may alt-tab back.
    eventListenerManager.addWindowListener("blur", () => {
      cancelActiveDrag();
      if (isHoldingKeys()) {
        clearHoldTimer();
        actions.releaseHold();
        resetCopyConfirmation();
      }
    });

    eventListenerManager.addWindowListener("focus", () => {
      lastWindowFocusTimestamp = Date.now();
    });

    eventListenerManager.addWindowListener(
      "focusin",
      (event: FocusEvent) => {
        if (isEventFromOverlay(event, "data-react-grab")) {
          event.stopPropagation();
        }
      },
      { capture: true },
    );

    const redetectElementUnderPointer = () => {
      if (store.isTouchMode && !isHoldingKeys() && !isActivated()) return;
      if (
        isEnabled() &&
        !isPromptMode() &&
        !isFrozenPhase() &&
        !isDragging() &&
        store.contextMenuPosition === null &&
        store.frozenElements.length === 0
      ) {
        const candidate = getElementAtPosition(store.pointer.x, store.pointer.y);
        actions.setDetectedElement(candidate);
      }
    };

    let boundsRecalcIntervalId: number | null = null;
    let viewportChangeFrameId: number | null = null;

    const handleViewportChange = () => {
      invalidateInteractionCaches();
      redetectElementUnderPointer();
      actions.incrementViewportVersion();
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
        const isUniformScale = Math.abs(scaleX - scaleY) < ZOOM_DETECTION_THRESHOLD;
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

    const visualViewport = window.visualViewport;
    if (visualViewport) {
      const { signal } = eventListenerManager;
      visualViewport.addEventListener("resize", handleViewportChange, {
        signal,
      });
      visualViewport.addEventListener("scroll", handleViewportChange, {
        signal,
      });
    }

    const scheduleBoundsSync = () => {
      if (viewportChangeFrameId !== null) return;

      viewportChangeFrameId = nativeRequestAnimationFrame(() => {
        viewportChangeFrameId = null;
        actions.incrementViewportVersion();
      });
    };

    createEffect(() => {
      const shouldRunInterval =
        pluginRegistry.store.theme.enabled &&
        (isActivated() ||
          isCopying() ||
          store.labelInstances.length > 0 ||
          store.grabbedBoxes.length > 0);

      if (shouldRunInterval) {
        if (boundsRecalcIntervalId !== null) return;

        boundsRecalcIntervalId = window.setInterval(() => {
          scheduleBoundsSync();
        }, BOUNDS_RECALC_INTERVAL_MS);
        return;
      }

      if (boundsRecalcIntervalId !== null) {
        window.clearInterval(boundsRecalcIntervalId);
        boundsRecalcIntervalId = null;
      }

      if (viewportChangeFrameId !== null) {
        nativeCancelAnimationFrame(viewportChangeFrameId);
        viewportChangeFrameId = null;
      }
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
        if (isPromptMode() || isEventFromOverlay(event, "data-react-grab-ignore-events")) {
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
      clearCopyFeedbackCooldown();
      if (actionCycleIdleTimeoutId) {
        window.clearTimeout(actionCycleIdleTimeoutId);
      }
      if (dropdownTrackingFrameId !== null) {
        nativeCancelAnimationFrame(dropdownTrackingFrameId);
      }
      grabbedBoxTimeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
      grabbedBoxTimeouts.clear();
      cancelAllLabelFades();
      autoScroller.stop();
      document.body.style.userSelect = "";
      document.body.style.touchAction = "";
      unlockViewportZoom?.();
      unlockViewportZoom = null;
      setCursorOverride(null);
      keyboardClaimer.restore();
    });

    const resolvedCssText = typeof cssText === "string" ? cssText : "";
    const rendererRoot = mountRoot(resolvedCssText);

    const isThemeEnabled = createMemo(() => pluginRegistry.store.theme.enabled);
    const isSelectionBoxThemeEnabled = createMemo(
      () => pluginRegistry.store.theme.selectionBox.enabled,
    );
    const isElementLabelThemeEnabled = createMemo(
      () => pluginRegistry.store.theme.elementLabel.enabled,
    );
    const isDragBoxThemeEnabled = createMemo(() => pluginRegistry.store.theme.dragBox.enabled);
    const isSelectionSuppressed = createMemo(
      () => didJustCopy() || (isToolbarSelectHovered() && !isFrozenPhase()),
    );
    const hasDragPreviewBounds = createMemo(() => dragPreviewBounds().length > 0);

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

    const recomputeLabelInstance = (instance: SelectionLabelInstance): SelectionLabelInstance => {
      const hasMultipleElements = instance.elements && instance.elements.length > 1;
      const instanceElement = instance.element;
      const canRecalculateBounds =
        !hasMultipleElements && instanceElement && document.body.contains(instanceElement);
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
      let newMouseX: number;
      if (instance.mouseXOffsetRatio !== undefined && newBoundsHalfWidth > 0) {
        newMouseX = newBoundsCenterX + instance.mouseXOffsetRatio * newBoundsHalfWidth;
      } else if (instance.mouseXOffsetFromCenter !== undefined) {
        newMouseX = newBoundsCenterX + instance.mouseXOffsetFromCenter;
      } else {
        newMouseX = instance.mouseX ?? newBoundsCenterX;
      }
      const newCached = { ...instance, bounds: newBounds, mouseX: newMouseX };
      labelInstanceCache.set(instance.id, newCached);
      return newCached;
    };

    const computedLabelInstances = createMemo(() => {
      if (!isThemeEnabled()) return [];
      if (!pluginRegistry.store.theme.grabbedBoxes.enabled) return [];
      void store.viewportVersion;
      const currentIds = new Set(store.labelInstances.map((instance) => instance.id));
      for (const cachedId of labelInstanceCache.keys()) {
        if (!currentIds.has(cachedId)) {
          labelInstanceCache.delete(cachedId);
        }
      }
      return store.labelInstances.map(recomputeLabelInstance);
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

    const labelVariant = createMemo(() => (isCopying() ? "processing" : "hover"));

    const labelVisible = createMemo(() => {
      if (!isThemeEnabled()) return false;
      const themeEnabled = isElementLabelThemeEnabled();
      const inPromptMode = isPromptMode();
      const copying = isCopying();
      const rendererActive = isRendererActive();
      const dragging = isDragging();
      const hasElement = Boolean(effectiveElement());
      const toolbarSelectHovered = isToolbarSelectHovered();
      const frozen = isFrozenPhase();

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
        return resolveSource(element);
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
        const position = options?.position ?? store.contextMenuPosition ?? store.pointer;
        const frozenBounds = frozenElementsBounds();
        const singleElementBounds = contextMenuBounds() ?? fallbackBounds;
        const hasMultipleElements = elements.length > 1;

        const labelBounds = hasMultipleElements
          ? createFlatOverlayBounds(combineBounds(frozenBounds))
          : singleElementBounds;

        const shouldDeactivateAfter = store.wasActivatedByToggle;
        let selectionBoundsForLabel: OverlayBounds[];
        if (hasMultipleElements) {
          selectionBoundsForLabel = frozenBounds;
        } else if (singleElementBounds) {
          selectionBoundsForLabel = [singleElementBounds];
        } else {
          selectionBoundsForLabel = fallbackSelectionBounds;
        }

        actions.hideContextMenu();

        if (labelBounds) {
          const labelCursorX = hasMultipleElements
            ? labelBounds.x + labelBounds.width / 2
            : position.x;

          const labelInstanceId = createLabelInstance(
            labelBounds,
            tagName || "element",
            componentName,
            "copying",
            {
              element,
              mouseX: labelCursorX,
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
            errorMessage = normalizeErrorMessage(error, "Action failed");
          }

          updateLabelAfterCopy(labelInstanceId, didSucceed, errorMessage);
        } else {
          try {
            await action();
          } catch (error) {
            logRecoverableError("Action failed without feedback bounds", error);
          }
        }

        if (shouldDeactivateAfter) {
          deactivateRenderer();
        } else {
          actions.unfreeze();
        }
      };
    };

    // Hiding the context menu synchronously during a click would cause the
    // click to fall through to whatever element was behind it.
    const deferHideContextMenu = () => {
      setTimeout(() => {
        actions.hideContextMenu();
      }, 0);
    };

    const buildActionContext = (options: BuildActionContextOptions): ContextMenuActionContext => {
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

      const elements = store.frozenElements.length > 0 ? store.frozenElements : [element];

      const hideContextMenuAction = shouldDeferHideContextMenu
        ? deferHideContextMenu
        : actions.hideContextMenu;

      const copyAction = () => {
        onBeforeCopy?.();
        performCopyWithLabel({
          element,
          cursorX: position.x,
          selectedElements: elements.length > 1 ? elements : undefined,
          shouldDeactivateAfter: store.wasActivatedByToggle,
        });
        hideContextMenuAction();
      };

      const defaultEnterPromptMode = () => {
        clearAllLabels();
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

      const transformedContext = pluginRegistry.hooks.transformActionContext(context);
      return { ...context, ...transformedContext };
    };

    const contextMenuActionContext = createMemo((): ContextMenuActionContext | undefined => {
      const element = store.contextMenuElement;
      if (!element) return undefined;
      const fileInfo = contextMenuFilePath();
      const position = store.contextMenuPosition ?? store.pointer;

      return buildActionContext({
        element,
        filePath: fileInfo?.filePath,
        lineNumber: fileInfo?.lineNumber ?? undefined,
        tagName: contextMenuTagName(),
        componentName: contextMenuComponentName(),
        position,
        shouldDeferHideContextMenu: true,
        onBeforeCopy: () => {
          keyboardSelectedElement = null;
        },
        customEnterPromptMode: () => {
          clearAllLabels();
          actions.clearInputText();
          actions.enterPromptMode(position, element);
          deferHideContextMenu();
        },
      });
    });

    const handleContextMenuDismiss = () => {
      setTimeout(() => {
        actions.hideContextMenu();
        deactivateRenderer();
      }, 0);
    };

    const clearCommentsHoverPreviews = () => {
      for (const { boxId, labelId } of commentsHoverPreviews) {
        actions.removeGrabbedBox(boxId);
        if (labelId) {
          actions.removeLabelInstance(labelId);
        }
      }
      commentsHoverPreviews = [];
    };

    const addCommentItemPreview = (
      item: CommentItem,
      previewBounds: OverlayBounds[],
      previewElements: Element[],
      idPrefix: string,
    ) => {
      if (previewBounds.length === 0) return;

      for (const [index, bounds] of previewBounds.entries()) {
        const previewElement = previewElements[index];
        const boxId = `${idPrefix}-${item.id}-${index}`;
        // A createdAt of zero is falsy, which tells the canvas animation loop
        // to skip auto-fade and keep the preview box visible until it is
        // explicitly removed.
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
            isPromptMode: Boolean(item.commentText),
            inputValue: item.commentText ?? undefined,
            createdAt: 0,
            element: previewElement,
            mouseX: bounds.x + bounds.width / 2,
          });
        }

        commentsHoverPreviews.push({ boxId, labelId });
      }
    };

    const showCommentItemPreview = (item: CommentItem, idPrefix: string): void => {
      const connectedElements = getConnectedCommentElements(item);
      const previewBounds = connectedElements.map((element) => createElementBounds(element));
      addCommentItemPreview(item, previewBounds, connectedElements, idPrefix);
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

    const openTrackedDropdown = (setPosition: (anchor: DropdownAnchor) => void) => {
      startTrackingDropdownPosition(() => {
        const anchor = computeDropdownAnchor();
        if (anchor) setPosition(anchor);
      });
    };

    const dismissCommentsDropdown = () => {
      cancelCommentsHoverOpenTimeout();
      cancelCommentsHoverCloseTimeout();
      stopTrackingDropdownPosition();
      clearCommentsHoverPreviews();
      setCommentsDropdownPosition(null);
      setIsCommentsHoverOpen(false);
    };

    const dismissToolbarMenu = () => {
      stopTrackingDropdownPosition();
      setToolbarMenuPosition(null);
    };

    const openCommentsDropdown = () => {
      actions.hideContextMenu();
      dismissToolbarMenu();
      dismissClearPrompt();
      setCommentItems(loadComments());
      openTrackedDropdown(setCommentsDropdownPosition);
    };

    let commentsHoverOpenTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let commentsHoverCloseTimeoutId: ReturnType<typeof setTimeout> | null = null;

    const cancelCommentsHoverOpenTimeout = () => {
      if (commentsHoverOpenTimeoutId !== null) {
        clearTimeout(commentsHoverOpenTimeoutId);
        commentsHoverOpenTimeoutId = null;
      }
    };

    const cancelCommentsHoverCloseTimeout = () => {
      if (commentsHoverCloseTimeoutId !== null) {
        clearTimeout(commentsHoverCloseTimeoutId);
        commentsHoverCloseTimeoutId = null;
      }
    };

    const scheduleCommentsHoverClose = () => {
      commentsHoverCloseTimeoutId = setTimeout(() => {
        commentsHoverCloseTimeoutId = null;
        dismissCommentsDropdown();
      }, DROPDOWN_HOVER_OPEN_DELAY_MS);
    };

    const showClearPrompt = () => {
      dismissCommentsDropdown();
      dismissToolbarMenu();
      openTrackedDropdown(setClearPromptPosition);
    };

    const dismissClearPrompt = () => {
      stopTrackingDropdownPosition();
      setClearPromptPosition(null);
    };

    const dismissAllPopups = () => {
      dismissCommentsDropdown();
      dismissToolbarMenu();
      dismissClearPrompt();
    };

    const handleToggleToolbarMenu = () => {
      if (toolbarMenuPosition() !== null) {
        dismissToolbarMenu();
      } else {
        actions.hideContextMenu();
        dismissCommentsDropdown();
        dismissClearPrompt();
        openTrackedDropdown(setToolbarMenuPosition);
      }
    };

    const handleSetDefaultAction = (actionId: string) => {
      updateToolbarState({ defaultAction: actionId });
    };

    const handleToggleComments = () => {
      cancelCommentsHoverOpenTimeout();
      cancelCommentsHoverCloseTimeout();
      const isCurrentlyOpen = commentsDropdownPosition() !== null;
      if (isCurrentlyOpen) {
        if (isCommentsHoverOpen()) {
          clearCommentsHoverPreviews();
          setIsCommentsHoverOpen(false);
        } else {
          dismissCommentsDropdown();
        }
      } else {
        clearCommentsHoverPreviews();
        openCommentsDropdown();
      }
    };

    const copyCommentItemContent = (item: CommentItem) => {
      copyContent(item.content, {
        tagName: item.tagName,
        componentName: item.componentName ?? item.elementName,
        commentText: item.commentText,
      });
      const element = getFirstConnectedCommentElement(item);
      if (!element) return;

      clearAllLabels();

      nativeRequestAnimationFrame(() => {
        if (!isElementConnected(element)) return;
        const bounds = createElementBounds(element);
        const labelId = createLabelInstance(bounds, item.tagName, item.componentName, "copied", {
          element,
          mouseX: bounds.x + bounds.width / 2,
        });
        if (labelId) scheduleLabelFade(labelId);
      });
    };

    const handleCommentItemSelect = (item: CommentItem) => {
      clearCommentsHoverPreviews();
      if (isPromptMode()) {
        actions.exitPromptMode();
        actions.clearInputText();
      }
      const element = getFirstConnectedCommentElement(item);

      if (item.commentText && element) {
        const center = getBoundsCenter(createElementBounds(element));
        actions.enterPromptMode(center, element);
        actions.setInputText(item.commentText);
      } else {
        copyCommentItemContent(item);
      }
    };

    const handleCommentsCopyAll = () => {
      clearCommentsHoverPreviews();
      const currentCommentItems = commentItems();
      if (currentCommentItems.length === 0) return;

      const combinedContent = joinSnippets(
        currentCommentItems.map((commentItem) => commentItem.content),
      );

      const firstItem = currentCommentItems[0];
      copyContent(combinedContent, {
        componentName: firstItem.componentName ?? firstItem.tagName,
        entries: currentCommentItems.map((commentItem) => ({
          tagName: commentItem.tagName,
          componentName: commentItem.componentName ?? commentItem.elementName,
          content: commentItem.content,
          commentText: commentItem.commentText,
        })),
      });

      if (isClearConfirmed()) {
        handleCommentsClear();
      } else {
        showClearPrompt();
      }

      clearAllLabels();

      nativeRequestAnimationFrame(() => {
        batch(() => {
          for (const commentItem of currentCommentItems) {
            const connectedElements = getConnectedCommentElements(commentItem);
            for (const element of connectedElements) {
              const bounds = createElementBounds(element);
              const labelId = generateId("label");

              actions.addLabelInstance({
                id: labelId,
                bounds,
                tagName: commentItem.tagName,
                componentName: commentItem.componentName,
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

    const handleCommentItemHover = (commentItemId: string | null) => {
      clearCommentsHoverPreviews();
      if (!commentItemId) return;

      const item = commentItems().find((innerItem) => innerItem.id === commentItemId);
      if (!item) return;
      showCommentItemPreview(item, "comment-hover");
    };

    const handleCommentsButtonHover = (isHovered: boolean) => {
      cancelCommentsHoverOpenTimeout();
      clearCommentsHoverPreviews();
      if (isHovered) {
        cancelCommentsHoverCloseTimeout();
        if (commentsDropdownPosition() === null && clearPromptPosition() === null) {
          showAllCommentItemPreviews();
          commentsHoverOpenTimeoutId = setTimeout(() => {
            commentsHoverOpenTimeoutId = null;
            setIsCommentsHoverOpen(true);
            openCommentsDropdown();
          }, DROPDOWN_HOVER_OPEN_DELAY_MS);
        }
      } else if (isCommentsHoverOpen()) {
        scheduleCommentsHoverClose();
      }
    };

    const handleCommentsDropdownHover = (isHovered: boolean) => {
      if (isHovered) {
        cancelCommentsHoverCloseTimeout();
      } else if (isCommentsHoverOpen()) {
        scheduleCommentsHoverClose();
      }
    };

    const handleCommentsCopyAllHover = (isHovered: boolean) => {
      clearCommentsHoverPreviews();
      if (isHovered) {
        cancelCommentsHoverCloseTimeout();
        showAllCommentItemPreviews();
      } else if (isCommentsHoverOpen()) {
        scheduleCommentsHoverClose();
      }
    };

    const showAllCommentItemPreviews = () => {
      for (const item of commentItems()) {
        showCommentItemPreview(item, "comment-all-hover");
      }
    };

    const handleCommentsClear = () => {
      commentElementMap.clear();
      const updatedCommentItems = clearComments();
      setCommentItems(updatedCommentItems);
      dismissCommentsDropdown();
    };

    const handleShowContextMenuInstance = (instanceId: string) => {
      const instance = store.labelInstances.find(
        (labelInstance) => labelInstance.id === instanceId,
      );
      if (!instance?.element) return;
      if (!isElementConnected(instance.element)) return;

      const contextMenuElement = instance.element;
      const center = getBoundsCenter(createElementBounds(contextMenuElement));
      const position = {
        x: instance.mouseX ?? center.x,
        y: center.y,
      };

      const elementsToFreeze =
        instance.elements && instance.elements.length > 0
          ? instance.elements.filter((element) => isElementConnected(element))
          : [contextMenuElement];

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
        actions.showContextMenu(position, contextMenuElement);
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
      // The renderer is dynamically imported because solid-js/web's
      // solid-js/web's delegateEvents() runs at module evaluation time and
      // accesses document, which would crash during SSR.
      void import("../components/renderer.js")
        .then(({ ReactGrabRenderer }) => {
          if (disposed) return;
          disposeRenderer = render(() => {
            return (
              <ReactGrabRenderer
                selectionVisible={selectionVisible()}
                selectionBounds={selectionBounds()}
                selectionBoundsMultiple={selectionBoundsMultiple()}
                selectionShouldSnap={
                  store.frozenElements.length > 0 || dragPreviewBounds().length > 0
                }
                inspectVisible={isInspectMode() && inspectBounds().length > 0}
                inspectBounds={inspectBounds()}
                selectionElementsCount={store.frozenElements.length}
                selectionFilePath={store.selectionFilePath ?? undefined}
                selectionLineNumber={store.selectionLineNumber ?? undefined}
                selectionTagName={selectionTagName()}
                selectionComponentName={resolvedComponentName()}
                selectionLabelVisible={selectionLabelVisible()}
                selectionLabelStatus="idle"
                selectionActionCycleState={actionCycleState()}
                selectionArrowNavigationState={arrowNavigationState()}
                onArrowNavigationSelect={handleArrowNavigationSelect}
                inspectNavigationState={inspectNavigationState()}
                onInspectSelect={handleInspectSelect}
                labelInstances={computedLabelInstances()}
                dragVisible={dragVisible()}
                dragBounds={dragBounds()}
                grabbedBoxes={computedGrabbedBoxes()}
                mouseX={store.frozenElements.length > 1 ? undefined : cursorPosition().x}
                isFrozen={isFrozenPhase() || isActivated() || isToolbarSelectHovered()}
                inputValue={store.inputText}
                isPromptMode={isPromptMode()}
                onShowContextMenuInstance={handleShowContextMenuInstance}
                onLabelInstanceHoverChange={handleLabelInstanceHoverChange}
                onInputChange={actions.setInputText}
                onInputSubmit={() => void handleInputSubmit()}
                onToggleExpand={handleToggleExpand}
                isPendingDismiss={isPendingDismiss()}
                selectionLabelShakeCount={selectionLabelShakeCount()}
                onConfirmDismiss={handleConfirmDismiss}
                onCancelDismiss={handleCancelDismiss}
                toolbarVisible={pluginRegistry.store.theme.toolbar.enabled}
                isActive={isActivated()}
                onToggleActive={handleToggleActive}
                enabled={isEnabled()}
                shakeCount={toolbarShakeCount()}
                onToolbarStateChange={(state) => {
                  setCurrentToolbarState(state);
                  if (state.enabled !== isEnabled()) {
                    setIsEnabled(state.enabled);
                    if (!state.enabled) {
                      forceDeactivateAll();
                      dismissAllPopups();
                    }
                  }
                  toolbarStateChangeCallbacks.forEach((callback) => callback(state));
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
                actionContext={contextMenuActionContext()}
                onContextMenuDismiss={handleContextMenuDismiss}
                onContextMenuHide={deferHideContextMenu}
                commentItems={commentItems()}
                commentsDisconnectedItemIds={commentsDisconnectedItemIds()}
                commentItemCount={commentItems().length}
                clockFlashTrigger={clockFlashTrigger()}
                commentsDropdownPosition={commentsDropdownPosition()}
                isCommentsPinned={commentsDropdownPosition() !== null && !isCommentsHoverOpen()}
                onToggleComments={handleToggleComments}
                onCopyAll={handleCommentsCopyAll}
                onCopyAllHover={handleCommentsCopyAllHover}
                onCommentsButtonHover={handleCommentsButtonHover}
                onCommentItemSelect={handleCommentItemSelect}
                onCommentItemHover={handleCommentItemHover}
                onCommentsCopyAll={handleCommentsCopyAll}
                onCommentsCopyAllHover={handleCommentsCopyAllHover}
                onCommentsClear={handleCommentsClear}
                onCommentsDismiss={dismissCommentsDropdown}
                onCommentsDropdownHover={handleCommentsDropdownHover}
                toolbarMenuPosition={toolbarMenuPosition()}
                toolbarMenuActions={pluginRegistry.store.actions.filter(
                  (action) => action.showInToolbarMenu === true,
                )}
                defaultActionId={currentToolbarState()?.defaultAction ?? DEFAULT_ACTION_ID}
                onSetDefaultAction={handleSetDefaultAction}
                onToggleToolbarMenu={handleToggleToolbarMenu}
                onToolbarMenuDismiss={dismissToolbarMenu}
                clearPromptPosition={clearPromptPosition()}
                onClearCommentsConfirm={() => {
                  confirmClear();
                  dismissClearPrompt();
                  handleCommentsClear();
                }}
                onClearCommentsCancel={dismissClearPrompt}
              />
            );
          }, rendererRoot);
        })
        .catch((error) => {
          console.warn("[react-grab] Failed to load renderer:", error);
        });
    }

    const copyElementAPI = async (elements: Element | Element[]): Promise<boolean> => {
      const elementsArray = Array.isArray(elements) ? elements : [elements];
      if (elementsArray.length === 0) return false;
      return await copyWithFallback(elementsArray);
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
        updateToolbarState({ enabled, collapsed: !enabled });
        if (!enabled) {
          forceDeactivateAll();
          dismissAllPopups();
        }
      },
      getToolbarState: () => loadToolbarState(),
      setToolbarState: (state: Partial<ToolbarState>) => {
        const currentState = loadToolbarState();
        const resolvedCollapsed = state.collapsed ?? currentState?.collapsed ?? false;
        const newState: ToolbarState = {
          edge: state.edge ?? currentState?.edge ?? "bottom",
          ratio: state.ratio ?? currentState?.ratio ?? TOOLBAR_DEFAULT_POSITION_RATIO,
          collapsed: resolvedCollapsed,
          enabled: !resolvedCollapsed,
          defaultAction: state.defaultAction ?? currentState?.defaultAction ?? DEFAULT_ACTION_ID,
        };
        saveToolbarState(newState);
        setCurrentToolbarState(newState);
        if (newState.enabled !== isEnabled()) {
          setIsEnabled(newState.enabled);
          if (!newState.enabled) {
            forceDeactivateAll();
            dismissAllPopups();
          }
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
        disposed = true;
        hasInited = false;
        disposeRenderer?.();
        cancelCommentsHoverOpenTimeout();
        cancelCommentsHoverCloseTimeout();
        stopTrackingDropdownPosition();
        toolbarStateChangeCallbacks.clear();
        dispose();
      },
      copyElement: copyElementAPI,
      getSource: async (element: Element): Promise<SourceInfo | null> => {
        const source = await resolveSource(element);
        if (!source) return null;
        return {
          filePath: source.filePath,
          lineNumber: source.lineNumber,
          componentName: source.componentName,
        };
      },
      getStackContext,
      getState: (): ReactGrabState => ({
        isActive: isActivated(),
        isDragging: isDragging(),
        isCopying: isCopying(),
        isPromptMode: isPromptMode(),
        isSelectionBoxVisible: Boolean(selectionVisible()),
        isDragBoxVisible: Boolean(dragVisible()),
        targetElement: targetElement(),
        dragBounds: dragBounds() ?? null,
        grabbedBoxes: [...publicGrabbedBoxes()],
        labelInstances: [...publicLabelInstances()],
        selectionFilePath: store.selectionFilePath,
        toolbarState: currentToolbarState(),
      }),
      setOptions: (newOptions: SettableOptions) => {
        pluginRegistry.setOptions(newOptions);
      },
      registerPlugin: (plugin: Plugin) => {
        pluginRegistry.register(plugin, api);
      },
      unregisterPlugin: (name: string) => {
        pluginRegistry.unregister(name);
      },
      getPlugins: () => pluginRegistry.getPluginNames(),
      getDisplayName: getComponentDisplayName,
    };

    for (const plugin of builtInPlugins) {
      pluginRegistry.register(plugin, api);
    }

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
  SettableOptions,
  ContextMenuAction,
  ActionContext,
  Plugin,
  PluginConfig,
  PluginHooks,
} from "../types.js";

export { generateSnippet } from "../utils/generate-snippet.js";
export { copyContent } from "../utils/copy-content.js";
