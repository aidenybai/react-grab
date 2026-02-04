import { MOUNT_ROOT_RECHECK_DELAY_MS } from "../constants.js";

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
  host.style.zIndex = "2147483646";
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

  // HACK:double check after a short delay since
  // something might have blown away the DOM
  setTimeout(() => {
    if (!doc.contains(host)) {
      doc.appendChild(host);
    }
  }, MOUNT_ROOT_RECHECK_DELAY_MS);

  return root;
};
