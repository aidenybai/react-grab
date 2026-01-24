"use client";

import { useEffect, useRef, type ReactElement } from "react";

const DesignSystemPage = (): ReactElement => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let dispose: (() => void) | undefined;

    import("react-grab").then(({ renderDesignSystemPreview }) => {
      if (!containerRef.current) return;
      dispose = renderDesignSystemPreview(containerRef.current);
    });

    return () => {
      dispose?.();
    };
  }, []);

  return (
    <div className="min-h-screen">
      <div ref={containerRef} />
    </div>
  );
};

DesignSystemPage.displayName = "DesignSystemPage";

export default DesignSystemPage;
