import { type Component } from "solid-js";

interface ActionControlProps {
  label: string;
  onTrigger: () => void;
}

export const ActionControl: Component<ActionControlProps> = (props) => (
  <div class="flex items-center w-full px-2">
    <button
      type="button"
      data-react-grab-ignore-events
      class="w-full flex items-center justify-center h-[20px] rounded-[6px] bg-[var(--rg-surface-hover)] [border-width:0.5px] border-solid border-[var(--rg-border-button)] cursor-pointer transition-colors hover:bg-[var(--rg-surface-active)] press-scale text-[12px] leading-4 font-medium text-[var(--rg-text-primary)]"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        props.onTrigger();
      }}
    >
      {props.label}
    </button>
  </div>
);
