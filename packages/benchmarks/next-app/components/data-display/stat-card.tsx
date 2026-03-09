"use client";

import React from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  previousValue?: string | number;
  icon?: React.ReactNode;
  format?: "number" | "currency" | "percentage";
  loading?: boolean;
}

export function StatCard({
  label,
  value,
  previousValue,
  icon,
  format,
  loading = false,
}: StatCardProps) {
  const formatValue = (v: string | number) => {
    if (typeof v === "string") return v;
    switch (format) {
      case "currency":
        return `$${v.toLocaleString()}`;
      case "percentage":
        return `${v}%`;
      default:
        return v.toLocaleString();
    }
  };

  const change =
    previousValue !== undefined &&
    typeof value === "number" &&
    typeof previousValue === "number"
      ? (((value - previousValue) / previousValue) * 100).toFixed(1)
      : null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
          {label}
        </span>
        {icon && <span className="text-gray-400">{icon}</span>}
      </div>
      {loading ? (
        <div className="mt-2 h-8 w-24 animate-pulse rounded bg-gray-200" />
      ) : (
        <div className="mt-2">
          <span className="text-2xl font-bold text-gray-900">
            {formatValue(value)}
          </span>
          {change && (
            <span
              className={`ml-2 text-xs font-medium ${Number(change) >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {Number(change) >= 0 ? "+" : ""}
              {change}%
            </span>
          )}
        </div>
      )}
    </div>
  );
}
