"use client";

import React from "react";

interface Column<T> {
  key: keyof T;
  header: string;
  width?: string;
  align?: "left" | "center" | "right";
  render?: (value: T[keyof T], row: T) => React.ReactNode;
}

interface TableProps<T extends Record<string, unknown>> {
  columns: Column<T>[];
  data: T[];
  striped?: boolean;
  hoverable?: boolean;
  compact?: boolean;
  emptyMessage?: string;
}

export function Table<T extends Record<string, unknown>>({
  columns,
  data,
  striped = false,
  hoverable = true,
  compact = false,
  emptyMessage = "No data available",
}: TableProps<T>) {
  const cellPadding = compact ? "px-3 py-2" : "px-4 py-3";

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className={`${cellPadding} text-${col.align || "left"} font-medium whitespace-nowrap`}
                style={{ width: col.width }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-gray-400"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={i}
                className={`${striped && i % 2 ? "bg-gray-50" : "bg-white"} ${hoverable ? "hover:bg-gray-50" : ""}`}
              >
                {columns.map((col) => (
                  <td
                    key={String(col.key)}
                    className={`${cellPadding} text-${col.align || "left"} text-gray-900`}
                  >
                    {col.render
                      ? col.render(row[col.key], row)
                      : String(row[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
