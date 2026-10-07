"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export const PortalFixture = () => {
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalRoot(document.getElementById("portal-root"));
  }, []);

  if (!portalRoot) return null;

  return createPortal(
    <button data-testid="portal-target" type="button">
      Portal target
    </button>,
    portalRoot,
  );
};
