import { Show, For } from "solid-js";
import type { Component } from "solid-js";
import type { ReactGrabRendererProps } from "../types.js";
import { SelectionBox } from "./selection-box.js";
import { Label } from "./label.js";
import { ProgressIndicator } from "./progress-indicator.js";
import { Crosshair } from "./crosshair.js";

export const ReactGrabRenderer: Component<ReactGrabRendererProps> = (props) => {
  return (
    <>
      <Show when={props.selectionVisible && props.selectionBounds}>
        <SelectionBox
          variant="selection"
          bounds={props.selectionBounds!}
          visible={props.selectionVisible}
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
          <SelectionBox variant="grabbed" bounds={box.bounds} createdAt={box.createdAt} />
        )}
      </For>

      <Show when={props.labelVariant !== "processing"}>
        <For each={props.successLabels ?? []}>
          {(label) => (
            <Label
              variant="success"
              text={label.text}
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
          props.labelText &&
          props.labelX !== undefined &&
          props.labelY !== undefined
        }
      >
        <Label
          variant={props.labelVariant!}
          text={props.labelText!}
          x={props.labelX!}
          y={props.labelY!}
          visible={props.labelVisible}
          zIndex={props.labelZIndex}
          progress={props.progress}
          showHint={props.labelShowHint}
        />
      </Show>

      <Show
        when={
          props.progressVisible &&
          props.progress !== undefined &&
          props.mouseX !== undefined &&
          props.mouseY !== undefined
        }
      >
        <ProgressIndicator
          progress={props.progress!}
          mouseX={props.mouseX!}
          mouseY={props.mouseY!}
          visible={props.progressVisible}
        />
      </Show>
    </>
  );
};
