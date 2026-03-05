import type React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { cn } from "../../utils/cn";
import { PANEL_STYLES } from "../../constants";
import { IconLoader } from "../icons/IconLoader";
import { IconSubmit } from "../icons/IconSubmit";
import { IconReply } from "../icons/IconReply";
import { Arrow } from "./Arrow";
import { TagBadge } from "./TagBadge";
import { BottomSection } from "./BottomSection";
import { CompletionView } from "./CompletionView";
import { DiscardPrompt } from "./DiscardPrompt";
import { ErrorView } from "./ErrorView";

export type SelectionLabelStatus =
  | "idle"
  | "copying"
  | "copied"
  | "fading"
  | "error";

interface SelectionLabelProps {
  /** Absolute x position (center anchor) */
  x: number;
  /** Absolute y position (top anchor) */
  y: number;
  tagName: string;
  componentName?: string;
  status: SelectionLabelStatus;
  statusText?: string;
  /** Show in prompt/comment mode */
  isPromptMode?: boolean;
  inputValue?: string;
  replyToPrompt?: string;
  /** Show pending dismiss (discard prompt) */
  isPendingDismiss?: boolean;
  /** Show pending abort (discard prompt during copy) */
  isPendingAbort?: boolean;
  error?: string;
  /** Show arrow pointing to element */
  hideArrow?: boolean;
  arrowPosition?: "bottom" | "top";
  /** Has agent features (undo, follow-up, etc.) */
  hasAgent?: boolean;
  supportsUndo?: boolean;
  supportsFollowUp?: boolean;
  dismissButtonText?: string;
  previousPrompt?: string;
  /** Shimmer effect start frame (for "Grabbing..." text) */
  shimmerStartFrame?: number;
  /** Opacity override (for fading out) */
  opacity?: number;
}

