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
  mapArray,
  untrack,
} from "solid-js";
import { render } from "solid-js/web";
import { createGrabStore } from "./store.js";
import { CopyFailedError } from "../errors.js";
import {
  isKeyboardEventTriggeredByInput,
  hasTextSelectionInInput,
  hasTextSelectionOnPage,
} from "../utils/is-keyboard-event-triggered-by-input.js";
import { mountRoot } from "../utils/mount-root.js";
import {
  getScopeContainer,
  setScopeContainer,
  ignoreRealInput,
  IS_DEMO,
} from "../utils/runtime-mode.js";
import { createComponentNameForElement } from "../utils/create-component-name-for-element.js";
import { watchAppTheme } from "../utils/detect-app-theme.js";
import {
  nativeCancelAnimationFrame,
  nativeRequestAnimationFrame,
  waitUntilNextFrame,
} from "../utils/native-raf.js";
import {
  getStackContext,
  getNearestComponentName,
  getComponentDisplayName,
  resolveSource,
} from "./context.js";
import { isNextProjectRuntime } from "../utils/is-next-project-runtime.js";
import { createNoopApi } from "./noop-api.js";
import { createEventListenerManager } from "./events.js";
import { runCopyFlow } from "./copy.js";
import {
  clearElementPositionCache,
  getElementAtPosition,
  getElementsAtPoint,
} from "../utils/get-element-at-position.js";
import {
  clearVisibilityCache,
  isValidGrabbableElement,
} from "../utils/is-valid-grabbable-element.js";
import { isRootElement } from "../utils/is-root-element.js";
import { isElementConnected } from "../utils/is-element-connected.js";
import { getElementsInDrag } from "../utils/get-elements-in-drag.js";
import { getElementAnchorRatio } from "../utils/get-element-anchor-ratio.js";
import { createElementBounds } from "../utils/create-element-bounds.js";
import { invalidateInteractionCaches } from "../utils/invalidate-interaction-caches.js";
import { normalizeErrorMessage } from "../utils/normalize-error.js";
import {
  createBoundsFromDragRect,
  createFlatOverlayBounds,
  createPageRectFromBounds,
} from "../utils/create-bounds-from-drag-rect.js";
import { getTagName } from "../utils/get-tag-name.js";
import { buildElementHierarchy } from "../utils/build-element-hierarchy.js";
import { isHorizontallyGrabbable } from "../utils/is-horizontally-grabbable.js";
import {
  ARROW_KEYS,
  FADE_DURATION_MS,
  FEEDBACK_DURATION_MS,
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
  MIN_HOLD_FOR_ACTIVATION_AFTER_COPY_MS,
  ZOOM_DETECTION_THRESHOLD,
  WINDOW_REFOCUS_GRACE_PERIOD_MS,
  PREVIEW_TEXT_MAX_LENGTH,
  NEXTJS_REVALIDATION_DELAY_MS,
  TOOLBAR_DEFAULT_POSITION_RATIO,
  DEFAULT_ACTION_ID,
  COMMENT_ACTION_ID,
  EDIT_ACTION_ID,
  REACT_GRAB_ATTRIBUTE_NAME,
  REACT_GRAB_INPUT_ATTRIBUTE,
} from "../constants.js";
import { getBoundsCenter } from "../utils/get-bounds-center.js";
import { hideFromThirdParties } from "../utils/hide-from-third-parties.js";
import { detectCspNonce } from "../utils/detect-csp-nonce.js";
import { isCLikeKey } from "../utils/is-c-like-key.js";
import { isTargetKeyCombination } from "../utils/is-target-key-combination.js";
import { parseActivationKey } from "../utils/parse-activation-key.js";
import { isEventFromOverlay } from "../utils/is-event-from-overlay.js";
import { requestOpenFile } from "../utils/open-file.js";
import { combineBounds } from "../utils/combine-bounds.js";
import type {
  Position,
  Options,
  OverlayBounds,
  GrabbedBox,
  ReactGrabAPI,
  ReactGrabState,
  SelectionLabelInstance,
  ContextMenuActionContext,
  HierarchyState,
  HierarchyEntry,
  FrozenLabelEntry,
  PerformWithFeedbackOptions,
  SettableOptions,
  SourceInfo,
  SelectedElementPayload,
  Plugin,
  ToolbarState,
  DropdownAnchor,
  ElementLabelVariant,
} from "../types.js";
import { createEditModeController, type EditModeOverrides } from "./edit-mode.js";
import { createPluginRegistry } from "./plugin-registry.js";
import { createLabelController } from "./label-controller.js";
import { createArrowNavigator } from "./arrow-navigation.js";
import { getRequiredModifiers, setupKeyboardEventClaimer } from "./keyboard-handlers.js";
import { createAutoScroller, getAutoScrollDirection } from "./auto-scroll.js";
import { logIntro } from "./log-intro.js";
import { getScriptOptions } from "../utils/get-script-options.js";
import { isEnterCode } from "../utils/is-enter-code.js";
import { isMac } from "../utils/is-mac.js";
import { isPositionInsideBounds } from "../utils/is-position-inside-bounds.js";
import { loadToolbarState, saveToolbarState } from "../components/toolbar/state.js";
import { createModifierTracker } from "../utils/modifier-tracker.js";
import { copyPlugin } from "./plugins/copy.js";
import { commentPlugin } from "./plugins/comment.js";
import { editPlugin } from "./plugins/edit.js";
import { openPlugin } from "./plugins/open.js";
import { freezeAnimations, freezeAllAnimations } from "../utils/freeze-animations.js";
import {
  freezeGlobalInteractions,
  unfreezeGlobalInteractions,
} from "../utils/freeze-global-interactions.js";
import { freezeUpdates } from "../utils/freeze-updates.js";
import { generateId } from "../utils/generate-id.js";
import { logRecoverableError } from "../utils/log-recoverable-error.js";
import { getNearestEdge } from "../utils/get-nearest-edge.js";
import { findShortcutAction } from "../utils/action-shortcuts.js";
import { createKeyboardSelectionController } from "./keyboard-selection.js";

const builtInPlugins = [copyPlugin, editPlugin, commentPlugin, openPlugin];

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

interface LabeledCopyOptions {
  primaryElement: Element;
  targetElements: Element[];
  labelInstanceIds: string[];
  extraPrompt?: string;
  shouldDeactivateAfter?: boolean;
  onComplete?: () => void;
}

