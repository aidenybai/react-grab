import { type Accessor, type Setter, type JSX } from "solid-js";
import { render } from "solid-js/web";
import { DEFAULT_ACTION_ID } from "../constants.js";
import type {
  ArrowNavigationState,
  ContextMenuActionContext,
  FrozenLabelEntry,
  Plugin,
  ContextMenuAction,
  DropdownAnchor,
  OverlayBounds,
  Position,
  PublicGrabbedBox,
  SelectionLabelInstance,
  ToolbarState,
} from "../types.js";
import type { GrabStoreHandle } from "./store.js";
import type { createPluginRegistry } from "./plugin-registry.js";

type PluginRegistry = ReturnType<typeof createPluginRegistry>;

interface MountRendererInput {
  grab: GrabStoreHandle;
  pluginRegistry: PluginRegistry;
  rendererRoot: ParentNode;
  isDisposed: () => boolean;
  setDisposeRenderer: (dispose: () => void) => void;

  // Reactive accessors used by the renderer
  selectionVisible: Accessor<boolean>;
  selectionBounds: Accessor<OverlayBounds | undefined>;
  selectionBoundsMultiple: Accessor<OverlayBounds[] | undefined>;
  dragPreviewBounds: Accessor<OverlayBounds[]>;
  frozenLabelEntries: Accessor<FrozenLabelEntry[]>;
  pendingShiftPreviewEntry: Accessor<FrozenLabelEntry | null>;
  selectionTagName: Accessor<string | undefined>;
  resolvedComponentName: Accessor<string | undefined>;
  selectionLabelVisible: Accessor<boolean>;
  arrowNavigationState: Accessor<ArrowNavigationState>;
  computedLabelInstances: Accessor<SelectionLabelInstance[]>;
  dragVisible: Accessor<boolean | undefined>;
  dragBounds: Accessor<OverlayBounds | undefined>;
  computedGrabbedBoxes: Accessor<PublicGrabbedBox[]>;
  shiftSelectionLabelMouseX: Accessor<number | undefined>;
  cursorPosition: Accessor<Position>;
  isFrozenPhase: Accessor<boolean>;
  isActivated: Accessor<boolean>;
  isToolbarSelectHovered: Accessor<boolean>;
  isPromptMode: Accessor<boolean>;
  isPendingDismiss: Accessor<boolean>;
  isEnabled: Accessor<boolean>;
  selectionLabelShakeCount: Accessor<number>;
  toolbarShakeCount: Accessor<number>;
  contextMenuPosition: Accessor<Position | null>;
  contextMenuBounds: Accessor<OverlayBounds | null | undefined>;
  contextMenuTagName: Accessor<string | undefined>;
  contextMenuComponentName: Accessor<string | undefined>;
  contextMenuHasFilePath: Accessor<boolean>;
  contextMenuActionContext: Accessor<ContextMenuActionContext | undefined>;
  toolbarMenuPosition: Accessor<DropdownAnchor | null>;
  currentToolbarState: Accessor<ToolbarState | null | undefined>;

  // Plugin store accessors (read-through to pluginRegistry.store)
  themeToolbarEnabled: () => boolean | undefined;
  storeActions: () => ContextMenuAction[];

  // Event handlers / setters
  handleArrowNavigationSelect: (index: number) => void;
  handleShowContextMenuInstance: (instanceId: string) => void;
  handleLabelInstanceHoverChange: (instanceId: string, isHovered: boolean) => void;
  handleInputSubmit: () => Promise<unknown> | void;
  handleToggleExpand: () => void;
  handleConfirmDismiss: () => void;
  handleCancelDismiss: () => void;
  handleToggleActive: () => void;
  handleContextMenuDismiss: () => void;
  deferHideContextMenu: () => void;
  handleSetDefaultAction: (actionId: string) => void;
  handleToggleToolbarMenu: () => void;
  dismissToolbarMenu: () => void;
  setCurrentToolbarState: Setter<ToolbarState | null>;
  setIsEnabled: Setter<boolean>;
  forceDeactivateAll: () => void;
  dismissAllPopups: () => void;
  toolbarStateNotify: (state: ToolbarState) => void;
  toolbarStateOnChange: (handler: (state: ToolbarState) => void) => () => void;
  setIsToolbarSelectHovered: (value: boolean) => void;
  setToolbarElement: (element: HTMLDivElement | undefined) => void;
}

