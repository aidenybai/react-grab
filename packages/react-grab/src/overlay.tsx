import { Show, For } from "solid-js";
import type { Component } from "solid-js";
import type { ReactGrabControllerProps } from "./types.js";
import { Overlay } from "./components/overlay.js";
import { Label } from "./components/label.js";
import { ProgressIndicator } from "./components/progress-indicator.js";
import {
  SELECTION_LERP_FACTOR,
} from "./components/overlay-constants.js";

export const ReactGrabController: Component<ReactGrabControllerProps> = (props) => {
  return (
    <>
      <Show when={props.selectionVisible && props.selectionBounds}>
        <Overlay
          variant="selection"
          bounds={props.selectionBounds!}
          visible={props.selectionVisible}
          lerpFactor={SELECTION_LERP_FACTOR}
        />
      </Show>

      <Show when={props.marqueeVisible && props.marqueeBounds}>
        <Overlay
          variant="marquee"
          bounds={props.marqueeBounds!}
          visible={props.marqueeVisible}
          lerpFactor={0.9}
        />
      </Show>

      <For each={props.grabbedOverlays ?? []}>
        {(overlay) => (
          <Overlay variant="grabbed" bounds={overlay.bounds} visible={true} />
        )}
      </For>

      <For each={props.successLabels ?? []}>
        {(label) => (
          <Label
            variant="success"
            text={label.text}
            x={label.x}
            y={label.y}
            visible={true}
            zIndex={2147483648}
          />
        )}
      </For>

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
