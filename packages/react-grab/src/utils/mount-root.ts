import { MOUNT_ROOT_RECHECK_DELAY_MS, Z_INDEX_OVERLAY } from "../constants.js";
import { detectCspNonce } from "./detect-csp-nonce.js";
import { hideFromThirdParties } from "./hide-from-third-parties.js";

const ATTRIBUTE_NAME = "data-react-grab";

const FONT_IMPORT =
  '@import url("https://fonts.googleapis.com/css2?family=Geist:wght@500&display=swap");';

// Mounting into <body> (not <html>) keeps React hydration happy: appending a
// <div> directly to <html> throws "In HTML, <div> cannot be a child of <html>"
// during hydration (see vercel/next.js#51242), which surfaces in Next.js's dev
// overlay when react-grab loads via <Script strategy="beforeInteractive" />.
const attachHostToBody = (host: HTMLElement): void => {
  if (!document.body) return;
  // If the app replaces or clones <body>, a shadowless clone of our host can
  // end up in the new body. Purge those so queries targeting the real host
  // (which owns the shadow DOM) aren't shadowed by the zombie.
  const candidateHosts = document.querySelectorAll<HTMLElement>(`[${ATTRIBUTE_NAME}]`);
  for (const candidate of candidateHosts) {
    if (candidate === host) continue;
    if (candidate.parentNode === host) continue;
    if (!candidate.shadowRoot) {
      candidate.remove();
    }
  }
  document.body.appendChild(host);
};

// During parsing (readyState === "loading") <body> may not exist yet, and
// attaching to <html> as a fallback is what triggers the hydration error
// above. Create the host detached and attach once <body> is parsed.
const scheduleHostAttachment = (host: HTMLElement): void => {
  if (document.body) {
    attachHostToBody(host);
    return;
  }

  const onReady = () => {
    document.removeEventListener("DOMContentLoaded", onReady);
    attachHostToBody(host);
  };
  document.addEventListener("DOMContentLoaded", onReady, { once: true });
};

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

  scheduleHostAttachment(host);
  // Re-appending after a delay handles two cases: framework hydration
  // (React/Next.js) may blow away the DOM and remove our host, and another
  // tool (e.g. react-scan) may have appended at the same z-index where last
  // DOM child wins the stacking tiebreaker. Moving an already-attached node
  // via appendChild is atomic with no flash or reflow.
  setTimeout(() => {
    attachHostToBody(host);
  }, MOUNT_ROOT_RECHECK_DELAY_MS);

  return root;
};
