import { MOUNT_ROOT_RECHECK_DELAY_MS, Z_INDEX_OVERLAY } from "../constants.js";
import { detectCspNonce } from "./detect-csp-nonce.js";
import { hideFromThirdParties } from "./hide-from-third-parties.js";

const ATTRIBUTE_NAME = "data-react-grab";

const FONT_IMPORT =
  '@import url("https://fonts.googleapis.com/css2?family=Geist:wght@500&display=swap");';

export const mountRoot = (cssText?: string) => {
  const getMountTarget = (): HTMLElement => document.body ?? document.documentElement;

  const pruneAndGetMountedRoot = (activeHost?: HTMLElement): HTMLDivElement | null => {
    let existingRoot: HTMLDivElement | null = null;
    const mountedHosts = document.querySelectorAll<HTMLElement>(`[${ATTRIBUTE_NAME}]`);
    for (const mountedHost of mountedHosts) {
      if (mountedHost === activeHost) continue;
      const mountedRoot = mountedHost.shadowRoot?.querySelector(`[${ATTRIBUTE_NAME}]`);
      if (mountedRoot instanceof HTMLDivElement && !existingRoot) {
        existingRoot = mountedRoot;
        continue;
      }
      mountedHost.remove();
    }
    return existingRoot;
  };

  const mountedRoot = pruneAndGetMountedRoot();
  if (mountedRoot) return mountedRoot;

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

  const ensureHostMounted = () => {
    pruneAndGetMountedRoot(host);
    const mountTarget = getMountTarget();
    if (host.parentNode === mountTarget && host.isConnected) return;
    mountTarget.appendChild(host);
  };

  ensureHostMounted();

  const delayedRecheckTimeoutId = setTimeout(() => {
    ensureHostMounted();
  }, MOUNT_ROOT_RECHECK_DELAY_MS);

  let observedBody: HTMLElement | null = null;
  const bodyObserver = new MutationObserver(() => {
    ensureHostMounted();
  });

  const attachBodyObserver = () => {
    const currentBody = document.body;
    if (currentBody === observedBody) return;
    bodyObserver.disconnect();
    observedBody = currentBody;
    if (currentBody) bodyObserver.observe(currentBody, { childList: true });
  };

  const rootObserver = new MutationObserver(() => {
    attachBodyObserver();
    ensureHostMounted();
  });

  rootObserver.observe(document.documentElement, { childList: true });
  attachBodyObserver();

  window.addEventListener(
    "beforeunload",
    () => {
      clearTimeout(delayedRecheckTimeoutId);
      rootObserver.disconnect();
      bodyObserver.disconnect();
    },
    { once: true },
  );

  return root;
};
