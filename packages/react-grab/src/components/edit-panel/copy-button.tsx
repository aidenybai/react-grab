import type { Component } from "solid-js";
import { Button } from "../ui/button.js";

interface EditPanelCopyButtonProps {
  onCopy: () => void;
}

export const EditPanelCopyButton: Component<EditPanelCopyButtonProps> = (props) => (
  <Button
    data-react-grab-ignore-events
    data-react-grab-copy-button
    onClick={(event) => {
      event.preventDefault();
      event.stopPropagation();
      props.onCopy();
    }}
  >
    <span class="text-[var(--rg-text-primary)] text-[13px] leading-3.5 font-sans font-medium">
      Copy
    </span>
  </Button>
);
