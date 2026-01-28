import type { Component } from "solid-js";
import type { BottomSectionProps } from "../../types.js";

export const BottomSection: Component<BottomSectionProps> = (props) => (
  <div class="[font-synthesis:none] contain-layout shrink-0 flex flex-col items-start px-2 py-1.5 w-auto h-fit self-stretch [border-top-width:0.5px] border-t-solid border-t-[#D9D9D9] antialiased rounded-t-none rounded-b-[6px]">
    {props.children}
  </div>
);
