import { Show, Index } from "solid-js";
import type { Component } from "solid-js";
import type { ReactGrabRendererProps } from "../types.js";
import { buildOpenFileUrl } from "../utils/build-open-file-url.js";
import { OverlayCanvas } from "./overlay-canvas.js";
import { SelectionLabel } from "./selection-label.js";
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
          />
        )}
      </Index>

      <Show when={props.toolbarVisible !== false}>
        <Toolbar
          isActive={props.isActive}
          onToggle={props.onToggleActive}
          enabled={props.enabled}
          onToggleEnabled={props.onToggleEnabled}
          shakeCount={props.shakeCount}
          onStateChange={props.onToolbarStateChange}
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