export const SelectionLabel: React.FC<SelectionLabelProps> = ({
  x,
  y,
  tagName,
  componentName,
  status,
  statusText,
  isPromptMode,
  inputValue,
  replyToPrompt,
  isPendingDismiss,
  isPendingAbort,
  error,
  hideArrow,
  arrowPosition = "bottom",
  hasAgent,
  supportsUndo,
  supportsFollowUp,
  dismissButtonText,
  previousPrompt,
  shimmerStartFrame = 0,
  opacity: opacityOverride,
}) => {
  const frame = useCurrentFrame();

  const isCompletedStatus = status === "copied" || status === "fading";
  const canInteract =
    status !== "copying" &&
    status !== "copied" &&
    status !== "fading" &&
    status !== "error";

  // Compute opacity
  const resolvedOpacity = opacityOverride ?? (status === "fading" ? 0 : 1);

  // Shimmer background-position for "Grabbing..." text
  const shimmerOffset = interpolate(
    frame - shimmerStartFrame,
    [0, 40],
    [0, 200],
    { extrapolateRight: "extend" },
  );

  return (
    <div
      style={{
        position: "absolute",
        top: y,
        left: x,
        transform: "translateX(-50%)",
        opacity: resolvedOpacity,
        filter: "drop-shadow(0px 1px 2px #51515140)",
        zIndex: 2147483647,
      }}
      className="font-sans text-[13px] antialiased select-none"
    >
      {!hideArrow && (
        <Arrow
          position={arrowPosition}
          leftPercent={50}
          leftOffsetPx={0}
        />
      )}

      {/* Completed state */}
      {isCompletedStatus && !error && (
        <CompletionView
          statusText={hasAgent ? (statusText ?? "Completed") : "Copied"}
          showCompleted={status === "copied"}
          supportsUndo={supportsUndo}
          supportsFollowUp={supportsFollowUp}
          dismissButtonText={dismissButtonText}
          previousPrompt={previousPrompt}
          showDismiss
          showUndo={supportsUndo}
        />
      )}

      {/* Main panel (hidden when completed) */}
      <div
        className={cn(
          "flex items-center gap-[5px] rounded-[10px] antialiased w-fit h-fit p-0",
          PANEL_STYLES,
        )}
        style={{
          display: isCompletedStatus && !error ? "none" : undefined,
        }}
      >
        {/* Copying state */}
        {status === "copying" && !isPendingAbort && (
          <div
            className={cn(
              "shrink-0 flex flex-col justify-center items-start w-fit h-fit max-w-[280px]",
              hasAgent && inputValue && "min-w-[150px]",
            )}
          >
            <div className="shrink-0 flex items-center gap-1 py-1.5 px-2 w-full h-fit">
              <IconLoader size={13} className="text-[#71717a] shrink-0" />
              <span
                className="text-[13px] leading-4 font-sans font-medium h-fit tabular-nums overflow-hidden text-ellipsis whitespace-nowrap"
                style={{
                  backgroundImage:
                    "linear-gradient(90deg, #000 0%, #000 40%, #999 50%, #000 60%, #000 100%)",
                  backgroundSize: "200% 100%",
                  backgroundPosition: `${shimmerOffset}% 0`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {statusText ?? "Grabbing\u2026"}
              </span>
            </div>
            {hasAgent && inputValue && (
              <BottomSection>
                <div className="shrink-0 flex justify-between items-end w-full min-h-4">
                  <div
                    className="text-black text-[13px] leading-4 font-medium bg-transparent flex-1 p-0 m-0 opacity-50"
                    style={{
                      minHeight: "16px",
                      maxHeight: "95px",
                    }}
                  >
                    {inputValue}
                  </div>
                </div>
              </BottomSection>
            )}
          </div>
        )}

        {/* Pending abort */}
        {status === "copying" && isPendingAbort && <DiscardPrompt />}

        {/* Idle state (no prompt) */}
        {canInteract && !isPromptMode && (
          <div className="shrink-0 flex flex-col items-start w-fit h-fit">
            <div className="shrink-0 flex items-center gap-1 w-fit h-fit px-2 py-1.5">
              <TagBadge
                tagName={tagName}
                componentName={componentName}
                shrink
              />
            </div>
          </div>
        )}

        {/* Prompt mode */}
        {canInteract && isPromptMode && !isPendingDismiss && (
          <div className="shrink-0 flex flex-col justify-center items-start w-fit h-fit min-w-[150px] max-w-[280px]">
            <div className="shrink-0 flex items-center gap-1 pt-1.5 pb-1 w-fit h-fit px-2 max-w-full">
              <TagBadge
                tagName={tagName}
                componentName={componentName}
              />
            </div>
            <BottomSection>
              {replyToPrompt && (
                <div className="flex items-center gap-1 w-full mb-1 overflow-hidden">
                  <IconReply size={10} className="text-black/30 shrink-0" />
                  <span className="text-black/40 text-[11px] leading-3 font-medium truncate italic">
                    {replyToPrompt}
                  </span>
                </div>
              )}
              <div
                className="shrink-0 flex justify-between items-end w-full min-h-4"
                style={{ paddingLeft: replyToPrompt ? "14px" : "0" }}
              >
                <div
                  className="text-black text-[13px] leading-4 font-medium bg-transparent flex-1 p-0 m-0"
                  style={{
                    minHeight: "16px",
                    maxHeight: "95px",
                  }}
                >
                  {inputValue || (
                    <span className="text-black/40">Add context</span>
                  )}
                </div>
                <div className={cn(
                  "shrink-0 flex items-center justify-center size-4 rounded-full bg-black ml-1",
                  !(inputValue ?? "").trim() && "opacity-35",
                )}>
                  <IconSubmit size={10} className="text-white" />
                </div>
              </div>
            </BottomSection>
          </div>
        )}

        {/* Pending dismiss */}
        {isPendingDismiss && <DiscardPrompt />}

        {/* Error state */}
        {error && (
          <ErrorView error={error} showRetry showAcknowledge />
        )}
      </div>
    </div>
  );
};
