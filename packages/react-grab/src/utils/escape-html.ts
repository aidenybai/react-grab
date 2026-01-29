const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
};

export const escapeHtml = (text: string): string => {
  return text.replace(/[&<>]/g, (char) => HTML_ESCAPE_MAP[char]);
};
