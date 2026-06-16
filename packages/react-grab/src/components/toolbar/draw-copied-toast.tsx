import { type Component } from "solid-js";
import type { DropdownAnchor } from "../../types.js";
import { IconCheck } from "../icons/icon-check.jsx";
import { AnchoredDropdownPanel } from "./anchored-dropdown-panel.js";

interface DrawCopiedToastProps {
  position: DropdownAnchor | null;
}

export const DrawCopiedToast: Component<DrawCopiedToastProps> = (props) => (
  <AnchoredDropdownPanel position={props.position} dataAttr="data-react-grab-draw-copied">
    <div
      role="status"
      aria-live="polite"
      class="contain-layout flex items-center gap-0.5 py-1.5 px-2 rounded-full bg-[var(--rg-panel-bg)] w-fit h-fit"
    >
      <IconCheck size={14} aria-hidden="true" class="text-[var(--rg-text-primary-85)] shrink-0" />
      <span class="text-[var(--rg-text-primary)] text-[13px] leading-4 font-sans font-medium">
        Copied
      </span>
    </div>
  </AnchoredDropdownPanel>
);
