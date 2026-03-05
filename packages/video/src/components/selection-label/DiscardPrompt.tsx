import type React from "react";
import { IconReturn } from "../icons/IconReturn";
import { BottomSection } from "./BottomSection";

interface DiscardPromptProps {
  label?: string;
}

export const DiscardPrompt: React.FC<DiscardPromptProps> = ({
  label = "Discard?",
}) => {
  return (
    <div className="shrink-0 flex flex-col justify-center items-end w-fit h-fit">
      <div className="shrink-0 flex items-center gap-1 pt-1.5 pb-1 px-2 w-full h-fit">
        <span className="text-black text-[13px] leading-4 shrink-0 font-sans font-medium w-fit h-fit">
          {label}
        </span>
      </div>
      <BottomSection>
        <div className="shrink-0 flex items-center justify-end gap-[5px] w-full h-fit">
          <div className="shrink-0 flex items-center justify-center px-[3px] py-px rounded-sm bg-white [border-width:0.5px] border-solid border-[#B3B3B3] h-[17px]">
            <span className="text-black text-[13px] leading-3.5 font-sans font-medium">
              No
            </span>
          </div>
          <div className="shrink-0 flex items-center justify-center gap-0.5 px-[3px] py-px rounded-sm bg-[#FEF2F2] h-[17px]">
            <span className="text-[#B91C1C] text-[13px] leading-3.5 font-sans font-medium">
              Yes
            </span>
            <IconReturn size={10} className="text-[#B91C1C]/50" />
          </div>
        </div>
      </BottomSection>
    </div>
  );
};
