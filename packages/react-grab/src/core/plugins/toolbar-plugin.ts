import { createSignal, createEffect, on, onCleanup } from "solid-js";
import type {
  InternalPlugin,
  ToolbarState,
  ToolbarEntryHandle,
  DropdownAnchor,
} from "../../types.js";
import {
  loadToolbarState,
  saveToolbarState,
} from "../../components/toolbar/state.js";
import {
  TOOLBAR_DEFAULT_POSITION_RATIO,
  DEFAULT_ACTION_ID,
  PLUGIN_PRIORITY_TOOLBAR,
} from "../../constants.js";
import {
  freezePseudoStates,
  unfreezePseudoStates,
} from "../../utils/freeze-pseudo-states.js";
import {
  freezeGlobalAnimations,
  unfreezeGlobalAnimations,
  freezeAnimations,
} from "../../utils/freeze-animations.js";
import { freezeUpdates } from "../../utils/freeze-updates.js";
import { lockViewportZoom } from "../../utils/lock-viewport-zoom.js";
import { getNearestEdge } from "../../utils/get-nearest-edge.js";
import {
  nativeCancelAnimationFrame,
  nativeRequestAnimationFrame,
} from "../../utils/native-raf.js";
import { isElementConnected } from "../../utils/is-element-connected.js";

const toolbarStateChangeCallbacks = new Set<(state: ToolbarState) => void>();

