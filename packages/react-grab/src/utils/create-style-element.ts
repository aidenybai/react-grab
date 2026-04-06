import { detectCspNonce } from "./detect-csp-nonce.js";
import { hideFromThirdParties } from "./hide-from-third-parties.js";

export const createStyleElement = (attribute: string, content: string): HTMLStyleElement => {
  const element = document.createElement("style");
  element.setAttribute(attribute, "");
  const nonce = detectCspNonce();
  if (nonce) element.nonce = nonce;
  hideFromThirdParties(element);
  element.textContent = content;
  document.head.appendChild(element);
  return element;
};
