import { detectCspNonce } from "./detect-csp-nonce.js";
import { hideFromThirdParties } from "./hide-from-third-parties.js";

export const createStyleElement = (
  attribute: string,
  content: string,
  targetDocument: Document = document,
): HTMLStyleElement => {
  const element = targetDocument.createElement("style");
  element.setAttribute(attribute, "");
  const nonce = detectCspNonce(targetDocument);
  if (nonce) element.nonce = nonce;
  hideFromThirdParties(element);
  element.textContent = content;
  targetDocument.head.appendChild(element);
  return element;
};
