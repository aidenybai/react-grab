export const ATTRIBUTE_NAME = "data-react-grab";

export const mountRoot = (cssText?: string) => {
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
  host.style.top = "0";
  host.style.left = "0";
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

  return root;
};
