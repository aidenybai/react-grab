import type { ContextMenuAction } from "react-grab/src/types.js";
import { noop } from "./noop.js";

export const createMenuActions = (openEnabled: boolean): ContextMenuAction[] => [
  { id: "copy", label: "Copy", shortcut: "C", onAction: noop },
  { id: "copy-details", label: "Copy details", onAction: noop },
  { id: "open", label: "Open", shortcut: "O", enabled: openEnabled, onAction: noop },
  { id: "comment", label: "Comment", shortcut: "Enter", onAction: noop },
];
