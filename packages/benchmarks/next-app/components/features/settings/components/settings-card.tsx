"use client";
import React from "react";

interface SettingsCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export const SettingsCard = ({
  title,
  description,
  children,
}: SettingsCardProps) => (
  <div
    style={{
      padding: "20px",
      border: "1px solid #e5e7eb",
      borderRadius: "8px",
      marginBottom: "16px",
    }}
  >
    <h3 style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 4px 0" }}>
      {title}
    </h3>
    {description && (
      <p style={{ fontSize: "13px", color: "#6b7280", margin: "0 0 16px 0" }}>
        {description}
      </p>
    )}
    {children}
  </div>
);
