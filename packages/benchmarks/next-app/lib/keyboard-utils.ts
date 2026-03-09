export interface KeyCombo {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
}

export function parseKeyCombo(shortcut: string): KeyCombo {
  const parts = shortcut
    .toLowerCase()
    .split("+")
    .map((s) => s.trim());
  return {
    key: parts[parts.length - 1],
    ctrl: parts.includes("ctrl"),
    shift: parts.includes("shift"),
    alt: parts.includes("alt"),
    meta: parts.includes("meta") || parts.includes("cmd"),
  };
}

export function matchesKeyCombo(
  event: KeyboardEvent,
  combo: KeyCombo,
): boolean {
  const key = event.key.toLowerCase();
  return (
    key === combo.key &&
    event.ctrlKey === (combo.ctrl ?? false) &&
    event.shiftKey === (combo.shift ?? false) &&
    event.altKey === (combo.alt ?? false) &&
    event.metaKey === (combo.meta ?? false)
  );
}

export function formatKeyCombo(combo: KeyCombo): string {
  const isMac =
    typeof navigator !== "undefined" && /Mac/.test(navigator.userAgent);
  const parts: string[] = [];

  if (combo.ctrl) parts.push(isMac ? "\u2303" : "Ctrl");
  if (combo.alt) parts.push(isMac ? "\u2325" : "Alt");
  if (combo.shift) parts.push(isMac ? "\u21E7" : "Shift");
  if (combo.meta) parts.push(isMac ? "\u2318" : "Win");
  parts.push(combo.key.toUpperCase());

  return parts.join(isMac ? "" : "+");
}

export const COMMON_SHORTCUTS = {
  save: { key: "s", meta: true },
  undo: { key: "z", meta: true },
  redo: { key: "z", meta: true, shift: true },
  search: { key: "k", meta: true },
  escape: { key: "escape" },
  delete: { key: "backspace", meta: true },
  selectAll: { key: "a", meta: true },
  copy: { key: "c", meta: true },
  paste: { key: "v", meta: true },
} as const satisfies Record<string, KeyCombo>;

export function isInputElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    target.isContentEditable
  );
}
