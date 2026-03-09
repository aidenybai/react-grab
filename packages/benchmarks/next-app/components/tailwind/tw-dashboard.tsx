"use client";
import React from "react";

function StatCard({
  label,
  value,
  change,
  "data-testid": testId,
}: {
  label: string;
  value: string;
  change: string;
  "data-testid"?: string;
}) {
  const isPositive = change.startsWith("+");
  return (
    <div
      data-testid={testId}
      className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4"
    >
      <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wide">
        {label}
      </p>
      <p className="text-2xl font-bold mt-1 text-[var(--foreground)]">
        {value}
      </p>
      <p
        className={`text-xs mt-1 ${isPositive ? "text-green-600" : "text-red-500"}`}
      >
        {change}
      </p>
    </div>
  );
}

function MiniTable({ "data-testid": testId }: { "data-testid"?: string }) {
  const rows = [
    { name: "Widget A", sales: 1234, status: "Active" },
    { name: "Widget B", sales: 856, status: "Active" },
    { name: "Widget C", sales: 432, status: "Paused" },
    { name: "Widget D", sales: 287, status: "Active" },
  ];
  return (
    <div
      className="rounded-lg border border-[var(--border)] overflow-hidden"
      data-testid={testId}
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[var(--muted)]">
            <th className="text-left px-4 py-2 font-medium text-[var(--muted-foreground)]">
              Product
            </th>
            <th className="text-left px-4 py-2 font-medium text-[var(--muted-foreground)]">
              Sales
            </th>
            <th className="text-left px-4 py-2 font-medium text-[var(--muted-foreground)]">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name} className="border-t border-[var(--border)]">
              <td className="px-4 py-2 text-[var(--foreground)]">{row.name}</td>
              <td className="px-4 py-2 text-[var(--foreground)]">
                {row.sales.toLocaleString()}
              </td>
              <td className="px-4 py-2">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    row.status === "Active"
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {row.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TwDashboard({
  "data-testid": testId,
}: {
  "data-testid"?: string;
}) {
  return (
    <div data-testid={testId} className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Revenue"
          value="$45.2K"
          change="+12.5%"
          data-testid="tw-stat-revenue"
        />
        <StatCard label="Users" value="2,340" change="+8.1%" />
        <StatCard label="Orders" value="1,203" change="-2.3%" />
        <StatCard label="Conversion" value="3.2%" change="+0.4%" />
      </div>
      <MiniTable data-testid="tw-mini-table" />
    </div>
  );
}
