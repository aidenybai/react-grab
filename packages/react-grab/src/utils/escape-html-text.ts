export const escapeHtmlText = (textContent: string): string =>
  textContent.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
