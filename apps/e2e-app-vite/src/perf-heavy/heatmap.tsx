import { useMemo, useRef, useState, type MouseEvent } from "react";
import { HEATMAP_COLUMN_COUNT, HEATMAP_ROW_COUNT } from "./constants";
import { generateHeatmapCells } from "./synthetic-data";

interface HoveredCell {
  rowIndex: number;
  columnIndex: number;
  value: number;
  x: number;
  y: number;
}

// Mirrors the react-bench-website heatmap interaction: hover applies a
// row+column crosshair by imperatively toggling classes on every element in
// the hovered row/column (so the memoized grid never re-renders), plus a
// tooltip that follows the pointer.
const toggleCrosshair = (
  gridElement: HTMLElement,
  rowIndex: number,
  columnIndex: number,
  isOn: boolean,
): void => {
  const selector = `[data-hm-row="${rowIndex}"], [data-hm-col="${columnIndex}"]`;
  for (const cellElement of gridElement.querySelectorAll(selector)) {
    cellElement.classList.toggle("outline", isOn);
    cellElement.classList.toggle("outline-blue-400", isOn);
  }
};

export const HeatmapSection = () => {
  const cells = useMemo(() => generateHeatmapCells(HEATMAP_ROW_COUNT, HEATMAP_COLUMN_COUNT), []);
  const gridRef = useRef<HTMLDivElement>(null);
  const [hoveredCell, setHoveredCell] = useState<HoveredCell | null>(null);

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const rowAttr = target.dataset.hmRow;
    const columnAttr = target.dataset.hmCol;
    const valueAttr = target.dataset.hmValue;
    const gridElement = gridRef.current;
    if (!gridElement) return;
    if (rowAttr === undefined || columnAttr === undefined || valueAttr === undefined) {
      if (hoveredCell) {
        toggleCrosshair(gridElement, hoveredCell.rowIndex, hoveredCell.columnIndex, false);
        setHoveredCell(null);
      }
      return;
    }
    const rowIndex = Number(rowAttr);
    const columnIndex = Number(columnAttr);
    if (
      hoveredCell &&
      (hoveredCell.rowIndex !== rowIndex || hoveredCell.columnIndex !== columnIndex)
    ) {
      toggleCrosshair(gridElement, hoveredCell.rowIndex, hoveredCell.columnIndex, false);
    }
    if (
      !hoveredCell ||
      hoveredCell.rowIndex !== rowIndex ||
      hoveredCell.columnIndex !== columnIndex
    ) {
      toggleCrosshair(gridElement, rowIndex, columnIndex, true);
    }
    setHoveredCell({
      rowIndex,
      columnIndex,
      value: Number(valueAttr),
      x: event.clientX,
      y: event.clientY,
    });
  };

  const handleMouseLeave = () => {
    const gridElement = gridRef.current;
    if (gridElement && hoveredCell) {
      toggleCrosshair(gridElement, hoveredCell.rowIndex, hoveredCell.columnIndex, false);
    }
    setHoveredCell(null);
  };

  return (
    <section data-testid="heavy-heatmap-section" className="flex flex-col gap-3 p-4">
      <h2 className="text-lg font-bold">
        Heatmap ({HEATMAP_ROW_COUNT}×{HEATMAP_COLUMN_COUNT} crosshair grid)
      </h2>
      <div
        ref={gridRef}
        data-testid="heatmap-grid"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="grid w-fit"
        style={{ gridTemplateColumns: `repeat(${HEATMAP_COLUMN_COUNT}, 28px)` }}
      >
        {cells.map((cell) => (
          <button
            key={`${cell.rowIndex}-${cell.columnIndex}`}
            type="button"
            data-hm-row={cell.rowIndex}
            data-hm-col={cell.columnIndex}
            data-hm-value={cell.value}
            data-testid={`heatmap-cell-${cell.rowIndex}-${cell.columnIndex}`}
            className="flex h-6 cursor-pointer items-center justify-center font-mono text-[9px] tabular-nums"
            style={{
              backgroundColor: `rgba(37, 99, 235, ${cell.value})`,
              color: cell.value > 0.55 ? "white" : "#111827",
            }}
          >
            {Math.round(cell.value * 100)}
          </button>
        ))}
      </div>
      {hoveredCell && (
        <div
          data-testid="heatmap-tooltip"
          className="pointer-events-none fixed z-50 rounded border bg-white px-2 py-1 font-mono text-[10px] shadow"
          style={{ left: hoveredCell.x + 12, top: hoveredCell.y + 12 }}
        >
          r{hoveredCell.rowIndex} c{hoveredCell.columnIndex} = {hoveredCell.value}
        </div>
      )}
    </section>
  );
};
