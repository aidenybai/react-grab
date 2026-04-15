import { MOUNT_ROOT_RECHECK_DELAY_MS, Z_INDEX_OVERLAY } from "../constants.js";
import { detectCspNonce } from "./detect-csp-nonce.js";
import { hideFromThirdParties } from "./hide-from-third-parties.js";

const ATTRIBUTE_NAME = "data-react-grab";

const FONT_IMPORT =
  '@import url("https://fonts.googleapis.com/css2?family=Geist:wght@500&display=swap");';

export const mountRoot = (cssText?: string) => {
  const getMountTarget = (): HTMLElement => {
    return document.body ?? document.documentElement;
  };

  const mountedHost = document.querySelector(`[${ATTRIBUTE_NAME}]`);
  if (mountedHost) {
    const mountedRoot = mountedHost.shadowRoot?.querySelector(`[${ATTRIBUTE_NAME}]`);
    if (mountedRoot instanceof HTMLDivElement && mountedHost.shadowRoot) {
      return mountedRoot;
    }
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

  const appendHostToMountTarget = () => {
    const mountTarget = getMountTarget();
    if (host.parentNode !== mountTarget || !host.isConnected) {
      mountTarget.appendChild(host);
    }
  };

  appendHostToMountTarget();

  // Re-appending after a delay handles two cases: framework hydration
  // (React/Next.js) may blow away the DOM and remove our host, and another
  // tool (e.g. react-scan) may have appended at the same z-index where last
  // DOM child wins the stacking tiebreaker. Moving an already-attached node
  // via appendChild is atomic with no flash or reflow.
  setTimeout(() => {
    appendHostToMountTarget();
  }, MOUNT_ROOT_RECHECK_DELAY_MS);

  return root;
};
