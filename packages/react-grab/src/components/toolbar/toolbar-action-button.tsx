import { flush, onSettled, Show, type Component } from "solid-js";
import type { JSX } from "@solidjs/web";
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
  tooltip?: string;
  tooltipVisible?: boolean;
  tooltipPosition?: "top" | "bottom" | "left" | "right";
}

export const ToolbarActionButton: Component<ToolbarActionButtonProps> = (props) => {
  let buttonElement: HTMLButtonElement | undefined;
  const handleContextMenu = (event: MouseEvent) => {
    props.onContextMenu?.(event);
    flush();
  };
  const bindButtonElement = (element: HTMLButtonElement) => {
    buttonElement = element;
    props.ref?.(element);
    element.addEventListener("contextmenu", handleContextMenu);
  };

  onSettled(() => () => buttonElement?.removeEventListener("contextmenu", handleContextMenu));

  return (
    <div class={props.wrapperClass}>
      <button
        ref={bindButtonElement}
        data-react-grab-ignore-events
        data-react-grab-toolbar-toggle={props.isToggle ? "" : undefined}
        data-react-grab-toolbar-action={props.actionId}
        aria-label={props.label}
        aria-pressed={props.isActive ? "true" : "false"}
        type="button"
        class={props.class}
        onClick={props.onClick}
        onMouseEnter={props.onMouseEnter}
        onMouseLeave={props.onMouseLeave}
      >
        {props.icon}
      </button>
      <Show when={props.tooltip}>
        {(tooltip) => (
          <Tooltip
            visible={Boolean(props.tooltipVisible)}
            position={props.tooltipPosition ?? "top"}
            textContent={tooltip()}
          />
        )}
      </Show>
    </div>
  );
};
