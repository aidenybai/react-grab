"use client";

import React, { useMemo } from "react";

interface DataPoint {
  label: string;
  value: number;
  color?: string;
}

interface AnalyticsChartProps {
  data: DataPoint[];
  type?: "bar" | "horizontal-bar";
  title?: string;
  height?: number;
  showValues?: boolean;
  showLabels?: boolean;
  maxBarWidth?: number;
  className?: string;
}

export function AnalyticsChart({
  data,
  type = "bar",
  title,
  height = 200,
  showValues = true,
  showLabels = true,
  maxBarWidth = 48,
  className,
}: AnalyticsChartProps) {
  const maxValue = useMemo(
    () => Math.max(...data.map((d) => d.value), 1),
    [data],
  );

  if (type === "horizontal-bar") {
    return (
      <div className={`rounded-lg border bg-white p-4 ${className ?? ""}`}>
        {title && (
          <h3 className="mb-4 text-sm font-semibold text-gray-900">{title}</h3>
        )}
        <div className="space-y-3">
          {data.map((point, index) => (
            <div key={index}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium text-gray-600">{point.label}</span>
                {showValues && (
                  <span className="text-gray-500">
                    {point.value.toLocaleString()}
                  </span>
                )}
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(point.value / maxValue) * 100}%`,
                    backgroundColor: point.color || "#6366f1",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border bg-white p-4 ${className ?? ""}`}>
      {title && (
        <h3 className="mb-4 text-sm font-semibold text-gray-900">{title}</h3>
      )}
      <div className="flex items-end justify-between gap-1" style={{ height }}>
        {data.map((point, index) => {
          const barHeight = (point.value / maxValue) * 100;
          return (
            <div
              key={index}
              className="flex flex-1 flex-col items-center gap-1"
            >
              {showValues && (
                <span className="text-[10px] font-medium text-gray-500">
                  {point.value >= 1000
                    ? `${(point.value / 1000).toFixed(1)}k`
                    : point.value}
                </span>
              )}
              <div
                className="w-full rounded-t transition-all duration-300 hover:opacity-80"
                style={{
                  height: `${Math.max(barHeight, 2)}%`,
                  maxWidth: maxBarWidth,
                  backgroundColor: point.color || "#6366f1",
                }}
              />
              {showLabels && (
                <span
                  className="mt-1 truncate text-[10px] text-gray-400"
                  style={{ maxWidth: maxBarWidth }}
                >
                  {point.label}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AnalyticsChart;
