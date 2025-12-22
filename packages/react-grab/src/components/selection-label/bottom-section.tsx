import type { Component } from "solid-js";
import type { BottomSectionProps } from "../../types.js";
import { BOTTOM_SECTION_GRADIENT } from "../../constants.js";

export const BottomSection: Component<BottomSectionProps> = (props) => (
  <div
    class="[font-synthesis:none] contain-layout shrink-0 flex flex-col items-start px-2 py-1 w-auto h-fit self-stretch [border-top-width:0.5px] border-t-solid border-t-[#D9D9D9] antialiased rounded-t-none rounded-b-sm"
    style={{ "background-image": BOTTOM_SECTION_GRADIENT }}
  >
    {props.children}
  </div>
);
