"use client";

import React, { useEffect } from "react";

interface ModalProps {
  isVisible: boolean;
  onRequestClose: () => void;
  title: string;
  children: React.ReactNode;
  preventClose?: boolean;
  width?: number;
}

export function Modal({
  isVisible,
  onRequestClose,
  title,
  children,
  preventClose = false,
  width = 500,
}: ModalProps) {
  useEffect(() => {
    if (!isVisible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !preventClose) onRequestClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isVisible, onRequestClose, preventClose]);

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={preventClose ? undefined : onRequestClose}
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
        }}
      />
      <div
        style={{
          position: "relative",
          width,
          maxWidth: "95vw",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#FFFFFF",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid #F3F4F6",
          }}
        >
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{title}</h3>
          {!preventClose && (
            <button
              onClick={onRequestClose}
              style={{
                border: "none",
                background: "none",
                fontSize: 20,
                color: "#9CA3AF",
                cursor: "pointer",
                padding: 4,
              }}
            >
              &times;
            </button>
          )}
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: 20 }}>{children}</div>
      </div>
    </div>
  );
}
