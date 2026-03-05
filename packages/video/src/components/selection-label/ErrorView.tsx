import type React from "react";
import { cn } from "../../utils/cn";
import { IconRetry } from "../icons/IconRetry";
import { BottomSection } from "./BottomSection";

interface ErrorViewProps {
  error: string;
  showRetry?: boolean;
  showAcknowledge?: boolean;
}

export const ErrorView: React.FC<ErrorViewProps> = ({
  error,
  showRetry,
  showAcknowledge,
}) => {
  const hasActions = showRetry || showAcknowledge;

  return (
    <div className="shrink-0 flex flex-col justify-center items-end w-fit h-fit max-w-[280px]">
      <div
        className={cn(
          "shrink-0 flex items-start gap-1 px-2 w-full h-fit",
          hasActions ? "pt-1.5 pb-1" : "py-1.5",
        )}
      >
        <span
          className="text-[#B91C1C] text-[13px] leading-4 font-sans font-medium overflow-hidden line-clamp-5"
          title={error}
        >
          {error}
        </span>
      </div>
      {hasActions && (
        <BottomSection>
          <div className="shrink-0 flex items-center justify-end gap-[5px] w-full h-fit">
            {showRetry && (
              <div className="shrink-0 flex items-center justify-center gap-1 px-[3px] py-px rounded-sm bg-white [border-width:0.5px] border-solid border-[#B3B3B3] h-[17px]">
                <span className="text-black text-[13px] leading-3.5 font-sans font-medium">
                  Retry
                </span>
                <IconRetry size={10} className="text-black/50" />
              </div>
            )}
            {showAcknowledge && (
              <div className="shrink-0 flex items-center justify-center gap-1 px-[3px] py-px rounded-sm bg-white [border-width:0.5px] border-solid border-[#B3B3B3] h-[17px]">
                <span className="text-black text-[13px] leading-3.5 font-sans font-medium">
                  Ok
                </span>
              </div>
            )}
          </div>
        </BottomSection>
      )}
    </div>
  );
};
