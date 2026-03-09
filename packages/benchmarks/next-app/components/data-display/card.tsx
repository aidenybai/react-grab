"use client";

import React from "react";

interface DataCardProps {
  title: string;
  subtitle?: string;
  value?: string | number;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  footer?: React.ReactNode;
  children?: React.ReactNode;
}

export function Card({
  title,
  subtitle,
  value,
  trend,
  trendValue,
  footer,
  children,
}: DataCardProps) {
  const trendColors = {
    up: "text-green-600",
    down: "text-red-600",
    neutral: "text-gray-500",
  };
  const trendArrows = { up: "\u2191", down: "\u2193", neutral: "\u2192" };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
          )}
        </div>
        {trend && trendValue && (
          <span
            className={`inline-flex items-center gap-0.5 text-xs font-medium ${trendColors[trend]}`}
          >
            {trendArrows[trend]} {trendValue}
          </span>
        )}
      </div>
      {value !== undefined && (
        <p className="mt-3 text-2xl font-bold text-gray-900">{value}</p>
      )}
      {children && <div className="mt-4">{children}</div>}
      {footer && (
        <div className="mt-4 pt-4 border-t border-gray-100">{footer}</div>
      )}
    </div>
  );
}
