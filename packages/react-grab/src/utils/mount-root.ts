import { MOUNT_ROOT_RECHECK_DELAY_MS, Z_INDEX_OVERLAY } from "../constants.js";

const ATTRIBUTE_NAME = "data-react-grab";

const FONT_LINK_ID = "react-grab-fonts";
const FONT_LINK_URL = "https://fonts.googleapis.com/css2?family=Geist:wght@500&display=swap";

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
    const mountedRoot = mountedHost.shadowRoot?.querySelector(`[${ATTRIBUTE_NAME}]`);
    if (mountedRoot instanceof HTMLDivElement && mountedHost.shadowRoot) {
      return mountedRoot;
    }
  }

  const host = document.createElement("div");

  host.setAttribute(ATTRIBUTE_NAME, "true");
  host.style.zIndex = String(Z_INDEX_OVERLAY);
  host.style.position = "fixed";
  host.style.inset = "0";
  // The host covers the entire viewport, so pointer-events:none prevents it
  // from intercepting page clicks. Child UI elements opt in individually.
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
  doc.appendChild(host);

  // Re-appending after a delay handles two cases: framework hydration
  // (React/Next.js) may blow away the DOM and remove our host, and another
  // tool (e.g. react-scan) may have appended at the same z-index where last
  // DOM child wins the stacking tiebreaker. Moving an already-attached node
  // via appendChild is atomic with no flash or reflow.
  setTimeout(() => {
    doc.appendChild(host);
  }, MOUNT_ROOT_RECHECK_DELAY_MS);

  return root;
};
