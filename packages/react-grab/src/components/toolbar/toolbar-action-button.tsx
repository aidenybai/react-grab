import type { Component, JSX } from "solid-js";

interface ToolbarActionButtonProps {
  actionId: string;
  label: string;
  isActive?: boolean;
  class?: string;
  onClick?: (event: MouseEvent) => void;
  onMouseEnter?: (event: MouseEvent) => void;
  onMouseLeave?: (event: MouseEvent) => void;
  icon: JSX.Element;
}

export const ToolbarActionButton: Component<ToolbarActionButtonProps> = (props) => (
  <button
    data-react-grab-ignore-events
    data-react-grab-toolbar-action={props.actionId}
    aria-label={props.label}
    aria-pressed={Boolean(props.isActive)}
    type="button"
    class={props.class}
    onClick={props.onClick}
    onMouseEnter={props.onMouseEnter}
    onMouseLeave={props.onMouseLeave}
  >
    {props.icon}
  </button>
);
