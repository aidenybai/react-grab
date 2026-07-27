import { escapeHtmlText } from "./escape-html-text.js";

export const escapeHtmlAttribute = (attributeValue: string): string =>
  escapeHtmlText(attributeValue)
    .replace(/"/g, "&quot;")
    .replace(/\r/g, "&#13;")
    .replace(/\n/g, "&#10;")
    .replace(/\t/g, "&#9;");
