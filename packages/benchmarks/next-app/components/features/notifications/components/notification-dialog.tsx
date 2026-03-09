"use client";
import React from "react";

interface NotificationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: { id: string; title: string; message: string }[];
  onClearAll?: () => void;
}

export const NotificationDialog = ({
  isOpen,
  onClose,
  notifications,
  onClearAll,
}: NotificationDialogProps) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: "100%",
        right: 0,
        width: "360px",
        maxHeight: "400px",
        overflowY: "auto",
        background: "#fff",
        borderRadius: "8px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
        border: "1px solid #e5e7eb",
        zIndex: 40,
      }}
    >
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h3 style={{ fontSize: "14px", fontWeight: 600, margin: 0 }}>
          Notifications
        </h3>
        <div style={{ display: "flex", gap: "8px" }}>
          {onClearAll && (
            <button
              onClick={onClearAll}
              style={{
                fontSize: "12px",
                color: "#6b7280",
                border: "none",
                background: "none",
                cursor: "pointer",
              }}
            >
              Clear all
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              fontSize: "16px",
              border: "none",
              background: "none",
              cursor: "pointer",
              color: "#9ca3af",
            }}
          >
            x
          </button>
        </div>
      </div>
      {notifications.length === 0 ? (
        <p
          style={{
            padding: "24px",
            textAlign: "center",
            color: "#9ca3af",
            fontSize: "13px",
          }}
        >
          No notifications
        </p>
      ) : (
        notifications.map((n) => (
          <div
            key={n.id}
            style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6" }}
          >
            <p style={{ fontSize: "13px", fontWeight: 500, margin: "0 0 2px" }}>
              {n.title}
            </p>
            <p style={{ fontSize: "12px", color: "#6b7280", margin: 0 }}>
              {n.message}
            </p>
          </div>
        ))
      )}
    </div>
  );
};
