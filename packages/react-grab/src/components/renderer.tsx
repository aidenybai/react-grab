import { Show, Index } from "solid-js";
import type { Component } from "solid-js";
import type { ReactGrabRendererProps } from "../types.js";
import {
  FROZEN_GLOW_COLOR,
  FROZEN_GLOW_EDGE_PX,
  Z_INDEX_OVERLAY_CANVAS,
} from "../constants.js";
import { openFile } from "../utils/open-file.js";
import { isElementConnected } from "../utils/is-element-connected.js";
import { OverlayCanvas } from "./overlay-canvas.js";
import { SelectionLabel } from "./selection-label/index.js";
import { Toolbar } from "./toolbar/index.js";
import { ToolbarMenu } from "./toolbar/toolbar-menu.js";
import { ContextMenu } from "./context-menu.js";
import { HistoryDropdown } from "./history-dropdown.js";
import { ClearHistoryPrompt } from "./clear-history-prompt.js";

export const ReactGrabRenderer: Component<ReactGrabRendererProps> = (props) => {
  return (
    <>
      <OverlayCanvas
        crosshairVisible={props.crosshairVisible}
        mouseX={props.mouseX}
        mouseY={props.mouseY}
        selectionVisible={props.selectionVisible}
        selectionBounds={props.selectionBounds}
        selectionBoundsMultiple={props.selectionBoundsMultiple}
        selectionShouldSnap={props.selectionShouldSnap}
        selectionIsFading={props.selectionLabelStatus === "fading"}
        dragVisible={props.dragVisible}
        dragBounds={props.dragBounds}
        grabbedBoxes={props.grabbedBoxes}
        agentSessions={props.agentSessions}
        labelInstances={props.labelInstances}
      />

      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          "pointer-events": "none",
          "z-index": Z_INDEX_OVERLAY_CANVAS,
          opacity: props.isFrozen ? 1 : 0,
          transition: "opacity 100ms ease-out",
          "will-change": "opacity",
          contain: "strict",
          transform: "translateZ(0)",
          "box-shadow": `inset 0 0 ${FROZEN_GLOW_EDGE_PX}px ${FROZEN_GLOW_COLOR}`,
        }}
      />

      <Index
        each={
          props.agentSessions ? Array.from(props.agentSessions.values()) : []
        }
      >
        {(session) => (
          <>
            <Show when={session().selectionBounds.length > 0}>
              <SelectionLabel
                tagName={session().tagName}
                componentName={session().componentName}
                selectionBounds={session().selectionBounds[0]}
                mouseX={session().position.x}
                visible={true}
                hasAgent={true}
                isAgentConnected={true}
                status={(() => {
                  if (session().isFading) return "fading";
                  if (session().isStreaming) return "copying";
                  return "copied";
                })()}
                statusText={session().lastStatus || "Thinking…"}
                inputValue={session().context.prompt}
                previousPrompt={session().context.prompt}
                supportsUndo={props.supportsUndo}
                supportsFollowUp={props.supportsFollowUp}
                dismissButtonText={props.dismissButtonText}
                onAbort={() => props.onRequestAbortSession?.(session().id)}
                onDismiss={
                  session().isStreaming
                    ? undefined
                    : () => props.onDismissSession?.(session().id)
                }
                onUndo={
                  session().isStreaming
                    ? undefined
                    : () => props.onUndoSession?.(session().id)
                }
                onFollowUpSubmit={
                  session().isStreaming
                    ? undefined
                    : (prompt) =>
                        props.onFollowUpSubmitSession?.(session().id, prompt)
                }
                error={session().error}
                onAcknowledgeError={() =>
                  props.onAcknowledgeSessionError?.(session().id)
                }
                onRetry={() => props.onRetrySession?.(session().id)}
                isPendingAbort={
                  session().isStreaming &&
                  props.pendingAbortSessionId === session().id
                }
                onConfirmAbort={() =>
                  props.onAbortSession?.(session().id, true)
                }
                onCancelAbort={() =>
                  props.onAbortSession?.(session().id, false)
                }
                onShowContextMenu={undefined}
              />
            </Show>
          </>
        )}
      </Index>

      <Show when={props.selectionLabelVisible && props.selectionBounds}>
        <SelectionLabel
          tagName={props.selectionTagName}
          componentName={props.selectionComponentName}
          elementsCount={props.selectionElementsCount}
          selectionBounds={props.selectionBounds}
          mouseX={props.mouseX}
          visible={props.selectionLabelVisible}
          isPromptMode={props.isPromptMode}
          inputValue={props.inputValue}
          replyToPrompt={props.replyToPrompt}
          hasAgent={props.hasAgent}
          isAgentConnected={props.isAgentConnected}
          status={props.selectionLabelStatus}
          actionCycleState={props.selectionActionCycleState}
          filePath={props.selectionFilePath}
          lineNumber={props.selectionLineNumber}
          onInputChange={props.onInputChange}
          onSubmit={props.onInputSubmit}
          onCancel={props.onInputCancel}
          onToggleExpand={props.onToggleExpand}
          isPendingDismiss={props.isPendingDismiss}
          onConfirmDismiss={props.onConfirmDismiss}
          onCancelDismiss={props.onCancelDismiss}
          onOpen={() => {
            if (props.selectionFilePath) {
              openFile(props.selectionFilePath, props.selectionLineNumber);
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
            hasAgent={Boolean(instance().statusText)}
            isPromptMode={instance().isPromptMode}
            inputValue={instance().inputValue}
            error={instance().errorMessage}
            hideArrow={instance().hideArrow}
            onShowContextMenu={(() => {
              const currentInstance = instance();
              const hasCompletedStatus =
                currentInstance.status === "copied" ||
                currentInstance.status === "fading";
              if (
                !hasCompletedStatus ||
                !isElementConnected(currentInstance.element)
              ) {
                return undefined;
              }
              return () =>
                props.onShowContextMenuInstance?.(currentInstance.id);
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
          enabled={props.enabled}
          onToggleEnabled={props.onToggleEnabled}
          shakeCount={props.shakeCount}
          onStateChange={props.onToolbarStateChange}
          onSubscribeToStateChanges={props.onSubscribeToToolbarStateChanges}
          onSelectHoverChange={props.onToolbarSelectHoverChange}
          onContainerRef={props.onToolbarRef}
          historyItemCount={props.historyItemCount}
          clockFlashTrigger={props.clockFlashTrigger}
          hasUnreadHistoryItems={props.hasUnreadHistoryItems}
          onToggleHistory={props.onToggleHistory}
          onCopyAll={props.onCopyAll}
          onCopyAllHover={props.onCopyAllHover}
          onHistoryButtonHover={props.onHistoryButtonHover}
          isHistoryDropdownOpen={Boolean(props.historyDropdownPosition)}
          isHistoryPinned={props.isHistoryPinned}
          toolbarActions={props.toolbarActions}
          onToggleMenu={props.onToggleMenu}
          isMenuOpen={Boolean(props.toolbarMenuPosition)}
          isClearPromptOpen={Boolean(props.clearPromptPosition)}
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
        actions={props.toolbarActions ?? []}
        onDismiss={props.onToolbarMenuDismiss ?? (() => {})}
      />

      <ClearHistoryPrompt
        position={props.clearPromptPosition ?? null}
        onConfirm={props.onClearHistoryConfirm ?? (() => {})}
        onCancel={props.onClearHistoryCancel ?? (() => {})}
      />

      <HistoryDropdown
        position={props.historyDropdownPosition ?? null}
        items={props.historyItems ?? []}
        disconnectedItemIds={props.historyDisconnectedItemIds}
        onSelectItem={props.onHistoryItemSelect}
        onRemoveItem={props.onHistoryItemRemove}
        onCopyItem={props.onHistoryItemCopy}
        onItemHover={props.onHistoryItemHover}
        onCopyAll={props.onHistoryCopyAll}
        onCopyAllHover={props.onHistoryCopyAllHover}
        onClearAll={props.onHistoryClear}
        onDismiss={props.onHistoryDismiss}
        onDropdownHover={props.onHistoryDropdownHover}
      />
    </>
  );
};
