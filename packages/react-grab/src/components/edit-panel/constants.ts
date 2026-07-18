export const EDIT_LABEL_CLASS = "text-[13px] leading-4 font-medium";
export const EDIT_VALUE_CLASS = "text-[12px] leading-4 font-medium tabular-nums";

export const HIDDEN_FOCUS_PRESERVING_STYLE = {
  position: "absolute" as const,
  opacity: 0,
  "pointer-events": "none" as const,
  width: "0",
  height: "0",
  margin: "0",
  padding: "0",
  overflow: "hidden" as const,
};
