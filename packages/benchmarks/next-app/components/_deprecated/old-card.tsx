"use client";

import React from "react";

interface OldCardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  withShadow?: boolean;
  withBorder?: boolean;
  rounded?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
  className?: string;
}

export function OldCard({
  title,
  subtitle,
  children,
  withShadow = true,
  withBorder = true,
  rounded = true,
  onClick,
  style,
  className,
}: OldCardProps) {
  const cardStyle: React.CSSProperties = {
    padding: "16px",
    backgroundColor: "#ffffff",
    border: withBorder ? "1px solid #e5e7eb" : "none",
    borderRadius: rounded ? "8px" : "0",
    boxShadow: withShadow ? "0 1px 3px rgba(0, 0, 0, 0.1)" : "none",
    cursor: onClick ? "pointer" : "default",
    ...style,
  };

  return (
    <div style={cardStyle} onClick={onClick} className={className}>
      {title && (
        <div style={{ marginBottom: "12px" }}>
          <h3
            style={{
              fontSize: "16px",
              fontWeight: 600,
              color: "#111827",
              margin: 0,
            }}
          >
            {title}
          </h3>
          {subtitle && (
            <p style={{ fontSize: "14px", color: "#6b7280", marginTop: "4px" }}>
              {subtitle}
            </p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

export default OldCard;