interface CopyRetryEntry {
  operation: () => Promise<boolean>;
  siblingIds: Set<string>;
  shouldDeactivateAfter: boolean;
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
    ...scriptOptions,
    ...rawOptions,
  };

  if (initialOptions.enabled === false || hasInited) {
    return createNoopApi();
  }
  hasInited = true;

  // Applied here - after the single-init guard - so a no-op init can never leave
  // the scope singleton pointing at a disposed/aliased container. Reset on
  // cleanup below. Set before the renderer mounts so the toolbar anchors to the
  // container on first paint.
  setScopeContainer(initialOptions.container ?? null);

  // The demo build is a display-only showcase, not an install: no console
  // banner, no version-check fetch (whose "outdated" nag would hit every
  // visitor whenever the bundled version drifts from the published one).
  if (!IS_DEMO) {
    logIntro(initialOptions.telemetry !== false);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- omit init-only options that aren't part of SettableOptions
  const {
    enabled: _enabled,
    telemetry: _telemetry,
    container: _container,
    ...settableOptions
  } = initialOptions;

  return createRoot((dispose) => {
    let disposed = false;
    let disposeRenderer: (() => void) | undefined;

    const pluginRegistry = createPluginRegistry(settableOptions);

    const { store, actions, pointer, viewportVersion, current } = createGrabStore({
      keyHoldDuration: pluginRegistry.store.options.keyHoldDuration ?? DEFAULT_KEY_HOLD_DURATION_MS,
    });

    const isHoldingKeys = createMemo(() => current().state === "holding");
    const isActivated = createMemo(() => current().state === "active");
    const isFrozenPhase = createMemo(() => {
      const currentState = current();
      return currentState.state === "active" && currentState.phase === "frozen";
    });
    const isDragging = createMemo(() => {
      const currentState = current();
      return (
        currentState.state === "active" &&
        (currentState.phase === "dragging-select" || currentState.phase === "dragging-reposition")
      );
    });
    // True only when the drag has actually moved beyond the click threshold.
    // We use this for selection-visibility decisions so a click (which
    // momentarily enters the dragging-select phase between pointerdown and
    // pointerup) does not flash the selection bounds off and back on.
    const isActivelyDragging = createMemo(() => {
      if (!isDragging()) return false;
      const deltaX = Math.abs(pointer().x + window.scrollX - store.dragStart.x);
      const deltaY = Math.abs(pointer().y + window.scrollY - store.dragStart.y);
      return deltaX > DRAG_THRESHOLD_PX || deltaY > DRAG_THRESHOLD_PX;
    });
    const isDragRepositioning = createMemo(() => {
      const currentState = current();
      return currentState.state === "active" && currentState.phase === "dragging-reposition";
    });
    const didJustDrag = createMemo(() => {
      const currentState = current();
      return currentState.state === "active" && currentState.phase === "justDragged";
    });
    const isCopying = createMemo(() => current().state === "copying");
    const isSelectionInteractionLocked = createMemo(() => store.selectionInteractionLockDepth > 0);
    const didJustCopy = createMemo(() => current().state === "justCopied");
    const isPromptMode = createMemo(() => {
      const currentState = current();
      return currentState.state === "active" && Boolean(currentState.isPromptMode);
    });
    const isCommentMode = createMemo(() => store.pendingCommentMode || isPromptMode());
    const isPendingDismiss = createMemo(() => {
      const currentState = current();
      return (
        currentState.state === "active" &&
        Boolean(currentState.isPromptMode) &&
        Boolean(currentState.isPendingDismiss)
      );
    });

    const setHostBodyStyle = (property: "userSelect" | "touchAction", value: string) => {
      if (IS_DEMO) return;
      document.body.style[property] = value;
    };

    createEffect(
      on(isActivated, (activated, previousActivated) => {
        if (activated && !previousActivated) {
          // Demo-safe: the collect/apply phases inside are gated on IS_DEMO at
          // the util level, so this never freezes the host page in demo builds.
          freezeGlobalInteractions(pointer().x, pointer().y);
          setHostBodyStyle("touchAction", "none");
        } else if (!activated && previousActivated) {
          unfreezeGlobalInteractions();
          setHostBodyStyle("touchAction", "");
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
    const isShiftKeyHeld = createModifierTracker((event) => event.shiftKey);
    const [toolbarMenuPosition, setToolbarMenuPosition] = createSignal<DropdownAnchor | null>(null);
    const [editPanelPosition, setEditPanelPosition] = createSignal<DropdownAnchor | null>(null);
    const [hierarchyMenuPosition, setHierarchyMenuPosition] = createSignal<DropdownAnchor | null>(
      null,
    );
    // Forward-ref wrappers because activateRenderer / deactivateRenderer /
    // performCopyWithLabel are declared later in this scope. The wrappers
    // are captured by the controller; the underlying lookups happen at
    // call time (inside event handlers), by which point the bindings have
    // been initialized.
    const editMode = createEditModeController({
      store,
      actions,
      isActivated,
      activateRenderer: () => activateRenderer(),
      deactivateRenderer: () => deactivateRenderer(),
      performCopyWithLabel: (options) => performCopyWithLabel(options),
      onOpen: () => {
        dismissToolbarMenu();
        stopEditPanelTracking?.();
        stopEditPanelTracking = trackDropdownPosition(computeEditPanelAnchor, setEditPanelPosition);
      },
      onClose: () => {
        stopEditPanelTracking?.();
        stopEditPanelTracking = null;
        setEditPanelPosition(null);
      },
    });

    const isModalPopoverOpen = createMemo(
      () => store.contextMenuPosition !== null || editMode.isOpen(),
    );
    const isAnyPopoverOpen = createMemo(
      () => isModalPopoverOpen() || toolbarMenuPosition() !== null,
    );
    let toolbarElement: HTMLDivElement | undefined;
    let stopToolbarMenuTracking: (() => void) | null = null;
    let stopEditPanelTracking: (() => void) | null = null;
    let didSwitchEditTargetOnPointerDown = false;

    let shiftSelectionLabelAnchorRatioByElement = new WeakMap<Element, number>();
    const keyboardSelection = createKeyboardSelectionController();

    const isElementDetectionBlocked = () =>
      !isEnabled() ||
      isPromptMode() ||
      isSelectionInteractionLocked() ||
      isModalPopoverOpen() ||
      keyboardSelection.isPendingDismiss();

    const clearShiftSelectionLabelAnchors = () => {
      shiftSelectionLabelAnchorRatioByElement = new WeakMap<Element, number>();
    };

    const stopShiftMultiSelecting = () => {
      setIsShiftMultiSelecting(false);
      clearShiftSelectionLabelAnchors();
    };

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
      if (current().state !== "holding") {
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
      const currentState = current();
      if (currentState.state !== "active" || currentState.phase !== "justDragged") return;
      const timerId = setTimeout(() => {
        actions.finishJustDragged();
      }, FEEDBACK_DURATION_MS);
      onCleanup(() => clearTimeout(timerId));
    });

    createEffect(() => {
      if (current().state !== "justCopied") return;
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
        actions.enterPromptMode({ x: pointer().x, y: pointer().y }, element);
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
    const [scrollVersion, setScrollVersion] = createSignal(0);
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
    const releaseDragPreview = () => {
      if (dragPreviewDebounceTimerId !== null) {
        clearTimeout(dragPreviewDebounceTimerId);
        dragPreviewDebounceTimerId = null;
      }
      setDebouncedDragPointer(null);
      // Memos hold their last value until re-read. Once the drag is over
      // nothing may render the preview again, which would pin the captured
      // Element[] (and any since-detached subtrees) in memory — reading the
      // invalidated memo here recomputes it to [] and drops those references.
      void dragPreviewElements();
    };
    let keydownSpamTimerId: number | null = null;
    const activationHoldState = {
      timerId: null as number | null,
      startTimestamp: null as number | null,
      copyWaiting: false,
      holdTimerFired: false,
    };
    let previousSpaceDragPointerPage: Position | null = null;
    const [isShiftMultiSelecting, setIsShiftMultiSelecting] = createSignal(false);
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
    let selectionSourceRequestVersion = 0;
    let componentNameDebounceTimerId: number | null = null;
    let pendingDefaultActionId: string | null = null;
    const [isPendingContextMenuSelect, setIsPendingContextMenuSelect] = createSignal(false);
    const [pendingToolbarActionId, setPendingToolbarActionId] = createSignal<string | null>(null);
    const [debouncedElementForComponentName, setDebouncedElementForComponentName] =
      createSignal<Element | null>(null);
    const [resolvedComponentName, setResolvedComponentName] = createComponentNameForElement(
      debouncedElementForComponentName,
    );
    const toolbarActiveActionId = createMemo(() => {
      if (editMode.isOpen()) return EDIT_ACTION_ID;
      if (isCommentMode()) return COMMENT_ACTION_ID;
      if (isPendingContextMenuSelect()) return pendingToolbarActionId();
      if (isActivated()) return DEFAULT_ACTION_ID;
      return null;
    });
    // Composed once so ArrowLeft/ArrowRight reachability and the hierarchy
    // tree's sibling rows can never diverge.
    const isNavigableSibling = (element: Element) =>
      isHorizontallyGrabbable(element, isValidGrabbableElement);
    const arrowNavigator = createArrowNavigator(
      isValidGrabbableElement,
      isNavigableSibling,
      createElementBounds,
    );

    const autoScroller = createAutoScroller(
      pointer,
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
          const { pageX, pageY } = toPageCoordinates(pointer().x, pointer().y);
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

      // Keep the box in the store through the canvas fade-out so its bounds
      // keep tracking the element; once removed, the canvas remnant is
      // orphaned and would freeze at stale coordinates if layout shifts.
      const timeoutId = window.setTimeout(() => {
        grabbedBoxTimeouts.delete(boxId);
        actions.removeGrabbedBox(boxId);
      }, FEEDBACK_DURATION_MS + FADE_DURATION_MS);
      grabbedBoxTimeouts.set(boxId, timeoutId);
    };

    const notifyElementsSelected = async (elements: Element[]): Promise<void> => {
      const elementsPayload: SelectedElementPayload[] = await Promise.all(
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

    // Per-label retry entries, registered when a copy fails so the error view's
    // Retry button (and Enter key) can re-run the exact same operation. Grouped
    // instances (a multi-element grab) share one entry whose siblingIds set is
    // the live membership: acknowledging one instance drops it from the set so a
    // later Retry never resurrects a dismissed label.
    const retryCopyByInstanceId = new Map<string, CopyRetryEntry>();

    const labelController = createLabelController(
      actions,
      () => store.labelInstances,
      () => retryCopyByInstanceId.clear(),
    );

    const attemptClipboardAndLabel = async (
      clipboardOperation: () => Promise<boolean>,
      labelInstanceIds: string[] | null,
    ): Promise<boolean> => {
      let didSucceed = false;
      let errorMessage: string | undefined;

      try {
        didSucceed = await clipboardOperation();
        if (!didSucceed) errorMessage = "Failed to copy";
      } catch (error) {
        errorMessage = normalizeErrorMessage(error, "Action failed");
      }

      if (labelInstanceIds) {
        for (const labelInstanceId of labelInstanceIds) {
          labelController.updateAfterCopy(labelInstanceId, didSucceed, errorMessage);
        }
      }

      return didSucceed;
    };

    const registerCopyRetry = (
      didSucceed: boolean,
      clipboardOperation: () => Promise<boolean>,
      labelInstanceIds: string[],
      shouldDeactivateAfter: boolean,
    ) => {
      if (didSucceed) {
        for (const labelInstanceId of labelInstanceIds) {
          retryCopyByInstanceId.delete(labelInstanceId);
        }
        return;
      }

      const entry: CopyRetryEntry = {
        operation: clipboardOperation,
        siblingIds: new Set(labelInstanceIds),
        shouldDeactivateAfter,
      };
      for (const labelInstanceId of labelInstanceIds) {
        retryCopyByInstanceId.set(labelInstanceId, entry);
      }
    };

    const executeCopyOperation = async (
      clipboardOperation: () => Promise<boolean>,
      labelInstanceIds: string[] | null,
      shouldDeactivateAfter?: boolean,
    ) => {
      clearCopyFeedbackCooldown();
      if (current().state !== "copying") {
        actions.startCopy();
      }

      const didSucceed = await attemptClipboardAndLabel(clipboardOperation, labelInstanceIds);

      if (labelInstanceIds) {
        registerCopyRetry(
          didSucceed,
          clipboardOperation,
          labelInstanceIds,
          Boolean(shouldDeactivateAfter),
        );
      }

      if (current().state !== "copying") return;

      if (didSucceed) {
        actions.completeCopy();
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

    const handleRetryInstance = (instanceId: string) => {
      const entry = retryCopyByInstanceId.get(instanceId);
      if (!entry) return;
      const idsToRetry = [...entry.siblingIds];
      for (const labelInstanceId of idsToRetry) {
        labelController.markRetrying(labelInstanceId);
        retryCopyByInstanceId.delete(labelInstanceId);
      }
      // Route through the full copy path (not just the clipboard attempt) so a
      // recovered copy runs the same completion side effects as a first-try
      // success: completeCopy, re-activate or deactivate, and feedback cooldown.
      void executeCopyOperation(entry.operation, idsToRetry, entry.shouldDeactivateAfter);
    };

    const handleAcknowledgeErrorInstance = (instanceId: string) => {
      retryCopyByInstanceId.get(instanceId)?.siblingIds.delete(instanceId);
      retryCopyByInstanceId.delete(instanceId);
      labelController.dismissInstance(instanceId);
    };

    const copyResolvedElements = (
      elements: Element[],
      extraPrompt?: string,
      resolvedComponentName?: string,
    ) => {
      const firstElement = elements[0];
      const componentName =
        resolvedComponentName ?? (firstElement ? getComponentDisplayName(firstElement) : null);
      const tagName = firstElement ? getTagName(firstElement) : null;
      const elementName = componentName ?? tagName ?? undefined;

      return runCopyFlow(
        {
          getContent: pluginRegistry.store.options.getContent,
          componentName: elementName,
          maxContextLines: pluginRegistry.store.options.maxContextLines,
        },
        pluginRegistry.hooks,
        elements,
        extraPrompt,
      );
    };

    const copyElementsToClipboard = async (
      targetElements: Element[],
      extraPrompt?: string,
      resolvedComponentName?: string,
    ): Promise<boolean> => {
      if (targetElements.length === 0) return false;

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

      let didCopy = true;
      if (unhandledElements.length > 0) {
        didCopy = await copyResolvedElements(unhandledElements, extraPrompt, resolvedComponentName);
      }
      if (pendingResults.length > 0) {
        const results = await Promise.all(pendingResults);
        if (!results.every(Boolean)) {
          throw new CopyFailedError();
        }
      }
      void notifyElementsSelected(targetElements);
      return didCopy;
    };

    const runLabeledCopy = (copy: LabeledCopyOptions) => {
      void getNearestComponentName(copy.primaryElement)
        .then(async (componentName) => {
          await executeCopyOperation(
            () =>
              copyElementsToClipboard(
                copy.targetElements,
                copy.extraPrompt,
                componentName ?? undefined,
              ),
            copy.labelInstanceIds.length > 0 ? copy.labelInstanceIds : null,
            copy.shouldDeactivateAfter,
          );
          copy.onComplete?.();
        })
        .catch((error) => {
          logRecoverableError("Copy operation failed", error);
          const normalizedMessage = normalizeErrorMessage(error, "Action failed");
          for (const labelInstanceId of copy.labelInstanceIds) {
            labelController.updateAfterCopy(labelInstanceId, false, normalizedMessage);
          }
          if (copy.labelInstanceIds.length > 0) {
            registerCopyRetry(
              false,
              () =>
                getNearestComponentName(copy.primaryElement).then((componentName) =>
                  copyElementsToClipboard(
                    copy.targetElements,
                    copy.extraPrompt,
                    componentName ?? undefined,
                  ),
                ),
              copy.labelInstanceIds,
              Boolean(copy.shouldDeactivateAfter),
            );
          }
          if (current().state === "copying") {
            actions.unfreeze();
          }
        });
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

      // Reuse the live selection-box bounds when copying the currently-selected
      // element: the selectionBounds memo already holds them (computed during the
      // overlay render and cached until the next viewport change). Re-measuring
      // via createElementBounds() here instead forces a full-document style/layout
      // recalc — ~85ms on large apps — because the freeze stylesheet has dirtied
      // style since the box was last measured. Falls back to a fresh measure when
      // copying an element that isn't the current selection (e.g. context menu).
      const reusableSelectionBounds =
        !isMultiSelect && element === selectionElement() ? selectionBounds() : undefined;
      const labelBounds =
        dragRect && isMultiSelect
          ? createBoundsFromDragRect(dragRect)
          : (reusableSelectionBounds ?? createElementBounds(element));

      const labelCursorX = isMultiSelect ? labelBounds.x + labelBounds.width / 2 : cursorX;

      const tagName = getTagName(element);
      clearCopyFeedbackCooldown();
      actions.startCopy();

      const labelInstanceId = tagName
        ? labelController.createInstance(labelBounds, tagName, undefined, "copying", {
            element,
            mouseX: labelCursorX,
            elements: selectedElements,
          })
        : null;

      runLabeledCopy({
        primaryElement: element,
        targetElements: allTargetElements,
        labelInstanceIds: labelInstanceId ? [labelInstanceId] : [],
        extraPrompt,
        shouldDeactivateAfter,
        onComplete,
      });
    };

    const performCopyWithPerElementLabels = (options: {
      elements: Element[];
      labelEntries: Array<{
        element: Element;
        tagName: string;
        componentName?: string;
        mouseX?: number;
      }>;
      shouldDeactivateAfter?: boolean;
      onComplete?: () => void;
    }) => {
      const { elements, labelEntries, shouldDeactivateAfter, onComplete } = options;
      const primaryElement = elements[0];

      clearCopyFeedbackCooldown();
      actions.startCopy();

      const labelInstanceIds = labelController.createPerElementInstances(labelEntries, "copying");

      runLabeledCopy({
        primaryElement,
        targetElements: elements,
        labelInstanceIds,
        shouldDeactivateAfter,
        onComplete,
      });
    };

    const targetElement = createMemo(() => {
      void viewportVersion();
      if (
        !isRendererActive() ||
        isActivelyDragging() ||
        isSelectionInteractionLocked() ||
        keyboardSelection.isPendingDismiss()
      )
        return null;
      const element = store.detectedElement;
      if (!isElementConnected(element)) return null;
      return element;
    });

    const effectiveElement = createMemo(
      () => store.frozenElement || (isFrozenPhase() ? null : targetElement()),
    );

    // The hierarchy dropdown appears while keyboard-navigating a frozen
    // selection (arrow keys / Tab), and — for on-demand inspection — for the
    // hovered element whenever Shift is held. It is suppressed in the modes
    // where it would be noise or would intercept input (prompt, shift
    // multi-select, copying, an open popover, or a pending mouse-handoff).
    const hierarchySourceElement = createMemo(() => {
      if (!isActivated()) return null;
      if (isPromptMode() || isShiftMultiSelecting() || isCopying()) return null;
      if (isAnyPopoverOpen()) return null;
      if (keyboardSelection.isPendingDismiss()) return null;
      // Without Shift the tree only follows an active keyboard-navigation
      // selection — not every frozen element, so it stays hidden during
      // drag-marquee selection or after a non-deactivating mouse copy.
      if (!isShiftKeyHeld()) return keyboardSelection.selectedElement();
      // With Shift the tree reveals the element under the cursor. While frozen
      // there is no live hover (pointer-move skips detection), so use the frozen
      // selection; while hovering, prefer the freshly hovered element over any
      // lingering frozenElement — cancelDrag / finishJustDragged return to the
      // "hovering" phase without clearing it.
      return isFrozenPhase() ? effectiveElement() : (targetElement() ?? store.frozenElement);
    });

    const hierarchyEntries = createMemo<HierarchyEntry[]>(() => {
      const source = hierarchySourceElement();
      return source
        ? buildElementHierarchy(source, isValidGrabbableElement, isNavigableSibling)
        : [];
    });
    const hierarchyActiveIndex = createMemo(() => {
      const source = hierarchySourceElement();
      if (!source) return 0;
      return Math.max(
        0,
        hierarchyEntries().findIndex((entry) => entry.element === source),
      );
    });
    const hasHierarchySource = createMemo(() => hierarchySourceElement() !== null);

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
      return isRendererActive() && !isActivelyDragging();
    };

    const frozenElementBoundsAccessors = mapArray(
      () => store.frozenElements,
      (element) =>
        createMemo(() => {
          void viewportVersion();
          return createElementBounds(element);
        }),
    );

    const frozenElementsBounds = createMemo((): OverlayBounds[] => {
      const frozenElements = store.frozenElements;
      if (frozenElements.length === 0) return [];

      const dragRect = store.frozenDragRect;
      if (dragRect && frozenElements.length > 1) {
        return [createBoundsFromDragRect(dragRect)];
      }

      return frozenElementBoundsAccessors().map((readBounds) => readBounds());
    });

    const pendingShiftSelectionElement = createMemo((): Element | null => {
      if (!isShiftMultiSelecting()) return null;
      if (store.pendingCommentMode || isPendingContextMenuSelect()) return null;

      const element = store.detectedElement;
      if (!isElementConnected(element)) return null;
      if (isRootElement(element)) return null;
      if (store.frozenElements.includes(element)) return null;

      return element;
    });

    const pendingShiftSelectionBounds = createMemo((): OverlayBounds | undefined => {
      void viewportVersion();
      const element = pendingShiftSelectionElement();
      if (!element) return undefined;
      return createElementBounds(element);
    });

    const selectionBounds = createMemo((): OverlayBounds | undefined => {
      void viewportVersion();

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

      const dragDistance = calculateDragDistance(pointer().x, pointer().y);

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
      const { pageX, pageY } = toPageCoordinates(pointer().x, pointer().y);
      previousSpaceDragPointerPage = { x: pageX, y: pageY };
    };

    const stopSpaceDragRepositioning = () => {
      actions.stopDragReposition();
      previousSpaceDragPointerPage = null;
    };

    const dragBounds = createMemo((): OverlayBounds | undefined => {
      void viewportVersion();

      if (!isDraggingBeyondThreshold()) return undefined;

      const drag = calculateDragRectangle(pointer().x, pointer().y);

      return createFlatOverlayBounds(drag);
    });

    // Membership (which elements the marquee covers) is the expensive half:
    // getElementsInDrag hit-tests up to ~100 sample points and validates every
    // candidate. It must NOT subscribe to viewportVersion — the 100ms bounds
    // interval bumps that signal while a drag is held still, which re-ran the
    // full sampling pass per tick and saturated the main thread on dense DOMs.
    // scrollVersion only changes on real scroll/resize, when content actually
    // moves under the marquee.
    const dragPreviewElements = createMemo((): Element[] => {
      void scrollVersion();

      if (!isDraggingBeyondThreshold()) return [];

      const pointer = debouncedDragPointer();
      if (!pointer) return [];

      const drag = calculateDragRectangle(pointer.x, pointer.y);
      const elements = getElementsInDrag(drag, isValidGrabbableElement);
      return elements.length > 0
        ? elements
        : getElementsInDrag(drag, isValidGrabbableElement, false);
    });

    const dragPreviewBounds = createMemo((): OverlayBounds[] => {
      void viewportVersion();
      return dragPreviewElements().map((element) => createElementBounds(element));
    });

    const selectionBoundsMultiple = createMemo((): OverlayBounds[] => {
      const previewBounds = dragPreviewBounds();
      if (previewBounds.length > 0) {
        return previewBounds;
      }
      const pendingBounds = pendingShiftSelectionBounds();
      if (pendingBounds) {
        return [...frozenElementsBounds(), pendingBounds];
      }
      return frozenElementsBounds();
    });

    const frozenLabelEntryAccessors = mapArray(
      () => store.frozenElements,
      (element) => {
        const tagName = getTagName(element) || "element";
        const componentName = getComponentDisplayName(element) ?? undefined;
        return createMemo<FrozenLabelEntry | null>(() => {
          void viewportVersion();
          if (!isElementConnected(element)) return null;
          const bounds = createElementBounds(element);
          const anchorRatio = shiftSelectionLabelAnchorRatioByElement.get(element);
          const mouseX =
            anchorRatio === undefined ? undefined : bounds.x + bounds.width * anchorRatio;
          return { tagName, componentName, bounds, mouseX };
        });
      },
    );

    const frozenLabelEntries = createMemo((): FrozenLabelEntry[] => {
      if (isPromptMode() || store.frozenElements.length < 2) return [];
      const entries: FrozenLabelEntry[] = [];
      for (const readEntry of frozenLabelEntryAccessors()) {
        const entry = readEntry();
        if (entry !== null) entries.push(entry);
      }
      return entries;
    });

    const pendingShiftPreviewEntry = createMemo((): FrozenLabelEntry | null => {
      if (isPromptMode()) return null;
      const element = pendingShiftSelectionElement();
      if (!element) return null;
      void viewportVersion();
      const tagName = getTagName(element) || "element";
      const componentName = getComponentDisplayName(element) ?? undefined;
      const bounds = createElementBounds(element);
      return { tagName, componentName, bounds, mouseX: pointer().x };
    });

    const cursorPosition = createMemo(() => {
      if (isCopying() || isPromptMode()) {
        void viewportVersion();
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
        x: pointer().x,
        y: pointer().y,
      };
    });

    const shiftSelectionLabelMouseX = createMemo((): number | undefined => {
      if (!isShiftMultiSelecting()) return undefined;
      if (store.frozenElements.length !== 1) return undefined;
      void viewportVersion();

      const element = store.frozenElements[0];
      if (!isElementConnected(element)) return undefined;

      const anchorRatio = shiftSelectionLabelAnchorRatioByElement.get(element);
      if (anchorRatio === undefined) return undefined;

      const bounds = createElementBounds(element);
      return bounds.x + bounds.width * anchorRatio;
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
        () => {
          const inputMode = isPromptMode();
          return {
            inputMode,
            position: inputMode ? pointer() : untrack(pointer),
            target: inputMode ? targetElement() : untrack(targetElement),
          };
        },
        ({ inputMode, position, target }) => {
          pluginRegistry.hooks.onPromptModeChange(inputMode, {
            x: position.x,
            y: position.y,
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
        () => {
          const visible = labelVisible();
          return [
            visible,
            labelVariant(),
            visible ? cursorPosition() : untrack(cursorPosition),
            visible ? targetElement() : untrack(targetElement),
            store.selectionFilePath,
            store.selectionLineNumber,
          ] as const;
        },
        ([visible, variant, position, element, filePath, lineNumber]) => {
          pluginRegistry.hooks.onElementLabel(visible, variant, {
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
      if (IS_DEMO) return;
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
      editMode.resetWithDiscard();
      dismissToolbarMenu();
      stopShiftMultiSelecting();
      clearKeyboardNavigation();
      keyboardSelection.clear();
      setIsPendingContextMenuSelect(false);
      setPendingToolbarActionId(null);
      if (wasDragging) {
        setHostBodyStyle("userSelect", "");
        releaseDragPreview();
      }
      if (keydownSpamTimerId) window.clearTimeout(keydownSpamTimerId);
      autoScroller.stop();
      // Calling .focus() forces a synchronous focus event dispatch and a style
      // recalc. Skip it when the target is <body> or already the active
      // element — both cases produce no observable focus change but were
      // previously paying the recalc cost on every deactivate.
      if (
        previousFocused instanceof HTMLElement &&
        previousFocused !== document.body &&
        previousFocused !== document.activeElement &&
        isElementConnected(previousFocused)
      ) {
        // preventScroll: restoring focus must not scroll the previously-focused
        // element into view — that jumps the page when the user grabbed
        // something after scrolling away from it.
        previousFocused.focus({ preventScroll: true });
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
      if (keyboardSelection.isPendingDismiss()) {
        discardKeyboardSelection();
        return;
      }
      actions.clearInputText();
      deactivateRenderer();
    };

    const handleCancelDismiss = () => {
      actions.setPendingDismiss(false);
    };

    const handleToggleExpand = () => {
      if (editMode.isOpen()) {
        editMode.dismiss();
        return;
      }
      const element = store.frozenElement || targetElement();
      if (!element) return;
      openEditMode(element, { x: pointer().x, y: pointer().y });
    };

    const openEditMode = (
      element: Element,
      position: Position,
      overrides: EditModeOverrides = {},
    ): boolean => editMode.trigger(element, position, overrides);

    const tryHandleEditModeElementSwitch = (clientX: number, clientY: number): boolean => {
      if (!editMode.isOpen() || store.contextMenuPosition !== null) return false;
      const element = getElementsAtPoint(clientX, clientY).find(isValidGrabbableElement);
      if (!element) return false;
      const didSwitch = editMode.switchToElement(element, { x: clientX, y: clientY });
      if (didSwitch) freezeAllAnimations([element]);
      return didSwitch;
    };

    const currentSelectionEditOverrides = (element: Element): EditModeOverrides => ({
      filePath: store.selectionFilePath ?? undefined,
      lineNumber: store.selectionLineNumber ?? undefined,
      componentName: resolvedComponentName(),
      tagName: getTagName(element) || undefined,
    });

    const clearPendingToolbarSelection = () => {
      pendingDefaultActionId = null;
      setIsPendingContextMenuSelect(false);
      actions.setPendingCommentMode(false);
      setPendingToolbarActionId(null);
    };

    const runActionForCurrentSelection = (actionId: string): boolean => {
      const element = store.frozenElement || targetElement();
      if (!element) return false;

      const position = { x: pointer().x, y: pointer().y };
      const action = pluginRegistry.store.actions.find(
        (registeredAction) => registeredAction.id === actionId,
      );
      if (!action) {
        actions.clearInputText();
        actions.exitPromptMode();
        clearPendingToolbarSelection();
        handleSetDefaultAction(DEFAULT_ACTION_ID);
        openContextMenu(element, position);
        return true;
      }

      if (actionId === EDIT_ACTION_ID) {
        const didOpen = openEditMode(element, position, currentSelectionEditOverrides(element));
        if (!didOpen) return true;
        actions.clearInputText();
        actions.exitPromptMode();
        clearPendingToolbarSelection();
        return true;
      }

      actions.clearInputText();
      actions.exitPromptMode();
      clearPendingToolbarSelection();
      action.onAction(buildImmediateActionContext(element, position));
      return true;
    };

    const handleActivateAction = (actionId: string) => {
      if (isActivated()) {
        // While still choosing an element, clicking a different action switches
        // the pending action in place instead of tearing down selection mode;
        // clicking the already-active action toggles selection off.
        if (toolbarActiveActionId() !== actionId && isPromptMode()) {
          if (runActionForCurrentSelection(actionId)) return;
        }
        if (toolbarActiveActionId() !== actionId && store.pendingCommentMode) {
          actions.setPendingCommentMode(false);
          pendingDefaultActionId = actionId;
          setPendingToolbarActionId(actionId);
          setIsPendingContextMenuSelect(true);
          return;
        }
        if (toolbarActiveActionId() !== actionId && isPendingContextMenuSelect()) {
          pendingDefaultActionId = actionId;
          setPendingToolbarActionId(actionId);
          return;
        }
        deactivateRenderer();
        return;
      }
      if (!isEnabled()) return;
      pendingDefaultActionId = actionId;
      setPendingToolbarActionId(actionId);
      setIsPendingContextMenuSelect(true);
      toggleActivate();
    };

    const handleToggleActive = () => {
      handleActivateAction(currentToolbarState()?.defaultAction ?? DEFAULT_ACTION_ID);
    };

    const enterCommentModeForElement = (element: Element, positionX: number, positionY: number) => {
      clearPendingToolbarSelection();
      actions.clearInputText();
      actions.enterPromptMode({ x: positionX, y: positionY }, element);
    };

    const openContextMenu = (element: Element, position: Position) => {
      stopShiftMultiSelecting();
      dismissAllPopups();
      actions.showContextMenu(position, element);
      clearKeyboardNavigation();
      pluginRegistry.hooks.onContextMenu(element, position);
    };

    const runPendingDefaultAction = (element: Element, position: Position) => {
      const actionId = pendingDefaultActionId;
      pendingDefaultActionId = null;
      setPendingToolbarActionId(null);
      if (!actionId) return;

      if (actionId === EDIT_ACTION_ID) {
        openEditMode(element, position, currentSelectionEditOverrides(element));
        return;
      }

      const action = pluginRegistry.store.actions.find(
        (registeredAction) => registeredAction.id === actionId,
      );
      if (!action) {
        handleSetDefaultAction(DEFAULT_ACTION_ID);
        openContextMenu(element, position);
        return;
      }

      action.onAction(buildImmediateActionContext(element, position));
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

    const handlePointerMove = (clientX: number, clientY: number, isShiftHeld: boolean) => {
      const shouldTrackPendingShiftSelection =
        isShiftHeld &&
        isShiftMultiSelecting() &&
        !isDragging() &&
        !store.pendingCommentMode &&
        !isPendingContextMenuSelect();

      if (isElementDetectionBlocked() || (isFrozenPhase() && !shouldTrackPendingShiftSelection)) {
        return;
      }

      actions.setPointer({ x: clientX, y: clientY });

      elementDetectionState.latestPointerX = clientX;
      elementDetectionState.latestPointerY = clientY;

      if (shouldTrackPendingShiftSelection) {
        const candidate = getElementAtPosition(clientX, clientY);
        if (candidate !== store.detectedElement) {
          actions.setDetectedElement(candidate);
        }
        return;
      }

      const now = performance.now();
      const isDetectionPending =
        elementDetectionState.pendingDetectionScheduledAt > 0 &&
        now - elementDetectionState.pendingDetectionScheduledAt < PENDING_DETECTION_STALENESS_MS;
      // Hover detection is skipped during an active drag: targetElement()
      // discards the result anyway, and each hit-test costs a full
      // elementFromPoint pass (~20ms on 100k-node DOMs). cancelActiveDrag
      // redetects on cancel; a committed drag enters the frozen phase.
      if (
        !isActivelyDragging() &&
        now - elementDetectionState.lastDetectionTimestamp >= ELEMENT_DETECTION_THROTTLE_MS &&
        !isDetectionPending
      ) {
        elementDetectionState.lastDetectionTimestamp = now;
        elementDetectionState.pendingDetectionScheduledAt = now;
        setTimeout(() => {
          if (isElementDetectionBlocked() || isActivelyDragging()) {
            elementDetectionState.pendingDetectionScheduledAt = 0;
            return;
          }
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

    const handlePointerDown = (clientX: number, clientY: number, isShiftHeld: boolean) => {
      if (!isRendererActive() || isSelectionInteractionLocked()) return false;

      if (!isShiftHeld && isShiftMultiSelecting()) {
        stopShiftMultiSelecting();
      }

      const shouldPreserveKeyboardSelection = keyboardSelection.selectedElement() !== null;
      actions.startDrag({ x: clientX, y: clientY }, isShiftHeld || shouldPreserveKeyboardSelection);
      actions.setPointer({ x: clientX, y: clientY });
      setHostBodyStyle("userSelect", "none");

      scheduleDragPreviewUpdate(clientX, clientY);

      pluginRegistry.hooks.onDragStart(clientX + window.scrollX, clientY + window.scrollY);

      return true;
    };

    const toggleShiftMultiSelection = (element: Element, pointer: Position) => {
      const wasElementSelected = store.frozenElements.includes(element);
      const isFirstFrozenElement = store.frozenElements.length === 0;

      if (!wasElementSelected) {
        const bounds = createElementBounds(element);
        const anchorRatio = getElementAnchorRatio(bounds, pointer);
        shiftSelectionLabelAnchorRatioByElement.set(element, anchorRatio);
        if (isFirstFrozenElement) {
          const componentName = getComponentDisplayName(element) ?? undefined;
          setResolvedComponentName(componentName);
        }
      }

      actions.toggleFrozenElement(element);
      clearElementPositionCache();
      const isElementStillSelected = store.frozenElements.includes(element);

      if (!isElementStillSelected) {
        shiftSelectionLabelAnchorRatioByElement.delete(element);
      }

      if (store.frozenElements.length === 0) {
        stopShiftMultiSelecting();
        actions.unfreeze();
        return;
      }

      // Animation freeze must run on the combined accumulated set, not just
      // on the toggled element. freezeAllAnimations unfreezes its previous
      // input before freezing its new input, so passing only [element] would
      // resume animations on every previously shift-clicked element.
      freezeAllAnimations(store.frozenElements);
      setIsShiftMultiSelecting(true);
      actions.setPointer(pointer);
      // After toggleFrozenElement, the most recently changed element is
      // either added (still in frozenElements) or removed. Anchor
      // lastGrabbed to a still-selected element rather than to one that
      // was just deselected.
      actions.setLastGrabbed(
        isElementStillSelected ? element : store.frozenElements[store.frozenElements.length - 1],
      );
      actions.freeze();
      clearKeyboardNavigation();
    };

    const commitShiftMultiSelection = () => {
      const accumulatedElements = store.frozenElements.filter(isElementConnected);

      const perElementLabelEntries = accumulatedElements.map((element) => {
        const tagName = getTagName(element) || "element";
        const componentName = getComponentDisplayName(element) ?? undefined;
        const anchorRatio = shiftSelectionLabelAnchorRatioByElement.get(element);
        const bounds = createElementBounds(element);
        const mouseX =
          anchorRatio === undefined
            ? bounds.x + bounds.width / 2
            : bounds.x + bounds.width * anchorRatio;
        return { element, tagName, componentName, mouseX };
      });

      stopShiftMultiSelecting();

      if (accumulatedElements.length === 0) {
        actions.unfreeze();
        return;
      }

      if (accumulatedElements.length === 1) {
        performCopyWithLabel({
          element: accumulatedElements[0],
          cursorX: perElementLabelEntries[0].mouseX,
          selectedElements: accumulatedElements,
          shouldDeactivateAfter: store.wasActivatedByToggle,
        });
        return;
      }

      performCopyWithPerElementLabels({
        elements: accumulatedElements,
        labelEntries: perElementLabelEntries,
        shouldDeactivateAfter: store.wasActivatedByToggle,
      });
    };

    const handleDragSelection = (
      dragSelectionRect: ReturnType<typeof calculateDragRectangle>,
      hasModifierKeyHeld: boolean,
      isShiftHeld: boolean,
    ) => {
      const elements = getElementsInDrag(dragSelectionRect, isValidGrabbableElement);
      const selectedElements =
        elements.length > 0
          ? elements
          : getElementsInDrag(dragSelectionRect, isValidGrabbableElement, false);

      if (selectedElements.length === 0) return;

      const isShiftAccumulating =
        isShiftHeld && !store.pendingCommentMode && !isPendingContextMenuSelect();

      // In the shift-accumulating branch we must freeze on the COMBINED set
      // (prior accumulated + newly dragged), because freezeAllAnimations
      // unfreezes its prior input via finishAnimations() — which permanently
      // advances WAAPI animations on previously selected elements past the
      // freeze point. Calling it once with [...prior, ...new] keeps prior
      // animations paused.
      if (isShiftAccumulating) {
        actions.addFrozenElements(selectedElements);
      }
      freezeAllAnimations(isShiftAccumulating ? store.frozenElements : selectedElements);

      pluginRegistry.hooks.onDragEnd(selectedElements, dragSelectionRect);

      if (isShiftAccumulating) {
        const lastElement = selectedElements[selectedElements.length - 1];
        setIsShiftMultiSelecting(true);
        clearElementPositionCache();
        actions.setPointer(getBoundsCenter(createElementBounds(lastElement)));
        actions.setLastGrabbed(lastElement);
        actions.freeze();
        clearKeyboardNavigation();
        return;
      }

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

      if (isPendingContextMenuSelect()) {
        setIsPendingContextMenuSelect(false);
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

    const getFrozenElementAtPosition = (position: Position): Element | null => {
      for (const element of store.frozenElements) {
        if (!isElementConnected(element)) continue;
        if (isPositionInsideBounds(position, createElementBounds(element))) {
          return element;
        }
      }
      return null;
    };

    const handleSingleClick = (
      clientX: number,
      clientY: number,
      hasModifierKeyHeld: boolean,
      isShiftHeld: boolean,
    ) => {
      const validFrozenElement = isElementConnected(store.frozenElement)
        ? store.frozenElement
        : null;

      const validKeyboardSelectedElement = keyboardSelection.selectedElement();

      // Resolve what's genuinely under the pointer via a live hit-test. We tried
      // skipping this on a plain click and reusing store.detectedElement, but
      // detection lags the pointer: a click right after keyboard navigation (or a
      // fast click before the detection rAF flushes) then selects a stale
      // element. The hit-test is the only reliable read of the click target, so
      // both single-select and Shift multi-select use it.
      const liveElementAtPointer = (): Element | null =>
        getElementsAtPoint(clientX, clientY).find(isValidGrabbableElement) ?? null;

      // While Shift is held we only operate on the live element under the
      // pointer. Falling through to the non-shift path would let the
      // selectedElement fallback chain resolve to the previously-frozen
      // element and fire an unintended single-element copy that races
      // with the eventual commitShiftMultiSelection on Shift release. So
      // we always return when Shift is held: toggle when an element is
      // under the pointer, no-op when it isn't.
      if (isShiftHeld && !store.pendingCommentMode && !isPendingContextMenuSelect()) {
        const elementAtPointer = liveElementAtPointer();
        if (elementAtPointer !== null) {
          toggleShiftMultiSelection(elementAtPointer, { x: clientX, y: clientY });
        }
        return;
      }

      const selectedElementUnderPointer =
        liveElementAtPointer() ??
        (isElementConnected(store.detectedElement) ? store.detectedElement : null);
      const selectedElement =
        validKeyboardSelectedElement ?? selectedElementUnderPointer ?? validFrozenElement;
      if (!selectedElement) return;

      let positionX: number;
      let positionY: number;

      const didResolveFromFrozenElement =
        selectedElementUnderPointer === null && validFrozenElement === selectedElement;
      const didResolveFromKeyboardElement = validKeyboardSelectedElement === selectedElement;

      if (didResolveFromFrozenElement) {
        positionX = pointer().x;
        positionY = pointer().y;
      } else if (didResolveFromKeyboardElement) {
        const elementCenter = getBoundsCenter(createElementBounds(selectedElement));
        positionX = elementCenter.x;
        positionY = elementCenter.y;
      } else {
        positionX = clientX;
        positionY = clientY;
      }

      if (store.pendingCommentMode) {
        enterCommentModeForElement(selectedElement, positionX, positionY);
        keyboardSelection.clear();
        return;
      }

      if (isPendingContextMenuSelect()) {
        setIsPendingContextMenuSelect(false);
        const { wasIntercepted } = pluginRegistry.hooks.onElementSelect(selectedElement);
        if (wasIntercepted) return;
        keyboardSelection.clear();

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
      keyboardSelection.clear();
    };

    const cancelActiveDrag = () => {
      if (!isDragging()) return;
      stopSpaceDragRepositioning();
      releaseDragPreview();
      actions.cancelDrag();
      autoScroller.stop();
      setHostBodyStyle("userSelect", "");
      // Detection pauses during active drags, so restore the hover target for
      // the element under the cursor without waiting for the next pointermove.
      redetectElementUnderPointer();
    };

    const handlePointerUp = (
      clientX: number,
      clientY: number,
      hasModifierKeyHeld: boolean,
      isShiftHeld: boolean,
    ) => {
      if (!isDragging()) return;

      releaseDragPreview();

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
      setHostBodyStyle("userSelect", "");

      if (dragSelectionRect) {
        handleDragSelection(dragSelectionRect, hasModifierKeyHeld, isShiftHeld);
      } else {
        handleSingleClick(clientX, clientY, hasModifierKeyHeld, isShiftHeld);
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
        !keyboardSelection.isPendingDismiss() &&
        !store.wasActivatedByToggle;

      if (shouldBlockEnter) {
        // React Grab inputs keep Enter so inline editors can commit.
        if (isEventFromOverlay(event, REACT_GRAB_INPUT_ATTRIBUTE)) return false;
        keyboardClaimer.claimedEvents.add(event);
        event.preventDefault();
        event.stopImmediatePropagation();
        return true;
      }
      return false;
    };

    eventListenerManager.addDocumentListener("keydown", ignoreRealInput(blockEnterIfNeeded), {
      capture: true,
    });
    eventListenerManager.addDocumentListener("keyup", ignoreRealInput(blockEnterIfNeeded), {
      capture: true,
    });
    eventListenerManager.addDocumentListener("keypress", ignoreRealInput(blockEnterIfNeeded), {
      capture: true,
    });

    // The dropdown itself derives from hierarchySourceElement, so clearing
    // navigation only needs to reset the keyboard-selection bookkeeping; the
    // menu hides on its own once nothing is being selected.
    const clearKeyboardNavigation = () => {
      arrowNavigator.clearHistory();
      keyboardSelection.clear();
    };

    const selectAndFocusElement = (element: Element, shouldPromptBeforeMouseHandoff = false) => {
      actions.setFrozenElement(element);
      actions.freeze();
      keyboardSelection.select(element, { shouldPromptBeforeMouseHandoff });

      const center = getBoundsCenter(createElementBounds(element));
      actions.setPointer(center);

      if (store.contextMenuPosition !== null) {
        actions.showContextMenu(center, element);
      }
    };

    const showKeyboardSelectionDismissPrompt = () => {
      if (keyboardSelection.showDismissPrompt()) {
        setSelectionLabelShakeCount((count) => count + 1);
      }
    };

    const discardKeyboardSelection = () => {
      keyboardSelection.clear();
      actions.unfreeze();
      clearKeyboardNavigation();
    };

    const copyKeyboardSelection = () => {
      const selectedElement = keyboardSelection.takeSelection(store.frozenElement);
      if (!selectedElement) {
        discardKeyboardSelection();
        return;
      }
      const center = getBoundsCenter(createElementBounds(selectedElement));
      clearKeyboardNavigation();
      actions.setLastGrabbed(selectedElement);
      performCopyWithLabel({
        element: selectedElement,
        cursorX: center.x,
        shouldDeactivateAfter: store.wasActivatedByToggle,
      });
    };

    // Tab / Shift+Tab mirror horizontal (sibling) navigation; arrow keys map to
    // themselves. Any other key is not a navigation key.
    const resolveNavigationKey = (event: KeyboardEvent): string | null => {
      if (ARROW_KEYS.has(event.key)) return event.key;
      if (event.key === "Tab") return event.shiftKey ? "ArrowLeft" : "ArrowRight";
      return null;
    };

    const tryHandleNavigationKey = (
      event: KeyboardEvent,
      options: { allowPendingKeyboardSelection?: boolean } = {},
    ): boolean => {
      if (!isActivated()) return false;
      if (isPromptMode()) return false;
      if (isShiftMultiSelecting()) return false;
      if (keyboardSelection.isPendingDismiss() && !options.allowPendingKeyboardSelection)
        return false;
      const navigationKey = resolveNavigationKey(event);
      if (!navigationKey) return false;
      if (isAnyPopoverOpen()) return false;

      let currentElement = effectiveElement();
      const isInitialSelection = !currentElement;

      if (!currentElement) {
        // When scoped to a container, probe its center: hit-testing filters to
        // the container's subtree, so the window center would miss whenever the
        // container doesn't cover it and arrow navigation could never start.
        const scopeRect = getScopeContainer()?.getBoundingClientRect();
        currentElement = scopeRect
          ? getElementAtPosition(
              scopeRect.left + scopeRect.width / 2,
              scopeRect.top + scopeRect.height / 2,
            )
          : getElementAtPosition(window.innerWidth / 2, window.innerHeight / 2);
      }

      if (!currentElement) return false;

      const isVertical = navigationKey === "ArrowUp" || navigationKey === "ArrowDown";

      const nextElement = arrowNavigator.findNext(navigationKey, currentElement);
      // Horizontal (sibling) navigation at a boundary is a no-op — the key is
      // left unhandled rather than re-selecting the current element; vertical
      // navigation always commits, falling back to the current element at the
      // stack edge.
      if (!nextElement && !isVertical && !isInitialSelection) return false;
      const elementToSelect = nextElement ?? currentElement;

      event.preventDefault();
      event.stopPropagation();
      selectAndFocusElement(elementToSelect, true);

      return true;
    };

    const canDispatchBareKey = (event: KeyboardEvent): Element | null => {
      if (event.metaKey || event.ctrlKey || event.altKey) return null;
      if (event.repeat) return null;
      if (isKeyboardEventTriggeredByInput(event)) return null;
      if (!isActivated()) return null;
      if (isCopying()) return null;
      if (isSelectionInteractionLocked()) return null;
      if (isAnyPopoverOpen()) return null;
      return store.frozenElement || targetElement();
    };

    const getBareKeyShortcut = (event: KeyboardEvent) => {
      const element = canDispatchBareKey(event);
      if (!element) return null;

      const action = findShortcutAction(pluginRegistry.store.actions, event);
      if (!action) return null;

      return { element, action };
    };

    const buildImmediateActionContext = (
      element: Element,
      position: Position,
    ): ContextMenuActionContext => {
      const elementBounds = createElementBounds(element);
      return buildActionContext({
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
    };

    const TYPE_TO_EDIT_KEY_PATTERN = /^[a-zA-Z0-9-]$/;
    const tryHandleTypeToEdit = (event: KeyboardEvent): boolean => {
      if (!event.key || event.key.length !== 1 || !TYPE_TO_EDIT_KEY_PATTERN.test(event.key))
        return false;
      const element = canDispatchBareKey(event);
      if (!element) return false;
      const opened = editMode.trigger(
        element,
        { x: pointer().x, y: pointer().y },
        { initialSearchQuery: event.key },
      );
      if (!opened) return false;
      clearPendingToolbarSelection();
      event.preventDefault();
      event.stopImmediatePropagation();
      return true;
    };

    const tryHandleBareKeyShortcut = (event: KeyboardEvent): boolean => {
      const shortcut = getBareKeyShortcut(event);
      if (!shortcut) return false;
      const { element, action } = shortcut;

      if (isPromptMode()) {
        if (!runActionForCurrentSelection(action.id)) return false;
        event.preventDefault();
        event.stopImmediatePropagation();
        return true;
      }

      const position = { x: pointer().x, y: pointer().y };
      action.onAction(buildImmediateActionContext(element, position));

      event.preventDefault();
      event.stopImmediatePropagation();
      return true;
    };

    const tryHandleOpenFileShortcut = (event: KeyboardEvent): boolean => {
      if (event.key?.toLowerCase() !== "o") return false;
      if (!isActivated() || !(event.metaKey || event.ctrlKey)) return false;

      const filePath = store.selectionFilePath;
      const lineNumber = store.selectionLineNumber;
      if (!filePath) return false;

      event.preventDefault();
      event.stopPropagation();

      const wasHandled = pluginRegistry.hooks.onOpenFile(filePath, lineNumber ?? undefined);
      if (!wasHandled) {
        requestOpenFile(
          filePath,
          lineNumber ?? undefined,
          pluginRegistry.hooks.transformOpenFileUrl,
        );
      }
      return true;
    };

    const tryHandleContextMenuKey = (event: KeyboardEvent): boolean => {
      if (!isActivated()) return false;
      if (isCopying()) return false;
      if (store.contextMenuPosition !== null) return false;
      if (editMode.isOpen()) return false;

      const isShiftF10 = event.key === "F10" && event.shiftKey;
      const isContextMenuKey = event.key === "ContextMenu";
      if (!isShiftF10 && !isContextMenuKey) return false;

      const existingFrozenElements = store.frozenElements;
      const hasMultiFrozenSelection = existingFrozenElements.length > 1;
      const element =
        (hasMultiFrozenSelection ? existingFrozenElements[0] : null) ||
        store.frozenElement ||
        targetElement();
      if (!element) return false;

      event.preventDefault();
      event.stopPropagation();

      const center = getBoundsCenter(createElementBounds(element));
      if (hasMultiFrozenSelection) {
        freezeAllAnimations(existingFrozenElements);
      } else {
        freezeAllAnimations([element]);
        actions.setFrozenElement(element);
      }
      actions.setPointer(center);
      actions.freeze();
      openContextMenu(element, center);
      return true;
    };

    const hierarchyItems = createMemo(() =>
      hierarchyEntries().map((entry) => ({
        tagName: getTagName(entry.element) || "element",
        componentName: getComponentDisplayName(entry.element) ?? undefined,
        depth: entry.depth,
        isLast: entry.isLast,
      })),
    );

    const hierarchyState = createMemo<HierarchyState>(() => ({
      items: hierarchyItems(),
      activeIndex: hierarchyActiveIndex(),
    }));

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

    const tryHandleKeyboardSelectionPromptPassThrough = (event: KeyboardEvent): boolean => {
      if (!keyboardSelection.isPendingDismiss()) return false;
      // Enter belongs to the discard prompt's own confirmation handler: its
      // "Yes" button shows the return key, so Enter confirms the discard (or
      // copies when the Copy button is focused) and returns to selection.
      // Handing it off here keeps Enter from running a bare-key shortcut (e.g.
      // the default action) and dropping into that mode instead.
      //
      // Invariant: this yields the event rather than consuming it. DiscardPrompt
      // registers its own window keydown (capture) listener after this one, so
      // returning early WITHOUT stopping propagation lets that later listener
      // resolve Copy-vs-Discard from button focus. Do not add stopPropagation on
      // this path, or the prompt will never see Enter.
      if (isEnterCode(event.code)) return true;

      // Only arrows continue navigation through the discard prompt; Tab and
      // Shift+Tab are not treated as sibling navigation here so that focus
      // already inside the prompt can traverse its Copy/Discard buttons
      // natively.
      const shouldHandleArrow = ARROW_KEYS.has(event.key);
      const shouldHandleBareShortcut = getBareKeyShortcut(event) !== null;
      if (!shouldHandleArrow && !shouldHandleBareShortcut) return false;

      if (shouldHandleArrow) {
        return tryHandleNavigationKey(event, { allowPendingKeyboardSelection: true });
      }

      if (!tryHandleBareKeyShortcut(event)) return false;
      clearKeyboardNavigation();
      return true;
    };

    eventListenerManager.addWindowListener(
      "keydown",
      ignoreRealInput((event: KeyboardEvent) => {
        // Editable controls keep their native arrow/Tab keys (caret movement,
        // focus traversal). This one guard covers every navigation path in this
        // handler — the discard-prompt pass-through, the overlay branch, and the
        // main path — and precedes the active-mode preventDefault below.
        if (resolveNavigationKey(event) && isKeyboardEventTriggeredByInput(event)) return;
        if (tryHandleKeyboardSelectionPromptPassThrough(event)) return;

        blockEnterIfNeeded(event);

        if (!isEnabled()) {
          if (isTargetKeyCombination(event, pluginRegistry.store.options) && !event.repeat) {
            setToolbarShakeCount((count) => count + 1);
          }
          return;
        }

        const isEnterToActivateInput =
          isEnterCode(event.code) && isHoldingKeys() && !isPromptMode();

        const isFromReactGrabInput = isEventFromOverlay(event, REACT_GRAB_INPUT_ATTRIBUTE);
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

        if (event.key === "Escape" && isAnyPopoverOpen()) {
          if (toolbarMenuPosition() !== null) dismissToolbarMenu();
          return;
        }

        const isFromOverlay =
          isEventFromOverlay(event, "data-react-grab-ignore-events") && !isEnterToActivateInput;

        if (isPromptMode() || isFromOverlay) {
          if (isPromptMode() && !isFromReactGrabInput && tryHandleBareKeyShortcut(event)) return;

          if (event.key === "Escape") {
            if (isPromptMode()) {
              handleInputCancel();
            } else if (store.wasActivatedByToggle) {
              deactivateRenderer();
            }
          }

          if (isFromOverlay && ARROW_KEYS.has(event.key)) {
            if (tryHandleNavigationKey(event)) return;
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

        if (tryHandleNavigationKey(event)) return;
        if (tryHandleOpenFileShortcut(event)) return;
        if (tryHandleContextMenuKey(event)) return;
        if (tryHandleBareKeyShortcut(event)) return;
        if (tryHandleTypeToEdit(event)) return;

        // Demo mode never activates from the global hotkey.
        if (!didWindowJustRegainFocus && !IS_DEMO) {
          handleActivationKeys(event);
        }
      }),
      { capture: true },
    );

    eventListenerManager.addWindowListener(
      "keyup",
      ignoreRealInput((event: KeyboardEvent) => {
        if (blockEnterIfNeeded(event)) return;

        if (isSpaceActivationKey(event) && isDragRepositioning()) {
          stopSpaceDragRepositioning();
          event.preventDefault();
          event.stopPropagation();
        }

        if (event.key === "Shift" && isShiftMultiSelecting()) {
          // If shift is released mid-drag, abort the in-progress drag
          // before committing. Without this, performCopyWithLabel ->
          // startCopy moves state out of "active+dragging", which makes
          // the subsequent pointerup early-return and silently swallows
          // the drag gesture along with its document.body.style.userSelect
          // cleanup.
          if (isDragging()) {
            cancelActiveDrag();
          }
          commitShiftMultiSelection();
          return;
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
          const hasModalPopover = isModalPopoverOpen();
          if (isReleasingModifier) {
            if (
              store.wasActivatedByToggle &&
              pluginRegistry.store.options.activationMode !== "hold"
            )
              return;
            if (hasModalPopover) return;
            deactivateRenderer();
          } else if (isHoldMode && isReleasingActivationKey) {
            if (keydownSpamTimerId !== null) {
              window.clearTimeout(keydownSpamTimerId);
              keydownSpamTimerId = null;
            }
            if (hasModalPopover) return;
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
      }),
      { capture: true },
    );

    eventListenerManager.addDocumentListener("copy", () => {
      if (isHoldingKeys()) {
        activationHoldState.copyWaiting = true;
      }
    });

    eventListenerManager.addWindowListener("keypress", ignoreRealInput(blockEnterIfNeeded), {
      capture: true,
    });

    eventListenerManager.addWindowListener(
      "pointermove",
      ignoreRealInput((event: PointerEvent) => {
        if (!event.isPrimary) return;
        const isTouchPointer = event.pointerType === "touch";
        actions.setTouchMode(isTouchPointer);
        if (isEventFromOverlay(event, "data-react-grab-ignore-events")) return;
        if (isElementDetectionBlocked()) return;
        if (isTouchPointer && !isHoldingKeys() && !isActivated()) return;
        const isActiveState = isTouchPointer ? isHoldingKeys() : isActivated();
        // The flag check covers the small window after physical Shift
        // release but before the keyup handler commits — pointermove fires
        // with shiftKey=false in that gap, and unfreezing here would empty
        // frozenElements before commitShiftMultiSelection can read it.
        if (
          isActiveState &&
          !isPromptMode() &&
          isFrozenPhase() &&
          !event.shiftKey &&
          !isShiftMultiSelecting()
        ) {
          if (keyboardSelection.consumeMouseHandoff()) {
            showKeyboardSelectionDismissPrompt();
            return;
          }
          actions.unfreeze();
          clearKeyboardNavigation();
        }
        handlePointerMove(event.clientX, event.clientY, event.shiftKey);
      }),
      // capture (like every other pointer listener here) so detection
      // survives apps that stopPropagation() pointermove below window level
      // (gesture libraries, analytics/session-replay SDKs); passive because
      // the handler never calls preventDefault.
      { passive: true, capture: true },
    );

    eventListenerManager.addWindowListener(
      "pointerdown",
      ignoreRealInput((event: PointerEvent) => {
        if (event.button !== 0) return;
        if (!event.isPrimary) return;
        actions.setTouchMode(event.pointerType === "touch");
        didSwitchEditTargetOnPointerDown = false;
        if (isEventFromOverlay(event, "data-react-grab-ignore-events")) return;
        if (isModalPopoverOpen()) {
          if (tryHandleEditModeElementSwitch(event.clientX, event.clientY)) {
            didSwitchEditTargetOnPointerDown = true;
            event.preventDefault();
            event.stopImmediatePropagation();
          }
          return;
        }

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

        if (keyboardSelection.isPendingDismiss()) {
          event.preventDefault();
          event.stopImmediatePropagation();
          return;
        }

        if (isSelectionInteractionLocked()) {
          event.preventDefault();
          event.stopImmediatePropagation();
          return;
        }

        const didHandle = handlePointerDown(event.clientX, event.clientY, event.shiftKey);
        if (didHandle) {
          if (event.pointerId !== undefined) {
            document.documentElement.setPointerCapture(event.pointerId);
          }
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      }),
      { capture: true },
    );

    eventListenerManager.addWindowListener(
      "pointerup",
      ignoreRealInput((event: PointerEvent) => {
        if (event.button !== 0) return;
        if (!event.isPrimary) return;
        if (isEventFromOverlay(event, "data-react-grab-ignore-events")) return;
        if (isModalPopoverOpen()) return;
        const isActive = isRendererActive() || isSelectionInteractionLocked() || isDragging();
        const hasModifierKeyHeld = event.metaKey || event.ctrlKey;
        handlePointerUp(event.clientX, event.clientY, hasModifierKeyHeld, event.shiftKey);
        if (isActive) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      }),
      { capture: true },
    );

    eventListenerManager.addWindowListener(
      "contextmenu",
      ignoreRealInput((event: MouseEvent) => {
        if (!isRendererActive() || isCopying() || isPromptMode()) return;
        if (editMode.isOpen()) return;

        const isFromOverlay = isEventFromOverlay(event, "data-react-grab-ignore-events");
        const position = { x: event.clientX, y: event.clientY };
        const overlayFrozenElement =
          isFromOverlay && store.frozenElements.length > 1
            ? getFrozenElementAtPosition(position)
            : null;
        // A right-click is an explicit pick. When it lands on a grab overlay
        // (hierarchy menu, or the keyboard-selection discard prompt that sits on
        // the cursor) mid navigation, fall through to resolve the page element
        // beneath instead of bailing. Keyboard-selection state is only cleared
        // later by openContextMenu, once a real target is confirmed, so nothing
        // is torn down when no element resolves.
        const hadPendingDismiss = keyboardSelection.isPendingDismiss();
        const isBareOverlayRightClick =
          isFromOverlay && !overlayFrozenElement && !hadPendingDismiss && !hasHierarchySource();
        if (isBareOverlayRightClick) return;

        if (isModalPopoverOpen()) {
          event.preventDefault();
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        const element = overlayFrozenElement ?? getElementAtPosition(event.clientX, event.clientY);
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

        actions.setPointer(position);
        actions.freeze();
        openContextMenu(element, position);
      }),
      { capture: true },
    );

    eventListenerManager.addWindowListener(
      "pointercancel",
      ignoreRealInput((event: PointerEvent) => {
        if (!event.isPrimary) return;
        cancelActiveDrag();
      }),
    );

    eventListenerManager.addWindowListener(
      "click",
      ignoreRealInput((event: MouseEvent) => {
        if (isEventFromOverlay(event, "data-react-grab-ignore-events")) return;
        if (didSwitchEditTargetOnPointerDown) {
          didSwitchEditTargetOnPointerDown = false;
          event.preventDefault();
          event.stopImmediatePropagation();
          return;
        }
        if (isModalPopoverOpen()) return;

        if (isRendererActive() || didJustDrag()) {
          event.preventDefault();
          event.stopImmediatePropagation();

          if (store.wasActivatedByToggle && !isPromptMode() && !event.shiftKey) {
            if (!isHoldingKeys()) {
              deactivateRenderer();
            } else {
              actions.setWasActivatedByToggle(false);
            }
          }
        }
      }),
      { capture: true },
    );

    // These react to the real environment (tab switches, window focus), which
    // the scripted demo must ignore: a visitor blurring the window mid-showcase
    // would otherwise cancel the synthetic drag or deactivate the renderer
    // under the still-running choreography. ignoreRealInput can't cover them
    // because they aren't dispatchable input events.
    if (!IS_DEMO) {
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
        // Modifier keyup events are lost on blur, so a shift release that
        // would have committed the multi-selection never fires. Clear the
        // flag here so the pointermove unfreeze guard and the arrow
        // navigation guard don't stay blocked indefinitely. Frozen elements
        // are intentionally preserved so the user can resume on refocus.
        stopShiftMultiSelecting();
      });
    }

    eventListenerManager.addWindowListener("focus", () => {
      lastWindowFocusTimestamp = Date.now();
    });

    eventListenerManager.addWindowListener(
      "focusin",
      (event: FocusEvent) => {
        if (isEventFromOverlay(event, REACT_GRAB_ATTRIBUTE_NAME)) {
          event.stopPropagation();
        }
      },
      { capture: true },
    );

    const redetectElementUnderPointer = () => {
      if (store.isTouchMode && !isHoldingKeys() && !isActivated()) return;
      if (
        !isElementDetectionBlocked() &&
        !isFrozenPhase() &&
        !isDragging() &&
        store.frozenElements.length === 0
      ) {
        const candidate = getElementAtPosition(pointer().x, pointer().y);
        actions.setDetectedElement(candidate);
      }
    };

    let boundsRecalcIntervalId: number | null = null;
    let viewportChangeFrameId: number | null = null;

    const handleViewportChange = () => {
      invalidateInteractionCaches();
      redetectElementUnderPointer();
      setScrollVersion((version) => version + 1);
      actions.incrementViewportVersion();
      actions.updateContextMenuPosition();
    };

    // Unlike scroll, resize can flip visibility synchronously (media and
    // container queries), so the visibility cache's TTL is not a safe
    // staleness bound here. Resize is rare enough that the extra
    // getComputedStyle refill cost doesn't matter.
    const handleViewportResize = () => {
      clearVisibilityCache();
      handleViewportChange();
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
            x: pointer().x * scaleX,
            y: pointer().y * scaleY,
          });
        }
      }

      previousViewportWidth = currentViewportWidth;
      previousViewportHeight = currentViewportHeight;

      handleViewportResize();
    });

    const visualViewport = window.visualViewport;
    if (visualViewport) {
      const { signal } = eventListenerManager;
      visualViewport.addEventListener("resize", handleViewportResize, {
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
      ignoreRealInput((event: ClipboardEvent) => {
        if (isPromptMode() || isEventFromOverlay(event, "data-react-grab-ignore-events")) {
          return;
        }
        if (isRendererActive()) {
          event.preventDefault();
        }
      }),
      { capture: true },
    );

    onCleanup(() => {
      eventListenerManager.abort();
      if (dragPreviewDebounceTimerId !== null) {
        window.clearTimeout(dragPreviewDebounceTimerId);
      }
      if (keydownSpamTimerId) window.clearTimeout(keydownSpamTimerId);
      clearCopyFeedbackCooldown();
      stopToolbarMenuTracking?.();
      stopToolbarMenuTracking = null;
      stopEditPanelTracking?.();
      stopEditPanelTracking = null;
      grabbedBoxTimeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
      grabbedBoxTimeouts.clear();
      labelController.cancelAllFades();
      autoScroller.stop();
      setHostBodyStyle("userSelect", "");
      setHostBodyStyle("touchAction", "");
      setCursorOverride(null);
      keyboardClaimer.restore();
      setScopeContainer(null);
    });

    const resolvedCssText = typeof cssText === "string" ? cssText : "";
    // Demo mode is display-only: nothing inside the overlay should intercept the
    // host page's real clicks or cursor (the showcase is driven via the API), so
    // make the entire shadow overlay click-through.
    const overlayCssText = IS_DEMO
      ? `${resolvedCssText}\n* { pointer-events: none !important; }`
      : resolvedCssText;
    const { root: rendererRoot, host: rendererHost } = mountRoot(overlayCssText);

    const themeWatcher = watchAppTheme(rendererHost);
    onCleanup(themeWatcher.cleanup);

    const isThemeEnabled = createMemo(() => pluginRegistry.store.theme.enabled);
    const isSelectionBoxThemeEnabled = createMemo(
      () => pluginRegistry.store.theme.selectionBox.enabled,
    );
    const isElementLabelThemeEnabled = createMemo(
      () => pluginRegistry.store.theme.elementLabel.enabled,
    );
    const isDragBoxThemeEnabled = createMemo(() => pluginRegistry.store.theme.dragBox.enabled);
    const isSelectionSuppressed = createMemo(
      () =>
        didJustCopy() || (isToolbarSelectHovered() && !isFrozenPhase()) || editMode.isInteracting(),
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

    const selectionLabelVisible = createMemo(() => {
      if (!isThemeEnabled()) return false;
      if (isModalPopoverOpen()) return false;
      if (!isElementLabelThemeEnabled()) return false;
      if (isSelectionSuppressed()) return false;

      return isSelectionElementVisible();
    });

    const labelInstanceCache = new Map<string, SelectionLabelInstance>();

    const recomputeLabelInstance = (instance: SelectionLabelInstance): SelectionLabelInstance => {
      const liveElements = instance.elements?.filter(isElementConnected) ?? [];
      const instanceElement = instance.element;

      let liveBoundsList: OverlayBounds[] | null = null;
      if (liveElements.length > 0) {
        liveBoundsList = liveElements.map(createElementBounds);
      } else if (instanceElement && isElementConnected(instanceElement)) {
        liveBoundsList = [createElementBounds(instanceElement)];
      }

      let newBounds = instance.bounds;
      let newBoundsMultiple = instance.boundsMultiple;
      if (liveBoundsList) {
        newBounds =
          liveBoundsList.length > 1
            ? createFlatOverlayBounds(combineBounds(liveBoundsList))
            : liveBoundsList[0];
        if (instance.boundsMultiple !== undefined) {
          newBoundsMultiple =
            instance.boundsMultiple.length > 1 &&
            instance.boundsMultiple.length === instance.elements?.length
              ? liveBoundsList
              : [newBounds];
        }
      }

      const previousInstance = labelInstanceCache.get(instance.id);
      const previousBoundsMultiple = previousInstance?.boundsMultiple;
      const boundsMultipleUnchanged =
        previousBoundsMultiple === newBoundsMultiple ||
        (previousBoundsMultiple !== undefined &&
          newBoundsMultiple !== undefined &&
          previousBoundsMultiple.length === newBoundsMultiple.length &&
          previousBoundsMultiple.every(
            (bounds, index) =>
              bounds.x === newBoundsMultiple![index].x &&
              bounds.y === newBoundsMultiple![index].y &&
              bounds.width === newBoundsMultiple![index].width &&
              bounds.height === newBoundsMultiple![index].height,
          ));
      if (
        previousInstance &&
        previousInstance.status === instance.status &&
        previousInstance.errorMessage === instance.errorMessage &&
        previousInstance.bounds.x === newBounds.x &&
        previousInstance.bounds.y === newBounds.y &&
        previousInstance.bounds.width === newBounds.width &&
        previousInstance.bounds.height === newBounds.height &&
        boundsMultipleUnchanged
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
      const newCached = {
        ...instance,
        bounds: newBounds,
        boundsMultiple: newBoundsMultiple,
        mouseX: newMouseX,
      };
      labelInstanceCache.set(instance.id, newCached);
      return newCached;
    };

    const computedLabelInstances = createMemo(() => {
      if (!isThemeEnabled()) return [];
      if (!pluginRegistry.store.theme.grabbedBoxes.enabled) return [];
      void viewportVersion();
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
      void viewportVersion();
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

    const labelVariant = createMemo<ElementLabelVariant>(() =>
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
      const frozen = isFrozenPhase();

      if (!themeEnabled) return false;
      if (inPromptMode) return false;
      if (toolbarSelectHovered && !frozen) return false;
      if (copying) return true;
      return rendererActive && !dragging && hasElement;
    });

    const contextMenuBounds = createMemo((): OverlayBounds | null => {
      void viewportVersion();
      const element = store.contextMenuElement;
      if (!element) return null;
      return createElementBounds(element);
    });

    const contextMenuPosition = createMemo(() => {
      void viewportVersion();
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

    const [contextMenuComponentName] = createComponentNameForElement(() =>
      store.frozenElements.length > 1 ? null : store.contextMenuElement,
    );

    const [contextMenuFilePath] = createResource(
      () => store.contextMenuElement,
      async (element) => {
        if (!element) return null;
        return resolveSource(element);
      },
    );

    const withSelectionInteractionLock = async <T,>(operation: () => Promise<T>): Promise<T> => {
      actions.incrementSelectionInteractionLockDepth();
      try {
        return await operation();
      } finally {
        actions.decrementSelectionInteractionLockDepth();
      }
    };

    const createPerformWithFeedback = (
      element: Element,
      elements: Element[],
      tagName: string | undefined,
      componentName: string | undefined,
      options?: PerformWithFeedbackOptions,
    ) => {
      return async (action: () => Promise<boolean>): Promise<void> => {
        await withSelectionInteractionLock(async () => {
          const fallbackBounds = options?.fallbackBounds ?? null;
          const fallbackSelectionBounds = options?.fallbackSelectionBounds ?? [];
          const position = options?.position ?? store.contextMenuPosition ?? pointer();
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

            const labelInstanceId = labelController.createInstance(
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

            labelController.updateAfterCopy(labelInstanceId, didSucceed, errorMessage);
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
        });
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
        clearPendingToolbarSelection();
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
        labelController.clearAll();
        clearPendingToolbarSelection();
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

      const enterEditModeAction = () => {
        const didOpen = openEditMode(element, position, {
          filePath,
          lineNumber,
          componentName,
          tagName,
        });
        if (didOpen) {
          clearPendingToolbarSelection();
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
        enterEditMode: enterEditModeAction,
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
      const position = store.contextMenuPosition ?? pointer();

      return buildActionContext({
        element,
        filePath: fileInfo?.filePath,
        lineNumber: fileInfo?.lineNumber ?? undefined,
        tagName: contextMenuTagName(),
        componentName: contextMenuComponentName(),
        position,
        shouldDeferHideContextMenu: true,
        onBeforeCopy: () => {
          keyboardSelection.clear();
        },
        customEnterPromptMode: () => {
          labelController.clearAll();
          clearPendingToolbarSelection();
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

    const computeDropdownAnchor = (): DropdownAnchor | null => {
      if (!toolbarElement) return null;
      const toolbarRect = toolbarElement.getBoundingClientRect();
      const edge = getNearestEdge(toolbarRect);

      if (edge === "left" || edge === "right") {
        return {
          x: edge === "left" ? toolbarRect.right : toolbarRect.left,
          y: toolbarRect.top + toolbarRect.height / 2,
          edge,
        };
      }

      return {
        x: toolbarRect.left + toolbarRect.width / 2,
        y: edge === "top" ? toolbarRect.bottom : toolbarRect.top,
        edge,
      };
    };

    const computeEditPanelAnchor = (): DropdownAnchor | null => {
      const toolbarAnchor = computeDropdownAnchor();
      if (toolbarAnchor) return toolbarAnchor;
      const state = editMode.state();
      if (!state) return null;
      return {
        x: state.position.x,
        y: state.position.y,
        edge: "bottom",
      };
    };

    // Keep sibling dropdown tracking independent; sharing one RAF id breaks anchoring.
    const trackDropdownPosition = (
      getAnchor: () => DropdownAnchor | null,
      setPosition: (anchor: DropdownAnchor) => void,
    ): (() => void) => {
      let frameId: number | null = null;
      const updatePosition = () => {
        const anchor = getAnchor();
        if (anchor) setPosition(anchor);
        frameId = nativeRequestAnimationFrame(updatePosition);
      };
      updatePosition();
      return () => {
        if (frameId !== null) {
          nativeCancelAnimationFrame(frameId);
          frameId = null;
        }
      };
    };

    // Keep the hierarchy dropdown anchored to the toolbar while there is an
    // element being selected; Solid tears the tracker down when the source
    // clears or the root disposes.
    createEffect(() => {
      if (!hasHierarchySource()) return;
      const stopTracking = trackDropdownPosition(computeDropdownAnchor, setHierarchyMenuPosition);
      onCleanup(() => {
        stopTracking();
        setHierarchyMenuPosition(null);
      });
    });

    const dismissToolbarMenu = () => {
      stopToolbarMenuTracking?.();
      stopToolbarMenuTracking = null;
      setToolbarMenuPosition(null);
    };

    const dismissAllPopups = () => {
      actions.hideContextMenu();
      dismissToolbarMenu();
      editMode.dismiss();
    };

    const handleToggleToolbarMenu = () => {
      if (toolbarMenuPosition() !== null) {
        dismissToolbarMenu();
      } else {
        actions.hideContextMenu();
        if (editMode.isOpen()) editMode.closePreservingRenderer();
        stopToolbarMenuTracking?.();
        stopToolbarMenuTracking = trackDropdownPosition(
          computeDropdownAnchor,
          setToolbarMenuPosition,
        );
      }
    };

    const handleSetDefaultAction = (actionId: string) => {
      updateToolbarState({ defaultAction: actionId });
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
        dismissToolbarMenu();
        if (editMode.isOpen()) editMode.closePreservingRenderer();
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
                selectionElementsCount={store.frozenElements.length}
                frozenLabelEntries={frozenLabelEntries()}
                pendingShiftPreviewEntry={pendingShiftPreviewEntry() ?? undefined}
                selectionFilePath={store.selectionFilePath ?? undefined}
                selectionLineNumber={store.selectionLineNumber ?? undefined}
                selectionTagName={selectionTagName()}
                selectionComponentName={resolvedComponentName()}
                selectionLabelVisible={selectionLabelVisible()}
                selectionLabelStatus="idle"
                hierarchyState={hierarchyState()}
                hierarchyMenuPosition={hierarchyMenuPosition()}
                labelInstances={computedLabelInstances()}
                dragVisible={dragVisible()}
                dragBounds={dragBounds()}
                grabbedBoxes={computedGrabbedBoxes()}
                mouseX={
                  store.frozenElements.length > 1
                    ? undefined
                    : (shiftSelectionLabelMouseX() ?? cursorPosition().x)
                }
                isFrozen={isFrozenPhase() || isActivated() || isToolbarSelectHovered()}
                inputValue={store.inputText}
                isPromptMode={isPromptMode()}
                onShowContextMenuInstance={handleShowContextMenuInstance}
                onRetryInstance={handleRetryInstance}
                onAcknowledgeErrorInstance={handleAcknowledgeErrorInstance}
                onLabelInstanceHoverChange={labelController.handleHoverChange}
                onInputChange={actions.setInputText}
                onInputSubmit={() => void handleInputSubmit()}
                onToggleExpand={handleToggleExpand}
                selectionLabelShakeCount={selectionLabelShakeCount()}
                onConfirmDismiss={handleConfirmDismiss}
                discardPrompt={
                  keyboardSelection.isPendingDismiss()
                    ? {
                        isKeyboardSelection: true,
                        onConfirm: handleConfirmDismiss,
                        onCopy: copyKeyboardSelection,
                      }
                    : isPendingDismiss()
                      ? {
                          onConfirm: handleConfirmDismiss,
                          onCancel: handleCancelDismiss,
                        }
                      : undefined
                }
                toolbarVisible={pluginRegistry.store.theme.toolbar.enabled}
                isActive={isActivated()}
                onToggleActive={handleToggleActive}
                onActivateAction={handleActivateAction}
                activeActionId={toolbarActiveActionId()}
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
                toolbarMenuPosition={toolbarMenuPosition()}
                toolbarMenuActions={pluginRegistry.store.actions.filter(
                  (action) => action.showInToolbarMenu === true,
                )}
                defaultActionId={currentToolbarState()?.defaultAction ?? DEFAULT_ACTION_ID}
                onSetDefaultAction={handleSetDefaultAction}
                onToggleToolbarMenu={handleToggleToolbarMenu}
                onToolbarMenuDismiss={dismissToolbarMenu}
                editPanelState={editMode.state()}
                editPanelPosition={editPanelPosition()}
                onEditPanelDismiss={editMode.dismiss}
                onEditPanelSubmit={editMode.submit}
                onEditPanelPendingEditsChange={editMode.setPendingEdits}
                onEditPanelInteractingChange={editMode.setInteracting}
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
      return await copyResolvedElements(elementsArray);
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
      getToolbarState: () => currentToolbarState() ?? loadToolbarState(),
      setToolbarState: (state: Partial<ToolbarState>) => {
        // Live signal first so partial updates keep prior fields even when
        // persistence is gated off (demo mode), falling back to storage.
        const currentState = currentToolbarState() ?? loadToolbarState();
        const resolvedCollapsed = state.collapsed ?? currentState?.collapsed ?? false;
        const newState: ToolbarState = {
          edge: state.edge ?? currentState?.edge ?? "bottom",
          ratio: state.ratio ?? currentState?.ratio ?? TOOLBAR_DEFAULT_POSITION_RATIO,
          collapsed: resolvedCollapsed,
          enabled: state.enabled ?? !resolvedCollapsed,
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
      // Clean slate without disposing: deactivate and drop selection/grabbed
      // boxes. For the demo between showcase loops.
      reset: () => {
        forceDeactivateAll();
        dismissAllPopups();
        actions.clearGrabbedBoxes();
        actions.clearLabelInstances();
        actions.setSelectionSource(null, null);
      },
      dispose: () => {
        disposed = true;
        hasInited = false;
        disposeRenderer?.();
        stopToolbarMenuTracking?.();
        stopToolbarMenuTracking = null;
        stopEditPanelTracking?.();
        stopEditPanelTracking = null;
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
      getStackContext: (element: Element) =>
        getStackContext(element, { maxLines: pluginRegistry.store.options.maxContextLines }),
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
      isNextProjectRuntime(true);
    }, NEXTJS_REVALIDATION_DELAY_MS);

    return api;
  });
};

export { getStack, formatElementInfo } from "./context.js";
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
