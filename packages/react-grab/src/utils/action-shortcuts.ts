import type { ContextMenuAction } from "../types.js";

interface FindShortcutActionOptions {
  activeAction?: ContextMenuAction | null;
  includeModifierShortcuts?: boolean;
}

const isEnterShortcut = (event: KeyboardEvent): boolean => event.key === "Enter";

const hasCommandModifier = (event: KeyboardEvent): boolean => event.metaKey || event.ctrlKey;

export const findShortcutAction = (
  actions: readonly ContextMenuAction[],
  event: KeyboardEvent,
  options: FindShortcutActionOptions = {},
): ContextMenuAction | null => {
  if (!event.key) return null;

  if (isEnterShortcut(event)) {
    return options.activeAction ?? actions.find((action) => action.shortcut === "Enter") ?? null;
  }

  if (event.repeat) return null;

  const normalizedShortcutKey = event.key.toLowerCase();
  if (!hasCommandModifier(event)) {
    return (
      actions.find(
        (action) =>
          action.shortcut !== undefined &&
          action.shortcutModifier === false &&
          normalizedShortcutKey === action.shortcut.toLowerCase(),
      ) ?? null
    );
  }

  if (options.includeModifierShortcuts !== true) return null;

  return (
    actions.find(
      (action) =>
        action.shortcut !== undefined &&
        action.shortcut !== "Enter" &&
        action.shortcutModifier !== false &&
        normalizedShortcutKey === action.shortcut.toLowerCase(),
    ) ?? null
  );
};
