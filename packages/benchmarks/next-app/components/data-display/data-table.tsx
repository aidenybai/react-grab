"use client";

import React, { useState, useMemo } from "react";

interface DataTableColumn {
  id: string;
  header: string;
  accessorKey: string;
  sortable?: boolean;
  filterable?: boolean;
}

interface DataTableProps {
  columns: DataTableColumn[];
  data: Record<string, unknown>[];
  pageSize?: number;
  searchable?: boolean;
  selectable?: boolean;
}

export function DataTable({
  columns,
  data,
  pageSize = 10,
  searchable = false,
  selectable = false,
}: DataTableProps) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const filtered = useMemo(() => {
    if (!search) return data;
    return data.filter((row) =>
      columns.some((col) =>
        String(row[col.accessorKey] ?? "")
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    );
  }, [data, search, columns]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const av = String(a[sortKey] ?? "");
      const bv = String(b[sortKey] ?? "");
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [filtered, sortKey, sortDir]);

  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(sorted.length / pageSize);

  return (
    <div className="space-y-3">
      {searchable && (
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          placeholder="Search..."
          className="w-64 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      )}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {selectable && (
                <th className="w-10 px-3 py-2">
                  <input type="checkbox" />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.id}
                  onClick={
                    col.sortable
                      ? () => {
                          setSortKey(col.accessorKey);
                          setSortDir(sortDir === "asc" ? "desc" : "asc");
                        }
                      : undefined
                  }
                  className={`px-4 py-2 text-left font-medium text-gray-600 ${col.sortable ? "cursor-pointer select-none hover:text-gray-900" : ""}`}
                >
                  {col.header}
                  {sortKey === col.accessorKey &&
                    (sortDir === "asc" ? " \u2191" : " \u2193")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paged.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50">
                {selectable && (
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(page * pageSize + i)}
                      onChange={() => {
                        const next = new Set(selected);
                        const idx = page * pageSize + i;
                        next.has(idx) ? next.delete(idx) : next.add(idx);
                        setSelected(next);
                      }}
                    />
                  </td>
                )}
                {columns.map((col) => (
                  <td key={col.id} className="px-4 py-2 text-gray-900">
                    {String(row[col.accessorKey] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{sorted.length} results</span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="px-2 py-1 rounded border disabled:opacity-50"
            >
              Prev
            </button>
            <span className="px-2 py-1">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="px-2 py-1 rounded border disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
