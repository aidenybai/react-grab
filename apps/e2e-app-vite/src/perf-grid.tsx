import { useMemo } from "react";

interface PerfGridProps {
  rowCount: number;
  columnCount: number;
}

const PerfCell = ({ row, column }: { row: number; column: number }) => {
  return (
    <div
      data-testid={`perf-cell-${row}-${column}`}
      data-perf-row={row}
      data-perf-column={column}
      className="border border-gray-200 bg-white px-2 py-1 text-xs"
    >
      <span className="font-medium">{`r${row}c${column}`}</span>
      <span className="ml-1 text-gray-500">cell</span>
    </div>
  );
};

const PerfRow = ({ row, columnCount }: { row: number; columnCount: number }) => {
  const columns = useMemo(
    () => Array.from({ length: columnCount }, (_, columnIndex) => columnIndex),
    [columnCount],
  );
  return (
    <div className="flex" data-perf-row={row} data-testid={`perf-row-${row}`}>
      {columns.map((columnIndex) => (
        <PerfCell key={columnIndex} row={row} column={columnIndex} />
      ))}
    </div>
  );
};

export const PerfGrid = ({ rowCount, columnCount }: PerfGridProps) => {
  const rows = useMemo(
    () => Array.from({ length: rowCount }, (_, rowIndex) => rowIndex),
    [rowCount],
  );
  return (
    <div data-testid="perf-grid" className="p-4">
      <header className="mb-4">
        <h1 className="text-xl font-bold" data-testid="perf-title">
          Perf Grid ({rowCount}×{columnCount})
        </h1>
        <p className="text-sm text-gray-500" data-testid="perf-description">
          Synthetic grid for react-grab reactivity micro-benchmarks.
        </p>
      </header>
      <div className="flex flex-col gap-px">
        {rows.map((rowIndex) => (
          <PerfRow key={rowIndex} row={rowIndex} columnCount={columnCount} />
        ))}
      </div>
    </div>
  );
};
