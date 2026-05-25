import { type Accessor, type Setter } from "solid-js";
import { DEFAULT_ACTION_ID, TOOLBAR_DEFAULT_POSITION_RATIO } from "../constants.js";
import { saveToolbarState } from "../components/toolbar/state.js";
import {
  getComponentDisplayName,
  getStackContext,
  resolveSource,
} from "./context.js";
import type {
  Plugin,
  ReactGrabAPI,
  ReactGrabState,
  SettableOptions,
  SourceInfo,
  ToolbarState,
} from "../types.js";
import type { ActivationLifecycle } from "./activation-lifecycle.js";
import type { CommentModeHandlers } from "./comment-mode-handlers.js";
import type { CopyOrchestrator } from "./copy-orchestrator.js";
import type { createGrabStore } from "./store.js";
import type { createPluginRegistry } from "./plugin-registry.js";
import type { GrabElementSelectors, GrabPhaseSelectors } from "./selectors.js";
import type { DragSelectors } from "./drag-selectors.js";
import type { OverlayVisibility } from "./overlay-visibility.js";
import type { PluginStateBridge } from "./plugin-state-bridge.js";
import type { ToolbarMenuController } from "./toolbar-menu-controller.js";
import type { ToolbarStateController } from "./toolbar-state-controller.js";
import type { MenuHandlers } from "./menu-handlers.js";

type GrabStoreHandle = ReturnType<typeof createGrabStore>;
type PluginRegistry = ReturnType<typeof createPluginRegistry>;

interface BuildPublicApiInput {
  grab: GrabStoreHandle;
  pluginRegistry: PluginRegistry;
  phase: GrabPhaseSelectors;
  elementSelectors: GrabElementSelectors;
  dragSelectors: DragSelectors;
  visibility: OverlayVisibility;
  pluginStateBridge: PluginStateBridge;
  activationLifecycle: ActivationLifecycle;
  commentModeHandlers: CommentModeHandlers;
  copyOrchestrator: CopyOrchestrator;
  toolbarMenu: ToolbarMenuController;
  toolbarStateController: ToolbarStateController;
  menuHandlers: MenuHandlers;
  isEnabled: Accessor<boolean>;
  setIsEnabled: Setter<boolean>;
  /** Mark the renderer as disposed so the async renderer-mount promise no-ops. */
  setDisposed: () => void;
  /** Read the optional disposeRenderer cleanup callback set after dynamic import. */
  getDisposeRenderer: () => (() => void) | undefined;
  /** Reset the module-level hasInited flag so a subsequent init() works. */
  resetHasInited: () => void;
  /** Solid root dispose function. */
  rootDispose: () => void;
  /** Lazy ref to the api itself, used by registerPlugin/unregisterPlugin. */
  getApi: () => ReactGrabAPI;
}

/**
 * Builds the public ReactGrabAPI surface. Most methods are thin forwarders
 * to the underlying controllers; the few that aren't (setEnabled,
 * setToolbarState, dispose) coordinate multi-subsystem state changes.
 *
 * `registerPlugin` / `unregisterPlugin` need a stable reference to the api
 * itself; the factory accepts a `getApi` callback that resolves to the
 * caller-assigned variable after construction.
 */
export const buildPublicApi = (input: BuildPublicApiInput): ReactGrabAPI => {
  const {
    grab,
    pluginRegistry,
    phase,
    elementSelectors,
    dragSelectors,
    visibility,
    pluginStateBridge,
    activationLifecycle,
    commentModeHandlers,
    copyOrchestrator,
    toolbarMenu,
    toolbarStateController,
    menuHandlers,
    isEnabled,
    setIsEnabled,
    setDisposed,
    getDisposeRenderer,
    resetHasInited,
    rootDispose,
    getApi,
  } = input;
  const { store, actions } = grab;
  const { isActivated, isDragging, isCopying, isPromptMode } = phase;
  const { targetElement } = elementSelectors;
  const { dragBounds } = dragSelectors;
  const { selectionVisible, dragVisible } = visibility;
  const { publicGrabbedBoxes, publicLabelInstances } = pluginStateBridge;
  const { deactivateRenderer, forceDeactivateAll, toggleActivate } = activationLifecycle;
  const { handleComment } = commentModeHandlers;
  const { copyResolvedElements } = copyOrchestrator;
  const { dismissAllPopups } = menuHandlers;

  const copyElement = async (
    elements: Element | Element[],
  ): Promise<boolean> => {
    const elementsArray = Array.isArray(elements) ? elements : [elements];
    if (elementsArray.length === 0) return false;
    return copyResolvedElements(elementsArray);
  };

  return {
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
      toolbarStateController.update({ enabled, collapsed: !enabled });
      if (!enabled) {
        forceDeactivateAll();
        dismissAllPopups();
      }
    },
    getToolbarState: () => toolbarStateController.load(),
    setToolbarState: (state: Partial<ToolbarState>) => {
      const currentState = toolbarStateController.load();
      const resolvedCollapsed = state.collapsed ?? currentState?.collapsed ?? false;
      const newState: ToolbarState = {
        edge: state.edge ?? currentState?.edge ?? "bottom",
        ratio: state.ratio ?? currentState?.ratio ?? TOOLBAR_DEFAULT_POSITION_RATIO,
        collapsed: resolvedCollapsed,
        enabled: !resolvedCollapsed,
        defaultAction: state.defaultAction ?? currentState?.defaultAction ?? DEFAULT_ACTION_ID,
      };
      saveToolbarState(newState);
      toolbarStateController.setCurrent(newState);
      if (newState.enabled !== isEnabled()) {
        setIsEnabled(newState.enabled);
        if (!newState.enabled) {
          forceDeactivateAll();
          dismissAllPopups();
        }
      }
      toolbarStateController.notify(newState);
    },
    onToolbarStateChange: toolbarStateController.onChange,
    dispose: () => {
      setDisposed();
      resetHasInited();
      getDisposeRenderer()?.();
      toolbarMenu.dispose();
      toolbarStateController.clearSubscribers();
      rootDispose();
    },
    copyElement,
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
      toolbarState: toolbarStateController.current(),
    }),
    setOptions: (newOptions: SettableOptions) => {
      pluginRegistry.setOptions(newOptions);
    },
    registerPlugin: (plugin: Plugin) => {
      pluginRegistry.register(plugin, getApi());
    },
    unregisterPlugin: (name: string) => {
      pluginRegistry.unregister(name);
    },
    getPlugins: () => pluginRegistry.getPluginNames(),
    getDisplayName: getComponentDisplayName,
  };
};
