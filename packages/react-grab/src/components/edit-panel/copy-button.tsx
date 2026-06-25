import type { Component } from "solid-js";

interface EditPanelCopyButtonProps {
  onCopy: () => void;
}

export const EditPanelCopyButton: Component<EditPanelCopyButtonProps> = (props) => (
  <button
    data-react-grab-ignore-events
    data-react-grab-copy-button
    type="button"
    class="contain-layout shrink-0 flex items-center justify-center px-[3px] py-px rounded-sm bg-[var(--rg-surface-hover)] [border-width:0.5px] border-solid border-[var(--rg-border-button)] cursor-pointer transition-all hover:bg-[var(--rg-surface-active)] press-scale h-[17px]"
    onClick={(event) => {
      event.preventDefault();
      event.stopPropagation();
      props.onCopy();
    }}
  >
    <span class="text-[var(--rg-text-primary)] text-[13px] leading-3.5 font-sans font-medium">
      Copy
    </span>
  </button>
);
