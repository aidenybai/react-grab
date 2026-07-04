import { Fragment, useMemo, useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ExpandedState,
  type RowSelectionState,
  type SortingState,
} from "@tanstack/react-table";
import { TABLE_PAGE_SIZE, TABLE_ROW_COUNT } from "./constants";
import { generateTrialRows, type TrialRow } from "./synthetic-data";

const OUTCOME_CLASS: Record<TrialRow["outcome"], string> = {
  pass: "text-green-700",
  fail: "text-gray-400",
  error: "text-red-600",
};

const columnHelper = createColumnHelper<TrialRow>();

const buildColumns = () => [
  columnHelper.display({
    id: "select",
    header: ({ table }) => (
      <input
        type="checkbox"
        data-testid="table-select-all"
        checked={table.getIsAllPageRowsSelected()}
        onChange={table.getToggleAllPageRowsSelectedHandler()}
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        data-testid={`table-select-${row.id}`}
        checked={row.getIsSelected()}
        onChange={row.getToggleSelectedHandler()}
      />
    ),
  }),
  columnHelper.display({
    id: "expander",
    header: () => null,
    cell: ({ row }) => (
      <button
        type="button"
        data-testid={`table-expand-${row.id}`}
        onClick={row.getToggleExpandedHandler()}
        className="w-5 text-gray-500"
      >
        {row.getIsExpanded() ? "▾" : "▸"}
      </button>
    ),
  }),
  columnHelper.accessor("task", {
    header: "Task",
    cell: (info) => <span className="block max-w-64 truncate text-xs">{info.getValue()}</span>,
  }),
  columnHelper.accessor("suite", {
    header: "Suite",
    cell: (info) => (
      <span className="font-mono text-[10px] uppercase tracking-wider text-gray-500">
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor("model", {
    header: "Model",
    cell: (info) => (
      <span className="whitespace-nowrap font-mono text-[11px] uppercase">
        {info.getValue()}
        <span className="text-gray-400"> [{info.row.original.effort}]</span>
      </span>
    ),
  }),
  columnHelper.accessor("outcome", {
    header: "Outcome",
    cell: (info) => (
      <span
        className={`font-mono text-[10px] uppercase tracking-widest ${OUTCOME_CLASS[info.getValue()]}`}
      >
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor("score", {
    header: "Score",
    cell: (info) => (
      <span className="block text-right font-mono text-[11px] tabular-nums">
        {info.getValue().toFixed(2)}
      </span>
    ),
  }),
  columnHelper.accessor("cost", {
    header: "Cost",
    cell: (info) => (
      <span className="block text-right font-mono text-[11px] tabular-nums">
        ${info.getValue().toFixed(2)}
      </span>
    ),
  }),
  columnHelper.accessor("outTokens", {
    header: "Out tok.",
    cell: (info) => (
      <span className="block text-right font-mono text-[11px] tabular-nums">
        {info.getValue().toLocaleString()}
      </span>
    ),
  }),
  columnHelper.accessor("steps", {
    header: "Steps",
    cell: (info) => (
      <span className="block text-right font-mono text-[11px] tabular-nums">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor("durationMin", {
    header: "Duration",
    cell: (info) => (
      <span className="block text-right font-mono text-[11px] tabular-nums">
        {info.getValue().toFixed(1)}m
      </span>
    ),
  }),
];

export const TanstackTableSection = () => {
  const rows = useMemo(() => generateTrialRows(TABLE_ROW_COUNT), []);
  const columns = useMemo(buildColumns, []);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [expanded, setExpanded] = useState<ExpandedState>({});

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, globalFilter, rowSelection, expanded },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => true,
    initialState: { pagination: { pageSize: TABLE_PAGE_SIZE } },
    globalFilterFn: "includesString",
  });

  return (
    <section data-testid="heavy-table-section" className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-bold">
          TanStack Table ({TABLE_ROW_COUNT.toLocaleString()} rows)
        </h2>
        <input
          type="search"
          value={globalFilter}
          onChange={(event) => setGlobalFilter(event.target.value)}
          placeholder="filter tasks"
          aria-label="Filter table tasks"
          data-testid="table-filter-input"
          className="w-48 rounded border px-2 py-1 font-mono text-xs"
        />
        <span
          data-testid="table-row-count"
          className="font-mono text-[10px] uppercase text-gray-500"
        >
          {table.getFilteredRowModel().rows.length.toLocaleString()} rows ·{" "}
          {Object.keys(rowSelection).length} selected
        </span>
      </div>
      <table className="w-full border-collapse" data-testid="heavy-table">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b">
              {headerGroup.headers.map((header) => {
                const sortDirection = header.column.getIsSorted();
                const toggleSorting = header.column.getToggleSortingHandler();
                return (
                  <th
                    key={header.id}
                    data-testid={`table-header-${header.column.id}`}
                    onClick={toggleSorting}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      toggleSorting?.(event);
                    }}
                    tabIndex={header.column.getCanSort() ? 0 : undefined}
                    role={header.column.getCanSort() ? "button" : undefined}
                    aria-sort={
                      sortDirection === "asc"
                        ? "ascending"
                        : sortDirection === "desc"
                          ? "descending"
                          : "none"
                    }
                    className="h-8 cursor-pointer select-none whitespace-nowrap px-2 text-left text-xs font-semibold"
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {{ asc: " ↑", desc: " ↓" }[sortDirection as string] ?? ""}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <Fragment key={row.id}>
              <tr
                data-testid={`table-row-${row.id}`}
                data-heavy-table-row={row.id}
                className={`border-b hover:bg-blue-50 ${row.getIsSelected() ? "bg-blue-100" : ""}`}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="h-8 whitespace-nowrap px-2">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
              {row.getIsExpanded() && (
                <tr data-testid={`table-detail-${row.id}`}>
                  <td
                    colSpan={row.getVisibleCells().length}
                    className="bg-gray-50 px-8 py-2 text-xs"
                  >
                    <div className="flex gap-8">
                      <span>id: {row.original.id}</span>
                      <span>suite: {row.original.suite}</span>
                      <span>tokens: {row.original.outTokens.toLocaleString()}</span>
                      <span>steps: {row.original.steps}</span>
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
      <div className="flex items-center gap-2 font-mono text-[11px]">
        <button
          type="button"
          data-testid="table-prev-page"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          className="rounded border px-2 py-1 disabled:opacity-40"
        >
          prev
        </button>
        <span data-testid="table-page-label">
          page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </span>
        <button
          type="button"
          data-testid="table-next-page"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          className="rounded border px-2 py-1 disabled:opacity-40"
        >
          next
        </button>
      </div>
    </section>
  );
};
