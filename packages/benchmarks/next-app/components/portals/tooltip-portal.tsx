"use client";
import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

export function TooltipPortal({
  children,
  content,
  "data-testid": testId,
}: {
  children: React.ReactNode;
  content: string;
  "data-testid"?: string;
}) {
  const [show, setShow] = useState(false);
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => setMounted(true), []);

  const handleMouseEnter = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({ top: rect.top - 30, left: rect.left + rect.width / 2 });
    }
    setShow(true);
  };

  return (
    <>
      <div
        ref={ref}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setShow(false)}
        style={{ display: "inline-block" }}
      >
        {children}
      </div>
      {mounted &&
        show &&
        createPortal(
          <div
            data-testid={testId}
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              transform: "translateX(-50%)",
              background: "var(--primary)",
              color: "var(--primary-foreground)",
              padding: "4px 8px",
              borderRadius: 4,
              fontSize: 12,
              zIndex: 300,
              pointerEvents: "none",
            }}
          >
            {content}
          </div>,
          document.body,
        )}
    </>
  );
}
