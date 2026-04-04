const SPECIAL_KEY_SYMBOLS: Record<string, string> = {
  Backspace: "⌫",
  Tab: "⇥",
  Enter: "↵",
  Space: "Space",
  ArrowUp: "↑",
  ArrowDown: "↓",
  ArrowLeft: "←",
  ArrowRight: "→",
  Delete: "Del",
  Comma: ",",
  Period: ".",
  Slash: "/",
  Backslash: "\\",
  BracketLeft: "[",
  BracketRight: "]",
  Semicolon: ";",
  Quote: "'",
  Backquote: "`",
  Minus: "-",
  Equal: "=",
};

export const getKeyFromCode = (code: string): string | null => {
  if (code.startsWith("Key")) return code.slice(3).toUpperCase();
  if (code.startsWith("Digit")) return code.slice(5);
  return SPECIAL_KEY_SYMBOLS[code] ?? null;
};
