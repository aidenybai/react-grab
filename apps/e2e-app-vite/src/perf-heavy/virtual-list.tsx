import { useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  VIRTUAL_LIST_OVERSCAN_ROWS,
  VIRTUAL_LIST_ROW_COUNT,
  VIRTUAL_LIST_ROW_HEIGHT_PX,
  VIRTUAL_LIST_VIEWPORT_HEIGHT_PX,
} from "./constants";
import { generateTrialRows, type TrialRow } from "./synthetic-data";

const OUTCOME_DOT_CLASS: Record<TrialRow["outcome"], string> = {
  pass: "bg-green-500",
  fail: "bg-gray-300",
  error: "bg-red-500",
};

export const VirtualListSection = () => {
  const rows = useMemo(() => generateTrialRows(VIRTUAL_LIST_ROW_COUNT), []);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => VIRTUAL_LIST_ROW_HEIGHT_PX,
    overscan: VIRTUAL_LIST_OVERSCAN_ROWS,
  });

  return (
    <section data-testid="heavy-virtual-section" className="flex flex-col gap-3 p-4">
      <h2 className="text-lg font-bold">
        Virtualized List ({VIRTUAL_LIST_ROW_COUNT.toLocaleString()} rows)
      </h2>
      <div
        ref={scrollContainerRef}
        data-testid="virtual-scroll-container"
        className="overflow-auto rounded border"
        style={{ height: VIRTUAL_LIST_VIEWPORT_HEIGHT_PX }}
      >
        <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index];
            return (
              <div
                key={virtualRow.key}
                data-testid={`virtual-row-${virtualRow.index}`}
                data-heavy-virtual-row={virtualRow.index}
                onClick={() => setSelectedRowId(row.id)}
                className={`absolute left-0 flex w-full cursor-pointer items-center gap-3 border-b px-3 text-xs hover:bg-blue-50 ${
                  selectedRowId === row.id ? "bg-blue-100" : ""
                }`}
                style={{
                  top: 0,
                  height: virtualRow.size,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${OUTCOME_DOT_CLASS[row.outcome]}`}
                />
                <span className="w-10 shrink-0 font-mono text-[10px] text-gray-400">
                  {virtualRow.index}
                </span>
                <span className="max-w-72 truncate">{row.task}</span>
                <span className="font-mono text-[10px] uppercase text-gray-500">{row.model}</span>
                <span className="ml-auto font-mono text-[11px] tabular-nums">
                  {row.score.toFixed(2)}
                </span>
                <span className="font-mono text-[11px] tabular-nums text-gray-500">
                  ${row.cost.toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
