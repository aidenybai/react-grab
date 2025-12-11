import type { Component } from "solid-js";
import type { OverlayBounds } from "../types.js";

interface MinimalProcessingIndicatorProps {
  bounds: OverlayBounds;
  mouseX: number;
  onHover: () => void;
}

export const MinimalProcessingIndicator: Component<
  MinimalProcessingIndicatorProps
> = (props) => {
  const positionLeft = () => props.mouseX;
  const positionTop = () => props.bounds.y + props.bounds.height + 12;

  return (
    <div
      class="fixed z-2147483647 font-sans antialiased cursor-pointer filter-[drop-shadow(0px_0px_4px_#51515180)]"
      style={{
        left: `${positionLeft()}px`,
        top: `${positionTop()}px`,
        transform: "translateX(-50%)",
      }}
      onMouseEnter={props.onHover}
    >
      <div class="bg-white rounded-xs px-1.5 py-0.5 [border-width:0.5px] border-solid border-[#D9D9D9]">
        <span class="text-[#71717a] text-[12px] leading-4 font-medium font-mono animate-pulse">
          ...
        </span>
      </div>
    </div>
  );
};
