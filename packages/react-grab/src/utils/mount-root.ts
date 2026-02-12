import { MOUNT_ROOT_RECHECK_DELAY_MS, Z_INDEX_HOST } from "../constants.js";

export const ATTRIBUTE_NAME = "data-react-grab";

const FONT_LINK_ID = "react-grab-fonts";
const FONT_LINK_URL =
  "https://fonts.googleapis.com/css2?family=Geist:wght@500&display=swap";

const loadFonts = () => {
  if (document.getElementById(FONT_LINK_ID)) return;

  if (!document.head) return;

  const link = document.createElement("link");
  link.id = FONT_LINK_ID;
  link.rel = "stylesheet";
  link.href = FONT_LINK_URL;
  document.head.appendChild(link);
};

export const mountRoot = (cssText?: string) => {
  loadFonts();

  const mountedHost = document.querySelector(`[${ATTRIBUTE_NAME}]`);
  if (mountedHost) {
    const mountedRoot = mountedHost.shadowRoot?.querySelector(
      `[${ATTRIBUTE_NAME}]`,
    );
    if (mountedRoot instanceof HTMLDivElement && mountedHost.shadowRoot) {
      return mountedRoot;
    }
  }

  const host = document.createElement("div");

  host.setAttribute(ATTRIBUTE_NAME, "true");
  host.style.zIndex = String(Z_INDEX_HOST);
  host.style.position = "fixed";
  host.style.inset = "0";
  host.style.pointerEvents = "none";
  const shadowRoot = host.attachShadow({ mode: "open" });

  if (cssText) {
    const styleElement = document.createElement("style");
    styleElement.textContent = cssText;
    shadowRoot.appendChild(styleElement);
  }

  const root = document.createElement("div");

  root.setAttribute(ATTRIBUTE_NAME, "true");

  shadowRoot.appendChild(root);

  const doc = document.body ?? document.documentElement;
  // HACK: wait for hydration (in case something blows away the DOM)
  doc.appendChild(host);

  // HACK: re-append after a delay to ensure we're the last child of body.
  // This handles two cases:
  //   1. Hydration blew away the DOM and the host was removed
  //   2. Another tool (e.g. react-scan) appended at the same max z-index —
  //      being last in DOM order wins the stacking tiebreaker
  // appendChild of an existing node is an atomic move (no flash, no reflow).
  setTimeout(() => {
    doc.appendChild(host);
  }, MOUNT_ROOT_RECHECK_DELAY_MS);

  return root;
};
