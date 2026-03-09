"use client";
import React from "react";

export const formatDate = (date: Date, locale = "en-US"): string => {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
};

export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

export const capitalize = (text: string): string => {
  return text.charAt(0).toUpperCase() + text.slice(1);
};

type StatusType = "online" | "offline" | "away" | "busy";

const statusColors: Record<StatusType, string> = {
  online: "#10b981",
  offline: "#6b7280",
  away: "#f59e0b",
  busy: "#ef4444",
};

export const StatusIndicator = ({
  status,
  label,
}: {
  status: StatusType;
  label?: string;
}) => (
  <div
    data-testid="util-status-indicator"
    style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
  >
    <span
      style={{
        width: "8px",
        height: "8px",
        borderRadius: "50%",
        background: statusColors[status],
        display: "inline-block",
      }}
    />
    {label && (
      <span style={{ fontSize: "13px", color: "#374151" }}>{label}</span>
    )}
  </div>
);

export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

export const debounce = <T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number,
) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};
