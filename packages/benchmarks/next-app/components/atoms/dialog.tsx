"use client";

import React, { useEffect, useRef } from "react";

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  width?: number;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Dialog({
  isOpen,
  onClose,
  title,
  width = 480,
  children,
  footer,
}: DialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      onClick={(e) => e.target === overlayRef.current && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.4)",
      }}
    >
      <div
        style={{
          width,
          maxHeight: "85vh",
          backgroundColor: "#fff",
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
        }}
      >
        {title && (
          <div
            style={{ padding: "16px 20px", borderBottom: "1px solid #E5E7EB" }}
          >
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
              {title}
            </h3>
          </div>
        )}
        <div style={{ padding: 20, overflowY: "auto" }}>{children}</div>
        {footer && (
          <div
            style={{
              padding: "12px 20px",
              borderTop: "1px solid #E5E7EB",
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
