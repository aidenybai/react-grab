"use client";

import React from "react";

interface AnalyticsCardProps {
  title: string;
  value: string | number;
  previousValue?: string | number;
  format?: "number" | "currency" | "percentage";
  icon?: React.ReactNode;
  sparkline?: number[];
  className?: string;
}

function formatValue(value: string | number, format: string): string {
  if (typeof value === "string") return value;
  switch (format) {
    case "currency":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(value);
    case "percentage":
      return `${value.toFixed(1)}%`;
    default:
      return new Intl.NumberFormat("en-US").format(value);
  }
}

function calculateChange(
  current: string | number,
  previous: string | number,
): number | null {
  const curr = typeof current === "string" ? parseFloat(current) : current;
  const prev = typeof previous === "string" ? parseFloat(previous) : previous;
  if (isNaN(curr) || isNaN(prev) || prev === 0) return null;
  return ((curr - prev) / prev) * 100;
}

export function AnalyticsCard({
  title,
  value,
  previousValue,
  format = "number",
  icon,
  sparkline,
  className,
}: AnalyticsCardProps) {
  const change =
    previousValue !== undefined ? calculateChange(value, previousValue) : null;

  return (
    <div
      className={`rounded-xl border bg-white p-5 shadow-sm ${className ?? ""}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
            {formatValue(value, format)}
          </p>
        </div>
        {icon && (
          <div className="rounded-lg bg-gray-50 p-2 text-gray-500">{icon}</div>
        )}
      </div>
      {change !== null && (
        <div className="mt-3 flex items-center gap-1.5">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              change >= 0
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {change >= 0 ? "\u2191" : "\u2193"} {Math.abs(change).toFixed(1)}%
          </span>
          <span className="text-xs text-gray-400">vs previous period</span>
        </div>
      )}
      {sparkline && sparkline.length > 0 && (
        <div className="mt-4 flex h-8 items-end gap-0.5">
          {sparkline.map((val, i) => {
            const max = Math.max(...sparkline);
            const height = max > 0 ? (val / max) * 100 : 0;
            return (
              <div
                key={i}
                className="flex-1 rounded-t bg-indigo-200"
                style={{ height: `${Math.max(height, 4)}%` }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AnalyticsCard;
