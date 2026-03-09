"use client";
import React from "react";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export const ChartCard = ({
  title,
  subtitle,
  children,
  actions,
}: ChartCardProps) => (
  <div
    style={{
      border: "1px solid #e5e7eb",
      borderRadius: "8px",
      background: "#fff",
      overflow: "hidden",
    }}
  >
    <div
      style={{
        padding: "16px 20px",
        borderBottom: "1px solid #f3f4f6",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div>
        <h3 style={{ fontSize: "14px", fontWeight: 600, margin: 0 }}>
          {title}
        </h3>
        {subtitle && (
          <p style={{ fontSize: "12px", color: "#9ca3af", margin: "2px 0 0" }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div>{actions}</div>}
    </div>
    <div style={{ padding: "20px" }}>{children}</div>
  </div>
);
