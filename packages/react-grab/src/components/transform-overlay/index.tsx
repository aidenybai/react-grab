import { For, type Component } from "solid-js";
import {
  TRANSFORM_FRAME_BORDER_PX,
  TRANSFORM_HANDLE_SIZE_PX,
  TRANSFORM_OVERLAY_ACCENT,
  Z_INDEX_TRANSFORM_OVERLAY,
} from "../../constants.js";
import type { TransformHandleId } from "../../types.js";
import { suppressMenuEvent } from "../../utils/suppress-menu-event.js";
import type { TransformController } from "./transform-controller.js";

interface HandleDescriptor {
  id: TransformHandleId;
  leftPercent: number;
  topPercent: number;
  cursor: string;
}

const HANDLES: readonly HandleDescriptor[] = [
  { id: "nw", leftPercent: 0, topPercent: 0, cursor: "nwse-resize" },
  { id: "ne", leftPercent: 100, topPercent: 0, cursor: "nesw-resize" },
  { id: "se", leftPercent: 100, topPercent: 100, cursor: "nwse-resize" },
  { id: "sw", leftPercent: 0, topPercent: 100, cursor: "nesw-resize" },
];

interface TransformOverlayProps {
  controller: TransformController;
}

export const TransformOverlay: Component<TransformOverlayProps> = (props) => {
  const frame = props.controller.frame;

  const beginInteraction = (event: PointerEvent, start: (event: PointerEvent) => void) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    start(event);
  };

  return (
    <div
      data-react-grab-ignore-events
      data-react-grab-transform-overlay
      style={{
        position: "fixed",
        left: `${frame().centerX}px`,
        top: `${frame().centerY}px`,
        width: `${frame().width}px`,
        height: `${frame().height}px`,
        transform: "translate(-50%, -50%)",
        "z-index": `${Z_INDEX_TRANSFORM_OVERLAY}`,
        "pointer-events": "none",
      }}
      onContextMenu={suppressMenuEvent}
    >
      <div
        aria-label="Move element"
        style={{
          position: "absolute",
          inset: "0",
          border: `${TRANSFORM_FRAME_BORDER_PX}px solid ${TRANSFORM_OVERLAY_ACCENT}`,
          "box-sizing": "border-box",
          cursor: "move",
          "pointer-events": "auto",
          "touch-action": "none",
        }}
        onPointerDown={(event) => beginInteraction(event, props.controller.startMove)}
      />

      <For each={HANDLES}>
        {(handle) => (
          <div
            aria-label={`Resize ${handle.id}`}
            style={{
              position: "absolute",
              left: `${handle.leftPercent}%`,
              top: `${handle.topPercent}%`,
              width: `${TRANSFORM_HANDLE_SIZE_PX}px`,
              height: `${TRANSFORM_HANDLE_SIZE_PX}px`,
              transform: "translate(-50%, -50%)",
              background: "var(--rg-panel-bg)",
              border: `${TRANSFORM_FRAME_BORDER_PX}px solid ${TRANSFORM_OVERLAY_ACCENT}`,
              "box-sizing": "border-box",
              "border-radius": "2px",
              cursor: handle.cursor,
              "pointer-events": "auto",
              "touch-action": "none",
            }}
            onPointerDown={(event) =>
              beginInteraction(event, (pointerEvent) =>
                props.controller.startResize(pointerEvent, handle.id),
              )
            }
          />
        )}
      </For>
    </div>
  );
};
