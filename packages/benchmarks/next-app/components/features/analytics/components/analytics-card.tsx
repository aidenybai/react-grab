"use client";
import React from "react";

interface AnalyticsCardProps {
  title: string;
  value: string;
  change?: string;
  period?: string;
}

export const AnalyticsCard = ({
  title,
  value,
  change,
  period = "vs last month",
}: AnalyticsCardProps) => (
  <div
    style={{
      padding: "20px",
      border: "1px solid #e5e7eb",
      borderRadius: "8px",
      background: "#fff",
    }}
  >
    <p style={{ fontSize: "13px", color: "#6b7280", margin: "0 0 8px 0" }}>
      {title}
    </p>
    <p style={{ fontSize: "28px", fontWeight: 700, margin: "0 0 4px 0" }}>
      {value}
    </p>
    {change && (
      <p
        style={{
          fontSize: "12px",
          color: change.startsWith("+") ? "#10b981" : "#ef4444",
          margin: 0,
        }}
      >
        {change} <span style={{ color: "#9ca3af" }}>{period}</span>
      </p>
    )}
  </div>
);