/**
 * Mounts the ReactGrabRenderer via dynamic import + solid-js/web `render`,
 * passing the ~60 reactive accessor/callback props the renderer needs.
 *
 * The renderer is dynamically imported because solid-js/web's
 * `delegateEvents()` runs at module evaluation time and accesses
 * `document`, which would crash during SSR.
 *
 * If theme is disabled, this is a no-op.
 */
export const mountRenderer = (input: MountRendererInput): void => {
  const {
    grab,
    pluginRegistry,
    rendererRoot,
    isDisposed,
    setDisposeRenderer,
    selectionVisible,
    selectionBounds,
    selectionBoundsMultiple,
    dragPreviewBounds,
    frozenLabelEntries,
    pendingShiftPreviewEntry,
    selectionTagName,
    resolvedComponentName,
    selectionLabelVisible,
    arrowNavigationState,
    computedLabelInstances,
    dragVisible,
    dragBounds,
    computedGrabbedBoxes,
    shiftSelectionLabelMouseX,
    cursorPosition,
    isFrozenPhase,
    isActivated,
    isToolbarSelectHovered,
    isPromptMode,
    isPendingDismiss,
    isEnabled,
    selectionLabelShakeCount,
    toolbarShakeCount,
    contextMenuPosition,
    contextMenuBounds,
    contextMenuTagName,
    contextMenuComponentName,
    contextMenuHasFilePath,
    contextMenuActionContext,
    toolbarMenuPosition,
    currentToolbarState,
    themeToolbarEnabled,
    storeActions,
    handleArrowNavigationSelect,
    handleShowContextMenuInstance,
    handleLabelInstanceHoverChange,
    handleInputSubmit,
    handleToggleExpand,
    handleConfirmDismiss,
    handleCancelDismiss,
    handleToggleActive,
    handleContextMenuDismiss,
    deferHideContextMenu,
    handleSetDefaultAction,
    handleToggleToolbarMenu,
    dismissToolbarMenu,
    setCurrentToolbarState,
    setIsEnabled,
    forceDeactivateAll,
    dismissAllPopups,
    toolbarStateNotify,
    toolbarStateOnChange,
    setIsToolbarSelectHovered,
    setToolbarElement,
  } = input;
  const { store, actions } = grab;

  if (!pluginRegistry.store.theme.enabled) return;

  void import("../components/renderer.js")
    .then(({ ReactGrabRenderer }) => {
      if (isDisposed()) return;
      const dispose = render((): JSX.Element => {
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
            selectionArrowNavigationState={arrowNavigationState()}
            onArrowNavigationSelect={handleArrowNavigationSelect}
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
            onLabelInstanceHoverChange={handleLabelInstanceHoverChange}
            onInputChange={actions.setInputText}
            onInputSubmit={() => void handleInputSubmit()}
            onToggleExpand={handleToggleExpand}
            isPendingDismiss={isPendingDismiss()}
            selectionLabelShakeCount={selectionLabelShakeCount()}
            onConfirmDismiss={handleConfirmDismiss}
            onCancelDismiss={handleCancelDismiss}
            toolbarVisible={themeToolbarEnabled()}
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
              toolbarStateNotify(state);
            }}
            onSubscribeToToolbarStateChanges={toolbarStateOnChange}
            onToolbarSelectHoverChange={setIsToolbarSelectHovered}
            onToolbarRef={setToolbarElement}
            contextMenuPosition={contextMenuPosition()}
            contextMenuBounds={contextMenuBounds()}
            contextMenuTagName={contextMenuTagName()}
            contextMenuComponentName={contextMenuComponentName()}
            contextMenuHasFilePath={contextMenuHasFilePath()}
            actions={storeActions()}
            actionContext={contextMenuActionContext()}
            onContextMenuDismiss={handleContextMenuDismiss}
            onContextMenuHide={deferHideContextMenu}
            toolbarMenuPosition={toolbarMenuPosition()}
            toolbarMenuActions={storeActions().filter(
              (action: ContextMenuAction) => action.showInToolbarMenu === true,
            )}
            defaultActionId={currentToolbarState()?.defaultAction ?? DEFAULT_ACTION_ID}
            onSetDefaultAction={handleSetDefaultAction}
            onToggleToolbarMenu={handleToggleToolbarMenu}
            onToolbarMenuDismiss={dismissToolbarMenu}
          />
        );
      }, rendererRoot as Element);
      setDisposeRenderer(dispose);
    })
    .catch((error: unknown) => {
      console.warn("[react-grab] Failed to load renderer:", error);
    });
};

// Re-export Plugin to silence the unused import detector if needed in
// downstream consumers; keeping the type close to the module that exposes it.
export type { Plugin };
