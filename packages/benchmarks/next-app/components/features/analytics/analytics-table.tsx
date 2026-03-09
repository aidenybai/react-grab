"use client";

import React, { useState, useMemo } from "react";

interface AnalyticsRow {
  id: string;
  page: string;
  views: number;
  uniqueVisitors: number;
  bounceRate: number;
  avgDuration: number;
}

interface AnalyticsTableProps {
  data: AnalyticsRow[];
  title?: string;
  pageSize?: number;
  className?: string;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function AnalyticsTable({
  data,
  title,
  pageSize = 10,
  className,
}: AnalyticsTableProps) {
  const [sortKey, setSortKey] = useState<keyof AnalyticsRow>("views");
  const [sortDesc, setSortDesc] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDesc ? bVal - aVal : aVal - bVal;
      }
      return sortDesc
        ? String(bVal).localeCompare(String(aVal))
        : String(aVal).localeCompare(String(bVal));
    });
  }, [data, sortKey, sortDesc]);

  const paginatedData = sortedData.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize,
  );
  const totalPages = Math.ceil(data.length / pageSize);

  const handleSort = (key: keyof AnalyticsRow) => {
    if (sortKey === key) setSortDesc(!sortDesc);
    else {
      setSortKey(key);
      setSortDesc(true);
    }
  };

  const columns: { key: keyof AnalyticsRow; label: string; align?: string }[] =
    [
      { key: "page", label: "Page" },
      { key: "views", label: "Views", align: "right" },
      { key: "uniqueVisitors", label: "Visitors", align: "right" },
      { key: "bounceRate", label: "Bounce Rate", align: "right" },
      { key: "avgDuration", label: "Avg. Duration", align: "right" },
    ];

  return (
    <div className={`rounded-lg border bg-white ${className ?? ""}`}>
      {title && (
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`cursor-pointer px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700 ${
                    col.align === "right" ? "text-right" : "text-left"
                  }`}
                  onClick={() => handleSort(col.key)}
                >
                  {col.label}{" "}
                  {sortKey === col.key && (sortDesc ? "\u2193" : "\u2191")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {paginatedData.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 font-medium text-gray-900">
                  {row.page}
                </td>
                <td className="px-4 py-2.5 text-right text-gray-600">
                  {row.views.toLocaleString()}
                </td>
                <td className="px-4 py-2.5 text-right text-gray-600">
                  {row.uniqueVisitors.toLocaleString()}
                </td>
                <td className="px-4 py-2.5 text-right text-gray-600">
                  {row.bounceRate.toFixed(1)}%
                </td>
                <td className="px-4 py-2.5 text-right text-gray-600">
                  {formatDuration(row.avgDuration)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t px-4 py-2.5">
          <span className="text-xs text-gray-500">
            Page {currentPage + 1} of {totalPages}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className="rounded px-2 py-1 text-xs hover:bg-gray-100 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() =>
                setCurrentPage(Math.min(totalPages - 1, currentPage + 1))
              }
              disabled={currentPage >= totalPages - 1}
              className="rounded px-2 py-1 text-xs hover:bg-gray-100 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AnalyticsTable;
