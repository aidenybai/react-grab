"use client";

import { useEffect, useState } from "react";

const PORTAL_ROOT_ID = "portal-root";

export function getPortalRoot(): HTMLElement {
  let root = document.getElementById(PORTAL_ROOT_ID);
  if (!root) {
    root = document.createElement("div");
    root.id = PORTAL_ROOT_ID;
    root.setAttribute("aria-hidden", "true");
    document.body.appendChild(root);
  }
  return root;
}

export function createPortalContainer(id: string): HTMLElement {
  const root = getPortalRoot();
  let container = document.getElementById(id);
  if (!container) {
    container = document.createElement("div");
    container.id = id;
    root.appendChild(container);
  }
  return container;
}

export function removePortalContainer(id: string): void {
  const container = document.getElementById(id);
  container?.remove();
}

export function usePortalContainer(id: string): HTMLElement | null {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const el = createPortalContainer(id);
    setContainer(el);
    return () => removePortalContainer(id);
  }, [id]);

  return container;
}

export const PORTAL_Z_INDEX = {
  dropdown: 100,
  modal: 200,
  popover: 150,
  tooltip: 300,
  toast: 400,
  overlay: 50,
} as const;
