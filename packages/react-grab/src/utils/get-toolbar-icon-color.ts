import type { SelectionMode } from "../types.js";

export const getSelectIconColor = (mode: SelectionMode): string => {
  switch (mode) {
    case "select":
      return "text-black";
    case "comment":
      return "text-black/40";
    default:
      return "text-black/70";
  }
};

export const getCommentIconColor = (mode: SelectionMode): string => {
  switch (mode) {
    case "comment":
      return "text-black";
    case "select":
      return "text-black/40";
    default:
      return "text-black/70";
  }
};
