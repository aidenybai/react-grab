export const ATTRIBUTE_NAME = "data-react-grab";

const injectSonnerStyles = (shadowRoot: ShadowRoot) => {
  const existingStyle = shadowRoot.querySelector(
    'style[data-sonner-styles="true"]',
  );
  if (existingStyle) return;

  const sonnerStylesInHead = Array.from(
    document.head.querySelectorAll("style"),
  ).find((style) => style.textContent?.includes("[data-sonner-toaster]"));

  if (sonnerStylesInHead && sonnerStylesInHead.textContent) {
    const clonedStyle = document.createElement("style");
    clonedStyle.setAttribute("data-sonner-styles", "true");
    clonedStyle.textContent = sonnerStylesInHead.textContent;
    shadowRoot.appendChild(clonedStyle);
  }

  const customStyle = document.createElement("style");
  customStyle.setAttribute("data-sonner-custom-styles", "true");
  customStyle.textContent = `
    [data-sonner-toaster][data-theme="light"] [data-sonner-toast][data-type="error"] {
      --normal-bg: #fde7f7 !important;
      --normal-border: #f7c5ec !important;
      --normal-text: #b21c8e !important;
      --error-bg: #fde7f7 !important;
      --error-border: #f7c5ec !important;
      --error-text: #b21c8e !important;
    }
    [data-sonner-toast][data-styled="true"] {
      font-size: 12px !important;
      font-weight: 500 !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      font-variant-numeric: tabular-nums !important;
      padding: 4px 8px !important;
      width: 240px !important;
      max-width: 240px !important;
    }
    [data-sonner-toast] [data-button] {
      min-height: 26px !important;
      padding-left: 12px !important;
      padding-right: 12px !important;
      font-size: 11px !important;
      margin-left: 8px !important;
      cursor: pointer !important;
    }
    [data-sonner-toast] [data-title] {
      font-size: 12px !important;
      font-weight: 500 !important;
      line-height: 1.3 !important;
    }
    [data-sonner-toast] [data-description] {
      font-size: 11px !important;
      font-weight: 400 !important;
      opacity: 0.85 !important;
      line-height: 1.3 !important;
      margin-top: 2px !important;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace !important;
    }
    [data-sonner-toast] [data-content] {
      gap: 2px !important;
    }
    [data-sonner-toast] [data-icon] {
      display: none !important;
    }
  `;
  shadowRoot.appendChild(customStyle);
};

export const mountRoot = () => {
  const mountedHost = document.querySelector(`[${ATTRIBUTE_NAME}]`);
  if (mountedHost) {
    const mountedRoot = mountedHost.shadowRoot?.querySelector(
      `[${ATTRIBUTE_NAME}]`,
    );
    if (mountedRoot instanceof HTMLDivElement && mountedHost.shadowRoot) {
      injectSonnerStyles(mountedHost.shadowRoot);
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

  const root = document.createElement("div");

  root.setAttribute(ATTRIBUTE_NAME, "true");

  shadowRoot.appendChild(root);

  const doc = document.body ?? document.documentElement;
  doc.appendChild(host);

  injectSonnerStyles(shadowRoot);

  return root;
};
