import { Show, type Component, type JSX } from "solid-js";
import { Tooltip } from "../tooltip.jsx";

interface ToolbarActionButtonProps {
  actionId: string;
  label: string;
  isActive?: boolean;
  isToggle?: boolean;
  class?: string;
  wrapperClass?: string;
  ref?: (element: HTMLButtonElement) => void;
  onClick?: (event: MouseEvent) => void;
  onContextMenu?: (event: MouseEvent) => void;
  onMouseEnter?: (event: MouseEvent) => void;
  onMouseLeave?: (event: MouseEvent) => void;
  icon: JSX.Element;
  tooltip?: JSX.Element;
  tooltipVisible?: boolean;
  tooltipPosition?: "top" | "bottom" | "left" | "right";
}

export const ToolbarActionButton: Component<ToolbarActionButtonProps> = (props) => (
  <div class={props.wrapperClass}>
    <button
      ref={props.ref}
      data-react-grab-ignore-events
      data-react-grab-toolbar-toggle={props.isToggle ? "" : undefined}
      data-react-grab-toolbar-action={props.actionId}
      aria-label={props.label}
      aria-pressed={Boolean(props.isActive)}
      type="button"
      class={props.class}
      onClick={props.onClick}
      on:contextmenu={(event) => props.onContextMenu?.(event)}
      onMouseEnter={props.onMouseEnter}
      onMouseLeave={props.onMouseLeave}
    >
      {props.icon}
    </button>
    <Show when={props.tooltip}>
      <Tooltip visible={Boolean(props.tooltipVisible)} position={props.tooltipPosition ?? "top"}>
        {props.tooltip}
      </Tooltip>
    </Show>
  </div>
);
