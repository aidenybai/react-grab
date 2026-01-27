import { Show, Index } from "solid-js";
import type { Component } from "solid-js";
import type { ReactGrabRendererProps } from "../types.js";
import {
  FROZEN_GLOW_COLOR,
  Z_INDEX_OVERLAY_CANVAS,
} from "../constants.js";
import { buildOpenFileUrl } from "../utils/build-open-file-url.js";
import { OverlayCanvas } from "./overlay-canvas.js";
import { SelectionLabel } from "./selection-label/index.js";
import { Toolbar } from "./toolbar/index.js";
import { ContextMenu } from "./context-menu.js";

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
          "box-shadow": `inset 0 0 40px 8px ${FROZEN_GLOW_COLOR}`,
          "z-index": Z_INDEX_OVERLAY_CANVAS,
          opacity: props.isFrozen ? 1 : 0,
          transition: "opacity 150ms ease-out",
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
              const openFileUrl = buildOpenFileUrl(
                props.selectionFilePath,
                props.selectionLineNumber,
              );
              window.open(openFileUrl, "_blank");
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
            selectionBounds={instance().bounds}
            mouseX={instance().mouseX}
            visible={true}
            status={instance().status}
            error={instance().errorMessage}
            onShowContextMenu={
              (instance().status === "copied" ||
                instance().status === "fading") &&
              instance().element &&
              (document.body ?? document.documentElement).contains(
                instance().element as Node,
              )
                ? () => props.onShowContextMenuInstance?.(instance().id)
                : undefined
            }
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
        onCopy={props.onContextMenuCopy ?? (() => {})}
        onCopyScreenshot={props.onContextMenuCopyScreenshot ?? (() => {})}
        onCopyHtml={props.onContextMenuCopyHtml ?? (() => {})}
        onOpen={props.onContextMenuOpen ?? (() => {})}
        onDismiss={props.onContextMenuDismiss ?? (() => {})}
        onHide={props.onContextMenuHide ?? (() => {})}
      />
    </>
  );
};
