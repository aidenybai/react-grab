"use client";

import React, { useEffect } from "react";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  side?: "left" | "right" | "top" | "bottom";
  size?: number | string;
  title?: string;
  children: React.ReactNode;
  overlay?: boolean;
}

export function Drawer({
  open,
  onClose,
  side = "right",
  size = 360,
  title,
  children,
  overlay = true,
}: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const isHorizontal = side === "left" || side === "right";
  const sizeValue = typeof size === "number" ? `${size}px` : size;

  const panelStyles: React.CSSProperties = {
    position: "fixed",
    zIndex: 51,
    backgroundColor: "#FFFFFF",
    boxShadow: "-4px 0 20px rgba(0,0,0,0.1)",
    display: "flex",
    flexDirection: "column",
    transition: "transform 300ms ease",
    ...(side === "right"
      ? {
          top: 0,
          right: 0,
          bottom: 0,
          width: sizeValue,
          transform: open ? "translateX(0)" : "translateX(100%)",
        }
      : {}),
    ...(side === "left"
      ? {
          top: 0,
          left: 0,
          bottom: 0,
          width: sizeValue,
          transform: open ? "translateX(0)" : "translateX(-100%)",
        }
      : {}),
    ...(side === "bottom"
      ? {
          bottom: 0,
          left: 0,
          right: 0,
          height: sizeValue,
          transform: open ? "translateY(0)" : "translateY(100%)",
        }
      : {}),
    ...(side === "top"
      ? {
          top: 0,
          left: 0,
          right: 0,
          height: sizeValue,
          transform: open ? "translateY(0)" : "translateY(-100%)",
        }
      : {}),
  };

  return (
    <>
      {overlay && open && (
        <div
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            backgroundColor: "rgba(0,0,0,0.4)",
            transition: "opacity 300ms",
          }}
        />
      )}
      <div style={panelStyles}>
        {title && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              borderBottom: "1px solid #E5E7EB",
            }}
          >
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
              {title}
            </h3>
            <button
              onClick={onClose}
              style={{
                border: "none",
                background: "none",
                fontSize: 20,
                color: "#9CA3AF",
                cursor: "pointer",
              }}
            >
              &times;
            </button>
          </div>
        )}
        <div style={{ flex: 1, overflow: "auto", padding: 20 }}>{children}</div>
      </div>
    </>
  );
}
