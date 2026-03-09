"use client";
import React from "react";

interface WidgetConfig {
  title: string;
  icon: string;
  testId: string;
}

export const createWidget = (config: WidgetConfig) => {
  const Widget = ({ value, trend }: { value: string; trend: string }) => (
    <div
      data-testid={config.testId}
      style={{
        padding: "16px",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
      }}
    >
      <span>{config.icon}</span>
      <h3 style={{ fontSize: "14px", color: "#6b7280" }}>{config.title}</h3>
      <p style={{ fontSize: "24px", fontWeight: "bold" }}>{value}</p>
      <span
        style={{
          fontSize: "12px",
          color: trend.startsWith("+") ? "#10b981" : "#ef4444",
        }}
      >
        {trend}
      </span>
    </div>
  );
  Widget.displayName = `Widget(${config.title})`;
  return Widget;
};
