"use client";

import React from "react";

interface SectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  bordered?: boolean;
  spacing?: "sm" | "md" | "lg";
  action?: React.ReactNode;
}

const spacingMap = { sm: 16, md: 24, lg: 40 };

export function Section({
  title,
  description,
  children,
  bordered = false,
  spacing = "md",
  action,
}: SectionProps) {
  return (
    <section
      style={{
        paddingTop: spacingMap[spacing],
        paddingBottom: spacingMap[spacing],
        borderBottom: bordered ? "1px solid #E5E7EB" : "none",
      }}
    >
      {(title || action) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <div>
            {title && (
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: "#111827",
                  margin: 0,
                }}
              >
                {title}
              </h2>
            )}
            {description && (
              <p style={{ fontSize: 14, color: "#6B7280", marginTop: 4 }}>
                {description}
              </p>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
