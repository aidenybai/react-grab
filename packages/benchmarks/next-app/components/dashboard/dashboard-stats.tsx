"use client";

import React from "react";

interface StatItem {
  label: string;
  value: string | number;
  change?: number;
  period?: string;
}

interface DashboardStatsProps {
  stats: StatItem[];
  columns?: 2 | 3 | 4;
  className?: string;
}

function formatChange(change: number): string {
  const sign = change >= 0 ? "+" : "";
  return `${sign}${change.toFixed(1)}%`;
}

export function DashboardStats({
  stats,
  columns = 4,
  className,
}: DashboardStatsProps) {
  const gridClass = {
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
  }[columns];

  return (
    <div className={`grid gap-4 ${gridClass} ${className ?? ""}`}>
      {stats.map((stat, index) => (
        <div
          key={index}
          className="rounded-lg border bg-white p-4 transition-shadow hover:shadow-md"
        >
          <dt className="truncate text-sm font-medium text-gray-500">
            {stat.label}
          </dt>
          <dd className="mt-1 flex items-baseline justify-between md:block lg:flex">
            <div className="flex items-baseline text-2xl font-semibold text-indigo-600">
              {stat.value}
            </div>
            {stat.change !== undefined && (
              <div
                className={`inline-flex items-baseline rounded-full px-2.5 py-0.5 text-sm font-medium ${
                  stat.change >= 0
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {formatChange(stat.change)}
              </div>
            )}
          </dd>
          {stat.period && (
            <p className="mt-1 text-xs text-gray-400">vs. {stat.period}</p>
          )}
        </div>
      ))}
    </div>
  );
}

export default DashboardStats;
