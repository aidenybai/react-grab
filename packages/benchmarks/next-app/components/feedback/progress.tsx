"use client";

import React from "react";

interface ProgressProps {
  value: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  color?: "blue" | "green" | "red" | "purple" | "amber";
  showLabel?: boolean;
  label?: string;
  striped?: boolean;
}

export function Progress({
  value,
  max = 100,
  size = "md",
  color = "blue",
  showLabel = false,
  label,
  striped = false,
}: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const heightClasses = { sm: "h-1.5", md: "h-2.5", lg: "h-4" };
  const colorClasses = {
    blue: "bg-blue-500",
    green: "bg-green-500",
    red: "bg-red-500",
    purple: "bg-purple-500",
    amber: "bg-amber-500",
  };

  return (
    <div>
      {(showLabel || label) && (
        <div className="flex justify-between mb-1">
          {label && (
            <span className="text-xs font-medium text-gray-600">{label}</span>
          )}
          {showLabel && (
            <span className="text-xs font-medium text-gray-500">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
      <div
        className={`w-full ${heightClasses[size]} rounded-full bg-gray-200 overflow-hidden`}
      >
        <div
          className={`${heightClasses[size]} rounded-full ${colorClasses[color]} transition-all duration-500 ease-out ${striped ? "bg-gradient-to-r from-transparent via-white/20 to-transparent bg-[length:20px_100%] animate-[shimmer_1s_linear_infinite]" : ""}`}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>
    </div>
  );
}
