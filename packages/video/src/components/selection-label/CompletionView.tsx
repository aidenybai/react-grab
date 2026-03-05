import type React from "react";
import { cn } from "../../utils/cn";
import { PANEL_STYLES } from "../../constants";
import { IconCheck } from "../icons/IconCheck";
import { IconReturn } from "../icons/IconReturn";
import { IconReply } from "../icons/IconReply";
import { IconSubmit } from "../icons/IconSubmit";
import { BottomSection } from "./BottomSection";

interface CompletionViewProps {
  statusText: string;
  /** Show the "completed" state with checkmark (vs the undo/keep buttons) */
  showCompleted?: boolean;
  supportsUndo?: boolean;
  supportsFollowUp?: boolean;
  dismissButtonText?: string;
  previousPrompt?: string;
  followUpValue?: string;
  showDismiss?: boolean;
  showUndo?: boolean;
}

export const CompletionView: React.FC<CompletionViewProps> = ({
  statusText,
  showCompleted,
  supportsUndo,
  supportsFollowUp,
  dismissButtonText = "Keep",
  previousPrompt,
  followUpValue = "",
  showDismiss,
  showUndo,
}) => {
  return (
    <div
      className={cn(
        "shrink-0 flex flex-col justify-center items-end rounded-[10px] antialiased w-fit h-fit max-w-[280px]",
        PANEL_STYLES,
      )}
    >
      {!showCompleted && (showDismiss || showUndo) && (
        <div className="shrink-0 flex items-center justify-between gap-2 pt-1.5 pb-1 px-2 w-full h-fit">
          <span className="text-black text-[13px] leading-4 font-sans font-medium h-fit tabular-nums overflow-hidden text-ellipsis whitespace-nowrap min-w-0">
            {statusText}
          </span>
          <div className="shrink-0 flex items-center gap-2 h-fit">
            {supportsUndo && showUndo && (
              <div className="shrink-0 flex items-center justify-center px-[3px] py-px rounded-sm bg-[#FEF2F2] h-[17px]">
                <span className="text-[#B91C1C] text-[13px] leading-3.5 font-sans font-medium">
                  Undo
                </span>
              </div>
            )}
            {showDismiss && (
              <div className="shrink-0 flex items-center justify-center gap-1 px-[3px] py-px rounded-sm bg-white [border-width:0.5px] border-solid border-[#B3B3B3] h-[17px]">
                <span className="text-black text-[13px] leading-3.5 font-sans font-medium">
                  {dismissButtonText}
                </span>
                <IconReturn size={10} className="text-black/50" />
              </div>
            )}
          </div>
        </div>
      )}
      {(showCompleted || (!showDismiss && !showUndo)) && (
        <div className="shrink-0 flex items-center gap-0.5 py-1.5 px-2 w-full h-fit">
          <IconCheck size={14} className="text-black/85 shrink-0" />
          <span className="text-black text-[13px] leading-4 font-sans font-medium h-fit tabular-nums overflow-hidden text-ellipsis whitespace-nowrap min-w-0">
            {statusText}
          </span>
        </div>
      )}
      {!showCompleted && supportsFollowUp && (
        <BottomSection>
          {previousPrompt && (
            <div className="flex items-center gap-1 w-full mb-1 overflow-hidden">
              <IconReply size={10} className="text-black/30 shrink-0" />
              <span className="text-black/40 text-[11px] leading-3 font-medium truncate italic">
                {previousPrompt}
              </span>
            </div>
          )}
          <div
            className="shrink-0 flex justify-between items-end w-full min-h-4"
            style={{ paddingLeft: previousPrompt ? "14px" : "0" }}
          >
            <div className="text-black text-[13px] leading-4 font-medium bg-transparent flex-1 p-0 m-0">
              {followUpValue || (
                <span className="text-black/40">follow-up</span>
              )}
            </div>
            <div
              className={cn(
                "shrink-0 flex items-center justify-center size-4 rounded-full bg-black ml-1",
                !followUpValue.trim() && "opacity-35",
              )}
            >
              <IconSubmit size={10} className="text-white" />
            </div>
          </div>
        </BottomSection>
      )}
    </div>
  );
};
