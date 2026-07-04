import { Index, Show, type Component } from "solid-js";
import type { ReactGrabRendererProps } from "../types.js";
import { DEFAULT_ACTION_ID } from "../constants.js";
import { requestOpenFile } from "../utils/open-file.js";
import { isElementConnected } from "../utils/is-element-connected.js";
import { OverlayCanvas } from "./overlay-canvas.js";
import { FrozenGlow } from "./frozen-glow.js";
import { SelectionLabel } from "./selection-label/index.js";
import { Toolbar } from "./toolbar/index.js";
import { ContextMenu } from "./context-menu.js";
import { EditPanel } from "./edit-panel/index.js";
import { TimeMachinePanel } from "./time-machine-panel/index.js";
import { ToolbarMenu } from "./toolbar/toolbar-menu.js";
import { HierarchyMenu } from "./toolbar/hierarchy-menu.js";

export const ReactGrabRenderer: Component<ReactGrabRendererProps> = (props) => {
  return (
    <>
      <OverlayCanvas
        selectionVisible={props.selectionVisible}
        selectionBounds={props.selectionBounds}
        selectionBoundsMultiple={props.selectionBoundsMultiple}
        selectionShouldSnap={props.selectionShouldSnap}
        dragVisible={props.dragVisible}
        dragBounds={props.dragBounds}
        grabbedBoxes={props.grabbedBoxes}
        labelInstances={props.labelInstances}
      />
      <FrozenGlow visible={props.isFrozen ?? false} />
      <Show when={props.selectionLabelVisible && (props.frozenLabelEntries?.length ?? 0) > 0}>
        <Index each={props.frozenLabelEntries ?? []}>
          {(entry, entryIndex) => (
            <SelectionLabel
              tagName={entry().tagName}
              componentName={entry().componentName}
              selectionBounds={entry().bounds}
              mouseX={entry().mouseX}
              visible={true}
              shouldToggleExpandOnClick={entryIndex === 0}
              onToggleExpand={entryIndex === 0 ? props.onToggleExpand : undefined}
            />
          )}
        </Index>
      </Show>
      <Show when={props.selectionLabelVisible && props.pendingShiftPreviewEntry}>
        {(pendingEntry) => (
          <SelectionLabel
            tagName={pendingEntry().tagName}
            componentName={pendingEntry().componentName}
            selectionBounds={pendingEntry().bounds}
            mouseX={pendingEntry().mouseX}
            visible={true}
          />
        )}
      </Show>
      <Show
        when={
          props.selectionLabelVisible &&
          props.selectionBounds &&
          (props.frozenLabelEntries?.length ?? 0) === 0
        }
      >
        <SelectionLabel
          tagName={props.selectionTagName}
          componentName={props.selectionComponentName}
          elementsCount={props.selectionElementsCount}
          selectionBounds={props.selectionBounds}
          mouseX={props.mouseX}
          visible={props.selectionLabelVisible}
          isPromptMode={props.isPromptMode}
          inputValue={props.inputValue}
          status={props.selectionLabelStatus}
          filePath={props.selectionFilePath}
          onInputChange={props.onInputChange}
          onSubmit={props.onInputSubmit}
          onToggleExpand={props.onToggleExpand}
          selectionLabelShakeCount={props.selectionLabelShakeCount}
          onConfirmDismiss={props.onConfirmDismiss}
          discardPrompt={props.discardPrompt}
          onOpen={() => {
            if (props.selectionFilePath) {
              requestOpenFile(props.selectionFilePath, props.selectionLineNumber);
            }
          }}
          isContextMenuOpen={props.contextMenuPosition !== null}
        />
      </Show>
      <Index each={props.labelInstances ?? []}>
        {(instance) => (
          <SelectionLabel
            tagName={instance().tagName}
            componentName={instance().componentName}
            elementsCount={instance().elementsCount}
            selectionBounds={instance().bounds}
            mouseX={instance().mouseX}
            visible={true}
            status={instance().status}
            statusText={instance().statusText}
            isPromptMode={instance().isPromptMode}
            inputValue={instance().inputValue}
            error={instance().errorMessage}
            hideArrow={instance().hideArrow}
            onShowContextMenu={(() => {
              const currentInstance = instance();
              const hasCompletedStatus =
                currentInstance.status === "copied" || currentInstance.status === "fading";
              if (!hasCompletedStatus || !isElementConnected(currentInstance.element)) {
                return undefined;
              }
              return () => props.onShowContextMenuInstance?.(currentInstance.id);
            })()}
            onHoverChange={(isHovered) =>
              props.onLabelInstanceHoverChange?.(instance().id, isHovered)
            }
          />
        )}
      </Index>
      <Show when={props.toolbarVisible !== false}>
        <Toolbar
          isActive={props.isActive}
          isContextMenuOpen={props.contextMenuPosition !== null}
          onToggle={props.onToggleActive}
          onActivateAction={props.onActivateAction}
          activeActionId={props.activeActionId}
          enabled={props.enabled}
          shakeCount={props.shakeCount}
          onStateChange={props.onToolbarStateChange}
          onSubscribeToStateChanges={props.onSubscribeToToolbarStateChanges}
          onSelectHoverChange={props.onToolbarSelectHoverChange}
          onContainerRef={props.onToolbarRef}
          onToggleToolbarMenu={props.onToggleToolbarMenu}
        />
      </Show>
      <ContextMenu
        position={props.contextMenuPosition ?? null}
        selectionBounds={props.contextMenuBounds ?? null}
        tagName={props.contextMenuTagName}
        componentName={props.contextMenuComponentName}
        hasFilePath={props.contextMenuHasFilePath ?? false}
        actions={props.actions}
        actionContext={props.actionContext}
        onDismiss={props.onContextMenuDismiss ?? (() => {})}
        onHide={props.onContextMenuHide ?? (() => {})}
      />
      <ToolbarMenu
        position={props.toolbarMenuPosition ?? null}
        actions={props.toolbarMenuActions ?? []}
        defaultActionId={props.defaultActionId ?? DEFAULT_ACTION_ID}
        onSetDefaultAction={props.onSetDefaultAction ?? (() => {})}
        onDismiss={props.onToolbarMenuDismiss ?? (() => {})}
      />
      <HierarchyMenu position={props.hierarchyMenuPosition ?? null} state={props.hierarchyState} />
      <EditPanel
        state={props.editPanelState ?? null}
        position={props.editPanelPosition ?? null}
        onDismiss={props.onEditPanelDismiss ?? (() => {})}
        onSubmit={props.onEditPanelSubmit ?? (() => {})}
        onPendingEditsChange={props.onEditPanelPendingEditsChange}
        onInteractingChange={props.onEditPanelInteractingChange}
      />
      <TimeMachinePanel
        state={props.timeMachineState ?? null}
        position={props.timeMachinePosition ?? null}
        entries={props.timeMachineEntries ?? []}
        cursor={props.timeMachineCursor ?? 0}
        onTravel={props.onTimeMachineTravel ?? (() => {})}
        onDismiss={props.onTimeMachineDismiss ?? (() => {})}
      />
    </>
  );
};
