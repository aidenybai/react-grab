import { MOUNT_ROOT_RECHECK_DELAY_MS, Z_INDEX_OVERLAY } from "../constants.js";
import { detectCspNonce } from "./detect-csp-nonce.js";
import { hideFromThirdParties } from "./hide-from-third-parties.js";

const ATTRIBUTE_NAME = "data-react-grab";

const FONT_IMPORT =
  '@import url("https://fonts.googleapis.com/css2?family=Geist:wght@500&display=swap");';

export const mountRoot = (cssText?: string) => {
  const mountedHosts = document.querySelectorAll<HTMLElement>(`[${ATTRIBUTE_NAME}]`);
  for (const mountedHost of mountedHosts) {
    const mountedRoot = mountedHost.shadowRoot?.querySelector(`[${ATTRIBUTE_NAME}]`);
    if (mountedRoot instanceof HTMLDivElement) return mountedRoot;
    mountedHost.remove();
  }

  const host = document.createElement("div");

  host.setAttribute(ATTRIBUTE_NAME, "true");
  hideFromThirdParties(host);
  host.style.zIndex = String(Z_INDEX_OVERLAY);
  host.style.position = "fixed";
  host.style.inset = "0";
  host.style.pointerEvents = "none";
  host.style.contain = "strict";
  const shadowRoot = host.attachShadow({ mode: "open" });

  const styleElement = document.createElement("style");
  const nonce = detectCspNonce();
  if (nonce) styleElement.nonce = nonce;
  styleElement.textContent = `${FONT_IMPORT}\n${cssText ?? ""}`;
  shadowRoot.appendChild(styleElement);

  const root = document.createElement("div");

  root.setAttribute(ATTRIBUTE_NAME, "true");

  shadowRoot.appendChild(root);

  const mountTarget = document.documentElement;
  mountTarget.appendChild(host);
  setTimeout(() => {
    mountTarget.appendChild(host);
  }, MOUNT_ROOT_RECHECK_DELAY_MS);

  return root;
};
