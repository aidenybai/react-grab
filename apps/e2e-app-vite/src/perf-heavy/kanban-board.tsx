import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { KANBAN_CARDS_PER_COLUMN, KANBAN_COLUMN_COUNT, KANBAN_ZOOM_SCALE } from "./constants";
import { generateTrialRows, type TrialRow } from "./synthetic-data";

const COLUMN_TITLES = ["Backlog", "In Progress", "Review", "Done"];

interface KanbanDragState {
  cardId: string;
  pointerX: number;
  pointerY: number;
  offsetX: number;
  offsetY: number;
}

// dnd-kit-style pointer-capture drag and drop: pointerdown captures the
// pointer on the card, every pointermove re-renders the floating card, drop
// reassigns the column. This is the classic interference case for react-grab —
// both sides want pointerdown/move/up on the same elements, and the app calls
// setPointerCapture, which retargets subsequent pointer events.
//
// The last column is wrapped in a CSS scale transform (design-tool zoom
// pattern), so bounds math over its cards goes through a transformed ancestor.
export const KanbanBoardSection = () => {
  const cards = useMemo(() => generateTrialRows(KANBAN_COLUMN_COUNT * KANBAN_CARDS_PER_COLUMN), []);
  const cardById = useMemo(() => {
    const lookup = new Map<string, TrialRow>();
    for (const card of cards) lookup.set(card.id, card);
    return lookup;
  }, [cards]);

  const [columns, setColumns] = useState<string[][]>(() =>
    Array.from({ length: KANBAN_COLUMN_COUNT }, (_, columnIndex) =>
      cards
        .slice(columnIndex * KANBAN_CARDS_PER_COLUMN, (columnIndex + 1) * KANBAN_CARDS_PER_COLUMN)
        .map((card) => card.id),
    ),
  );
  const [dragState, setDragState] = useState<KanbanDragState | null>(null);
  const columnRefs = useRef<Array<HTMLDivElement | null>>([]);

  const handleCardPointerDown = (event: ReactPointerEvent<HTMLDivElement>, cardId: string) => {
    if (event.button !== 0 || event.defaultPrevented) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const cardBounds = event.currentTarget.getBoundingClientRect();
    setDragState({
      cardId,
      pointerX: event.clientX,
      pointerY: event.clientY,
      offsetX: event.clientX - cardBounds.left,
      offsetY: event.clientY - cardBounds.top,
    });
  };

  const handleCardPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragState) return;
    setDragState({ ...dragState, pointerX: event.clientX, pointerY: event.clientY });
  };

  const handleCardPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragState) return;
    const dropColumnIndex = columnRefs.current.findIndex((columnElement) => {
      if (!columnElement) return false;
      const bounds = columnElement.getBoundingClientRect();
      return event.clientX >= bounds.left && event.clientX <= bounds.right;
    });
    setColumns((previousColumns) => {
      const nextColumns = previousColumns.map((columnCardIds) =>
        columnCardIds.filter((columnCardId) => columnCardId !== dragState.cardId),
      );
      const targetColumnIndex = dropColumnIndex >= 0 ? dropColumnIndex : 0;
      nextColumns[targetColumnIndex] = [dragState.cardId, ...nextColumns[targetColumnIndex]];
      return nextColumns;
    });
    setDragState(null);
  };

  const draggedCard = dragState ? cardById.get(dragState.cardId) : null;

  return (
    <section data-testid="heavy-kanban-section" className="flex flex-col gap-3 p-4">
      <h2 className="text-lg font-bold">
        Kanban ({KANBAN_COLUMN_COUNT}×{KANBAN_CARDS_PER_COLUMN} pointer-capture dnd)
      </h2>
      <div className="flex gap-4">
        {columns.map((columnCardIds, columnIndex) => {
          const isZoomedColumn = columnIndex === KANBAN_COLUMN_COUNT - 1;
          const columnContent = (
            <div
              ref={(columnElement) => {
                columnRefs.current[columnIndex] = columnElement;
              }}
              data-testid={`kanban-column-${columnIndex}`}
              className="flex w-56 flex-col gap-2 rounded border bg-gray-50 p-2"
            >
              <h3 className="font-mono text-[10px] uppercase tracking-widest text-gray-500">
                {COLUMN_TITLES[columnIndex]} · {columnCardIds.length}
              </h3>
              {columnCardIds.map((cardId) => {
                const card = cardById.get(cardId);
                if (!card) return null;
                const isBeingDragged = dragState?.cardId === cardId;
                return (
                  <div
                    key={cardId}
                    data-kanban-card={cardId}
                    data-testid={`kanban-card-${cardId}`}
                    onPointerDown={(event) => handleCardPointerDown(event, cardId)}
                    onPointerMove={handleCardPointerMove}
                    onPointerUp={handleCardPointerUp}
                    className={`cursor-grab touch-none rounded border bg-white p-2 text-xs shadow-sm ${
                      isBeingDragged ? "opacity-40" : ""
                    }`}
                  >
                    <span className="block max-w-full truncate font-medium">{card.task}</span>
                    <span className="font-mono text-[10px] uppercase text-gray-400">
                      {card.model} · ${card.cost.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          );
          return isZoomedColumn ? (
            <div
              key={columnIndex}
              data-testid="kanban-zoomed-wrapper"
              style={{ transform: `scale(${KANBAN_ZOOM_SCALE})`, transformOrigin: "top left" }}
            >
              {columnContent}
            </div>
          ) : (
            <div key={columnIndex}>{columnContent}</div>
          );
        })}
      </div>
      {dragState && draggedCard && (
        <div
          data-testid="kanban-drag-ghost"
          className="pointer-events-none fixed z-40 w-52 rounded border bg-white p-2 text-xs shadow-lg"
          style={{
            left: dragState.pointerX - dragState.offsetX,
            top: dragState.pointerY - dragState.offsetY,
          }}
        >
          <span className="block truncate font-medium">{draggedCard.task}</span>
        </div>
      )}
    </section>
  );
};
