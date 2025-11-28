import { Show, For, type JSX } from "solid-js";
import type { Component } from "solid-js";
import type { ReactGrabRendererProps } from "../types.js";
import { SelectionBox } from "./selection-box.js";
import { Label } from "./label.js";
import { Crosshair } from "./crosshair.js";
import { InputOverlay } from "./input-overlay.js";

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
          hideButtons={props.inputVisible && !props.isInputExpanded}
          isInputExpanded={props.isInputExpanded}
          onToggleExpand={props.onToggleExpand}
          onCopyClick={props.onCopyClick}
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

      <Show when={props.labelVariant !== "processing"}>
        <For each={props.successLabels ?? []}>
          {(label) => (
            <Label
              variant="success"
              content={<>{label.text}</>}
              x={props.mouseX ?? 0}
              y={props.mouseY ?? 0}
            />
          )}
        </For>
      </Show>

      <Show
        when={
          props.labelVisible &&
          props.labelVariant &&
          props.labelContent !== undefined &&
          props.labelX !== undefined &&
          props.labelY !== undefined
        }
      >
        <Label
          variant={props.labelVariant as "hover" | "processing" | "success"}
          content={props.labelContent as JSX.Element}
          x={props.labelX as number}
          y={props.labelY as number}
          visible={props.labelVisible}
          zIndex={props.labelZIndex}
          progress={props.progress}
          showHint={props.labelShowHint}
        />
      </Show>

      <InputOverlay
        x={props.inputX ?? 0}
        y={props.inputY ?? 0}
        zIndex={props.labelZIndex}
        value={props.inputValue ?? ""}
        visible={props.inputVisible ?? false}
        selectionBounds={props.isInputExpanded ? props.selectionBounds : undefined}
        onInput={props.onInputChange!}
        onSubmit={props.onInputSubmit!}
        onCancel={props.onInputCancel!}
      />
    </>
  );
};
