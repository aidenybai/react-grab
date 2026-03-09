"use client";

import React from "react";

interface DashboardCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  className?: string;
}

export function DashboardCard({
  title,
  value,
  description,
  icon,
  trend = "neutral",
  trendValue,
  className,
}: DashboardCardProps) {
  const trendColors = {
    up: "text-green-600",
    down: "text-red-600",
    neutral: "text-gray-500",
  };

  const trendIcons = {
    up: "\u2191",
    down: "\u2193",
    neutral: "\u2192",
  };

  return (
    <div
      className={`rounded-xl border bg-white p-6 shadow-sm ${className ?? ""}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>
      <div className="mt-2">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {description && (
          <p className="mt-1 text-xs text-gray-500">{description}</p>
        )}
      </div>
      {trendValue && (
        <div className={`mt-3 flex items-center text-xs ${trendColors[trend]}`}>
          <span className="mr-1">{trendIcons[trend]}</span>
          <span>{trendValue}</span>
        </div>
      )}
    </div>
  );
}

export default DashboardCard;
