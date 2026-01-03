import { Show, For, Index, createMemo } from "solid-js";
import type { Component } from "solid-js";
import type { ReactGrabRendererProps } from "../types.js";
import { buildOpenFileUrl } from "../utils/build-open-file-url.js";
import { SelectionBox } from "./selection-box.js";
import { Crosshair } from "./crosshair.js";
import { SelectionLabel } from "./selection-label.js";
import { Toolbar } from "./toolbar/index.js";
import { ContextMenu } from "./context-menu.js";

export const ReactGrabRenderer: Component<ReactGrabRendererProps> = (props) => {
  const agentSessionsList = createMemo(() =>
    props.agentSessions ? Array.from(props.agentSessions.values()) : [],
  );

  const selectionBoundsList = createMemo(() => {
    if (
      props.selectionBoundsMultiple &&
      props.selectionBoundsMultiple.length > 0
    ) {
      return props.selectionBoundsMultiple;
    }
    return props.selectionBounds ? [props.selectionBounds] : [];
  });

  return (
    <>
      <Show when={props.selectionVisible}>
        <For each={selectionBoundsList()}>
          {(bounds) => (
            <SelectionBox
              variant="selection"
              bounds={bounds}
              visible={props.selectionVisible}
              isFading={props.selectionLabelStatus === "fading"}
            />
          )}
        </For>
      </Show>

      <Show
        when={
          props.crosshairVisible === true &&
          props.mouseX !== undefined &&
          props.mouseY !== undefined
        }
      >
        <Crosshair
          mouseX={props.mouseX!}
          mouseY={props.mouseY!}
          visible={true}
        />
      </Show>

      <Show when={props.dragVisible && props.dragBounds}>
        <SelectionBox
          variant="drag"
          bounds={props.dragBounds!}
          visible={props.dragVisible}
        />
      </Show>

      <For each={props.grabbedBoxes ?? []}>
        {(box) => (
          <SelectionBox
            variant="grabbed"
            bounds={box.bounds}
            createdAt={box.createdAt}
          />
        )}
      </For>

      <Index each={agentSessionsList()}>
        {(session) => (
          <>
            <For each={session().selectionBounds}>
              {(bounds) => (
                <SelectionBox
                  variant="processing"
                  bounds={bounds}
                  visible={true}
                  isCompleted={!session().isStreaming}
                />
              )}
            </For>
            <Show when={session().selectionBounds.length > 0}>
              <SelectionLabel
                tagName={session().tagName}
                componentName={session().componentName}
                selectionBounds={session().selectionBounds[0]}
                mouseX={session().position.x}
                visible={true}
                hasAgent={true}
                isAgentConnected={true}
                status={
                  session().isFading
                    ? "fading"
                    : session().isStreaming
                      ? "copying"
                      : "copied"
                }
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
          <>
            <For each={instance().boundsMultiple ?? [instance().bounds]}>
              {(bounds) => (
                <SelectionBox
                  variant="grabbed"
                  bounds={bounds}
                  visible={true}
                  isFading={instance().status === "fading"}
                />
              )}
            </For>
            <SelectionLabel
              tagName={instance().tagName}
              componentName={instance().componentName}
              selectionBounds={instance().bounds}
              mouseX={instance().mouseX}
              visible={true}
              status={instance().status}
              error={instance().errorMessage}
              onShowContextMenu={
                instance().status === "copied" || instance().status === "fading"
                  ? () => props.onShowContextMenuInstance?.(instance().id)
                  : undefined
              }
            />
          </>
        )}
      </Index>

      <Show when={props.toolbarVisible !== false}>
        <Toolbar isActive={props.isActive} onToggle={props.onToggleActive} />
      </Show>

      <ContextMenu
        position={props.contextMenuPosition ?? null}
        selectionBounds={props.contextMenuBounds ?? null}
        tagName={props.contextMenuTagName}
        componentName={props.contextMenuComponentName}
        hasFilePath={props.contextMenuHasFilePath ?? false}
        hasAgent={props.contextMenuHasAgent ?? false}
        customActions={props.contextMenuActions}
        actionContext={props.contextMenuActionContext}
        onCopy={props.onContextMenuCopy ?? (() => {})}
        onCopyScreenshot={props.onContextMenuCopyScreenshot ?? (() => {})}
        onOpen={props.onContextMenuOpen ?? (() => {})}
        onEdit={props.onContextMenuEdit ?? (() => {})}
        onDismiss={props.onContextMenuDismiss ?? (() => {})}
      />
    </>
  );
};