export const toolbarPlugin: InternalPlugin = {
  name: "toolbar",
  priority: PLUGIN_PRIORITY_TOOLBAR,
  setup: (ctx) => {
    const { store, actions, registry, api, derived } = ctx;
    const {
      isHoldingKeys,
      isActivated,
      isFrozenPhase,
      isDragging,
      isRendererActive,
    } = derived;

    // Toolbar signals
    const savedToolbarState = loadToolbarState();
    const [isEnabled, setIsEnabled] = createSignal(
      savedToolbarState?.enabled ?? true,
    );
    const [toolbarShakeCount, setToolbarShakeCount] = createSignal(0);
    const [currentToolbarState, setCurrentToolbarState] =
      createSignal<ToolbarState | null>(savedToolbarState);
    const [isToolbarSelectHovered, setIsToolbarSelectHovered] =
      createSignal(false);
    const [toolbarMenuPosition, setToolbarMenuPosition] =
      createSignal<DropdownAnchor | null>(null);
    const [activeToolbarEntryId, setActiveToolbarEntryId] = createSignal<
      string | null
    >(null);
    const [toolbarEntryDropdownPosition, setToolbarEntryDropdownPosition] =
      createSignal<DropdownAnchor | null>(null);

    let toolbarElement: HTMLDivElement | undefined;
    let dropdownTrackingFrameId: number | null = null;
    let unlockViewportZoom: (() => void) | null = null;

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
      return newState;
    };

    createEffect(
      on(isActivated, (activated, previousActivated) => {
        if (activated && !previousActivated) {
          freezePseudoStates();
          freezeGlobalAnimations();
          // HACK: Prevent browser from taking over touch gestures
          document.body.style.touchAction = "none";
          // HACK: Prevent iOS Safari from auto-zooming on sub-16px inputs
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

    createEffect(() => {
      const elements = store.frozenElements;
      const cleanup = freezeAnimations(elements);
      onCleanup(cleanup);
    });

    createEffect(
      on(isActivated, (activated) => {
        if (!activated) return;
        if (!registry.store.options.freezeReactUpdates) return;
        const unfreezeUpdates = freezeUpdates();
        onCleanup(unfreezeUpdates);
      }),
    );

    const stopTrackingDropdownPosition = () => {
      if (dropdownTrackingFrameId !== null) {
        nativeCancelAnimationFrame(dropdownTrackingFrameId);
        dropdownTrackingFrameId = null;
      }
    };

    const startTrackingDropdownPosition = (computePosition: () => void) => {
      stopTrackingDropdownPosition();
      const trackFrame = () => {
        computePosition();
        dropdownTrackingFrameId = nativeRequestAnimationFrame(trackFrame);
      };
      trackFrame();
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

    const openTrackedDropdown = (
      setPosition: (anchor: DropdownAnchor) => void,
    ) => {
      startTrackingDropdownPosition(() => {
        const anchor = computeDropdownAnchor();
        if (anchor) setPosition(anchor);
      });
    };

    const dismissToolbarMenu = () => {
      stopTrackingDropdownPosition();
      setToolbarMenuPosition(null);
    };

    const getToolbarEntryHandle = (entryId: string): ToolbarEntryHandle => ({
      api,
      isOpen: () => activeToolbarEntryId() === entryId,
      open: () => {
        if (activeToolbarEntryId() !== entryId)
          handleToggleToolbarEntry(entryId);
      },
      close: () => {
        if (activeToolbarEntryId() === entryId) dismissToolbarEntry();
      },
      toggle: () => handleToggleToolbarEntry(entryId),
      setIcon: (icon) => registry.updateToolbarEntry(entryId, { icon }),
      setTooltip: (tooltip) =>
        registry.updateToolbarEntry(entryId, { tooltip }),
      setBadge: (badge) => registry.updateToolbarEntry(entryId, { badge }),
      setVisible: (isVisible) =>
        registry.updateToolbarEntry(entryId, { isVisible }),
    });

    const activeToolbarEntryHandle = (): ToolbarEntryHandle | null => {
      const activeEntryId = activeToolbarEntryId();
      return activeEntryId ? getToolbarEntryHandle(activeEntryId) : null;
    };

    const dismissToolbarEntry = () => {
      stopTrackingDropdownPosition();
      setToolbarEntryDropdownPosition(null);
      setActiveToolbarEntryId(null);
    };

    const handleToggleToolbarEntry = (entryId: string) => {
      const entry = registry.store.toolbarEntries.find(
        (toolbarEntry) => toolbarEntry.id === entryId,
      );
      if (!entry) return;

      const handle = getToolbarEntryHandle(entryId);

      if (!entry.onRender) {
        entry.onClick?.(handle);
        return;
      }

      if (activeToolbarEntryId() === entryId) {
        dismissToolbarEntry();
      } else {
        dismissToolbarEntry();
        actions.hideContextMenu();
        ctx.shared.dismissAllPopups?.();
        entry.onClick?.(handle);
        setActiveToolbarEntryId(entryId);
        openTrackedDropdown(setToolbarEntryDropdownPosition);
      }
    };

    const handleToggleToolbarMenu = () => {
      if (toolbarMenuPosition() !== null) {
        dismissToolbarMenu();
      } else {
        actions.hideContextMenu();
        ctx.shared.dismissAllPopups?.();
        openTrackedDropdown(setToolbarMenuPosition);
      }
    };

    const handleSetDefaultAction = (actionId: string) => {
      updateToolbarState({ defaultAction: actionId });
    };

    const dismissToolbarPopups = () => {
      dismissToolbarMenu();
      dismissToolbarEntry();
    };

    const activateRenderer = () => {
      const wasInHoldingState = isHoldingKeys();
      actions.activate();
      // HACK: Only call onActivate if we weren't in holding state.
      // When coming from holding state, the reactive effect (previouslyHoldingKeys transition)
      // will handle calling onActivate to avoid duplicate invocations.
      if (!wasInHoldingState) {
        registry.hooks.onActivate();
      }
    };

    const deactivateRenderer = () => {
      const wasDragging = isDragging();
      const previousFocused = store.previouslyFocusedElement;
      actions.deactivate();
      // Delegate subsystem cleanup to shared functions from other plugins
      ctx.shared.clearArrowNavigation?.();
      if (wasDragging) {
        document.body.style.userSelect = "";
      }
      if (
        previousFocused instanceof HTMLElement &&
        isElementConnected(previousFocused)
      ) {
        previousFocused.focus();
      }
      registry.hooks.onDeactivate();
    };

    const forceDeactivateAll = () => {
      if (isHoldingKeys()) {
        actions.releaseHold();
      }
      if (isActivated()) {
        deactivateRenderer();
      }
    };

    const toggleActivate = () => {
      actions.setWasActivatedByToggle(true);
      activateRenderer();
    };

    const handleToggleActive = () => {
      if (isActivated()) {
        deactivateRenderer();
      } else if (isEnabled()) {
        const defaultActionId =
          currentToolbarState()?.defaultAction ?? DEFAULT_ACTION_ID;
        if (defaultActionId === DEFAULT_ACTION_ID) {
          actions.setPendingCommentMode(true);
        }
        toggleActivate();
      }
    };

    const handleToggleEnabled = () => {
      const newEnabled = !isEnabled();
      setIsEnabled(newEnabled);
      updateToolbarState({ enabled: newEnabled });
      if (!newEnabled) {
        forceDeactivateAll();
        ctx.shared.dismissAllPopups?.();
      }
    };

    ctx.shared.activateRenderer = activateRenderer;
    ctx.shared.deactivateRenderer = deactivateRenderer;
    ctx.shared.toggleActivate = toggleActivate;
    ctx.shared.forceDeactivateAll = forceDeactivateAll;
    ctx.shared.handleToggleEnabled = handleToggleEnabled;
    ctx.shared.handleSetDefaultAction = handleSetDefaultAction;
    ctx.shared.updateToolbarState = updateToolbarState;
    ctx.shared.isRendererActive = () => isRendererActive();
    ctx.shared.isToolbarSelectHovered = () => isToolbarSelectHovered();
    ctx.shared.getCurrentToolbarState = () => currentToolbarState();
    ctx.shared.subscribeToToolbarStateChanges = (
      callback: (state: ToolbarState) => void,
    ) => {
      toolbarStateChangeCallbacks.add(callback);
      return () => {
        toolbarStateChangeCallbacks.delete(callback);
      };
    };
    ctx.shared.shakeToolbar = () => setToolbarShakeCount((count) => count + 1);
    ctx.shared.toggleToolbarEntry = (entryId: string) =>
      handleToggleToolbarEntry(entryId);
    ctx.shared.closeToolbarEntry = () => dismissToolbarEntry();
    ctx.shared.setEnabled = (enabled: boolean) => {
      if (enabled === isEnabled()) return;
      setIsEnabled(enabled);
      updateToolbarState({ enabled });
      if (!enabled) {
        forceDeactivateAll();
        ctx.shared.dismissAllPopups?.();
      }
    };
    ctx.shared.isEnabled = () => isEnabled();

    // Chain into dismissAllPopups so other plugins' popups are also dismissed
    const previousDismissAllPopups = ctx.shared.dismissAllPopups;
    ctx.shared.dismissAllPopups = () => {
      previousDismissAllPopups?.();
      dismissToolbarPopups();
    };

    ctx.provide("toolbarVisible", () => registry.store.theme.toolbar.enabled);
    ctx.provide("isActive", () => isActivated());
    ctx.provide("enabled", () => isEnabled());
    ctx.provide("onToggleActive", () => handleToggleActive);
    ctx.provide("onToggleEnabled", () => handleToggleEnabled);
    ctx.provide("shakeCount", () => toolbarShakeCount());
    ctx.provide("onToolbarStateChange", () => (state: ToolbarState) => {
      setCurrentToolbarState(state);
      toolbarStateChangeCallbacks.forEach((callback) => callback(state));
    });
    ctx.provide(
      "onSubscribeToToolbarStateChanges",
      () => (callback: (state: ToolbarState) => void) => {
        toolbarStateChangeCallbacks.add(callback);
        return () => {
          toolbarStateChangeCallbacks.delete(callback);
        };
      },
    );
    ctx.provide("onToolbarSelectHoverChange", () => setIsToolbarSelectHovered);
    ctx.provide("onToolbarRef", () => (element: HTMLDivElement) => {
      toolbarElement = element;
    });
    ctx.provide("toolbarMenuPosition", () => toolbarMenuPosition());
    ctx.provide("toolbarMenuActions", () =>
      registry.store.actions.filter(
        (action) => action.showInToolbarMenu === true,
      ),
    );
    ctx.provide(
      "defaultActionId",
      () => currentToolbarState()?.defaultAction ?? DEFAULT_ACTION_ID,
    );
    ctx.provide("onSetDefaultAction", () => handleSetDefaultAction);
    ctx.provide("onToggleToolbarMenu", () => handleToggleToolbarMenu);
    ctx.provide("onToolbarMenuDismiss", () => dismissToolbarMenu);
    ctx.provide("toolbarEntries", () => registry.store.toolbarEntries);
    ctx.provide(
      "toolbarEntryOverrides",
      () => registry.store.toolbarEntryOverrides,
    );
    ctx.provide("activeToolbarEntryId", () => activeToolbarEntryId());
    ctx.provide("activeToolbarEntryHandle", () => activeToolbarEntryHandle());
    ctx.provide("toolbarEntryDropdownPosition", () =>
      toolbarEntryDropdownPosition(),
    );
    ctx.provide("onToggleToolbarEntry", () => handleToggleToolbarEntry);
    ctx.provide("onToolbarEntryDismiss", () => dismissToolbarEntry);
    ctx.provide(
      "isFrozen",
      () => isFrozenPhase() || isActivated() || isToolbarSelectHovered(),
    );

    return () => {
      stopTrackingDropdownPosition();
      unlockViewportZoom?.();
      unlockViewportZoom = null;
      document.body.style.touchAction = "";
      toolbarStateChangeCallbacks.clear();
    };
  },
};
