import type { ContextMenuAction } from "@react-grab-source/types.js";
import { noop } from "./noop.js";

export const createMenuActions = (openEnabled: boolean): ContextMenuAction[] => [
  { id: "copy", label: "Copy", shortcut: "C", onAction: noop },
  { id: "open", label: "Open", shortcut: "O", enabled: openEnabled, onAction: noop },
  { id: "comment", label: "Comment", shortcut: "Enter", onAction: noop },
];
