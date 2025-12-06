import { Show, For, Index, createMemo } from "solid-js";
import type { Component } from "solid-js";
import type { ReactGrabRendererProps } from "../types.js";
import { buildOpenFileUrl } from "../utils/build-open-file-url.js";
import { SelectionBox } from "./selection-box.js";
import { Crosshair } from "./crosshair.js";
import { SelectionCursor } from "./selection-cursor.js";
import { SelectionLabel } from "./selection-label.js";

export const ReactGrabRenderer: Component<ReactGrabRendererProps> = (props) => {
  const agentSessionsList = createMemo(() =>
    props.agentSessions ? Array.from(props.agentSessions.values()) : []
  );

  return (
    <>
      <Show when={props.selectionVisible && props.selectionBounds}>
        <SelectionBox
          variant="selection"
          bounds={props.selectionBounds!}
          visible={props.selectionVisible}
          isFading={props.selectionLabelStatus === "fading"}
        />
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
            <Show when={session().selectionBounds}>
              <SelectionBox
                variant="processing"
                bounds={session().selectionBounds!}
                visible={true}
                isCompleted={!session().isStreaming}
              />
            </Show>
            <SelectionLabel
              tagName={session().tagName}
              componentName={session().componentName}
              selectionBounds={session().selectionBounds}
              mouseX={session().position.x}
              visible={true}
              hasAgent={true}
              isAgentConnected={true}
              status={session().isStreaming ? "copying" : "copied"}
              statusText={session().lastStatus || "Thinking…"}
              inputValue={session().context.prompt}
              onAbort={() => props.onAbortSession?.(session().id)}
            />
          </>
        )}
      </Index>

      <Show when={props.selectionLabelVisible && props.selectionBounds}>
        <SelectionLabel
          tagName={props.selectionTagName}
          componentName={props.selectionComponentName}
          selectionBounds={props.selectionBounds}
          mouseX={props.mouseX}
          visible={props.selectionLabelVisible}
          isInputExpanded={props.isInputExpanded}
          inputValue={props.inputValue}
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
        />
      </Show>

      <For each={props.labelInstances ?? []}>
        {(instance) => (
          <SelectionLabel
            tagName={instance.tagName}
            componentName={instance.componentName}
            selectionBounds={instance.bounds}
            mouseX={instance.mouseX}
            visible={true}
            status={instance.status}
          />
        )}
      </For>

      <Show
        when={
          props.nativeSelectionCursorVisible &&
          props.nativeSelectionCursorX !== undefined &&
          props.nativeSelectionCursorY !== undefined
        }
      >
        <SelectionCursor
          x={props.nativeSelectionCursorX!}
          y={props.nativeSelectionCursorY!}
          tagName={props.nativeSelectionTagName}
          componentName={props.nativeSelectionComponentName}
          elementBounds={props.nativeSelectionBounds}
          visible={props.nativeSelectionCursorVisible}
          onClick={props.onNativeSelectionCopy}
          onEnter={props.onNativeSelectionEnter}
        />
      </Show>
    </>
  );
};
