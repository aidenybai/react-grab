import { Show, For } from "solid-js";
import type { Component } from "solid-js";
import type { ReactGrabRendererProps } from "../types.js";
import { SelectionBox } from "./selection-box.js";
import { Crosshair } from "./crosshair.js";
import { SelectionCursor } from "./selection-cursor.js";
import { SelectionLabel } from "./selection-label.js";

const truncateStatus = (status: string, maxLength = 30): string => {
  if (status.length <= maxLength) return status;
  return `${status.slice(0, maxLength)}…`;
};

export const ReactGrabRenderer: Component<ReactGrabRendererProps> = (props) => {
  return (
    <>
      <Show when={props.selectionVisible && props.selectionBounds}>
        <SelectionBox
          variant="selection"
          bounds={props.selectionBounds!}
          visible={props.selectionVisible}
          filePath={props.selectionFilePath}
          lineNumber={props.selectionLineNumber}
          isInputExpanded={props.isInputExpanded}
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

      <For
        each={
          props.agentSessions ? Array.from(props.agentSessions.values()) : []
        }
      >
        {(session) => (
          <>
            <Show when={session.selectionBounds}>
              <SelectionBox
                variant="processing"
                bounds={session.selectionBounds!}
                visible={true}
              />
            </Show>
            <SelectionLabel
              tagName={session.tagName}
              selectionBounds={session.selectionBounds}
              visible={true}
              hasAgent={true}
              status={session.isStreaming ? "copying" : "copied"}
              statusText={truncateStatus(session.lastStatus || "Please wait…")}
            />
          </>
        )}
      </For>

      <Show when={props.selectionLabelVisible && props.selectionBounds}>
        <SelectionLabel
          tagName={props.selectionTagName}
          selectionBounds={props.selectionBounds}
          visible={props.selectionLabelVisible}
          isInputExpanded={props.isInputExpanded}
          inputValue={props.inputValue}
          hasAgent={props.hasAgent}
          status={props.selectionLabelStatus}
          onInputChange={props.onInputChange}
          onSubmit={props.onInputSubmit}
          onCancel={props.onInputCancel}
          onToggleExpand={props.onToggleExpand}
        />
      </Show>

      <For each={props.labelInstances ?? []}>
        {(instance) => (
          <SelectionLabel
            tagName={instance.tagName}
            selectionBounds={instance.bounds}
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
