"use client";
import React from "react";

interface BookingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const BookingDialog = ({
  isOpen,
  onClose,
  title,
  children,
}: BookingDialogProps) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.4)",
        zIndex: 50,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "12px",
          padding: "24px",
          maxWidth: "500px",
          width: "100%",
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "16px",
          }}
        >
          <h2 style={{ fontSize: "18px", fontWeight: 600, margin: 0 }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "none",
              cursor: "pointer",
              fontSize: "18px",
            }}
          >
            x
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};
