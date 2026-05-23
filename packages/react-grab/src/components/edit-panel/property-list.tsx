import { createEffect, Index, onCleanup, Show, type Component } from "solid-js";
import { MENU_HIGHLIGHT_CORNER_SHAPE, MENU_PANEL_CORNER_RADIUS_PX } from "../../constants.js";
import type { EditableProperty } from "../../types.js";
import { createMenuHighlight } from "../../utils/create-menu-highlight.js";
import { formatDisplayValue } from "../../utils/format-display-value.js";
import { StepArrow } from "./step-arrow.js";

interface PropertyListProps {
  properties: EditableProperty[];
  activeIndex: number;
  onHoverIndex: (index: number) => void;
  onSelect: (index: number) => void;
  onStep: (direction: 1 | -1, shift: boolean) => void;
  activeKey: "left" | "right" | null;
}

export const PropertyList: Component<PropertyListProps> = (props) => {
  const itemElements: (HTMLButtonElement | undefined)[] = [];
  let listRef: HTMLDivElement | undefined;
  let didPointerMove = false;

  const {
    containerRef: highlightContainerRef,
    highlightRef,
    updateHighlight,
    clearHighlight,
  } = createMenuHighlight({
    bottomCornerRadiusPx: MENU_PANEL_CORNER_RADIUS_PX,
    cornerShape: MENU_HIGHLIGHT_CORNER_SHAPE,
  });

  createEffect(() => {
    itemElements.length = props.properties.length;
  });

  // Reset the pointer-move flag whenever the list's data changes so phantom
  // pointerenter events fired by re-layouting under a stationary cursor
  // don't yank the active row away from where keyboard navigation put it.
  createEffect(() => {
    void props.properties;
    didPointerMove = false;
  });

  createEffect(() => {
    const index = props.activeIndex;
    if (index < 0) {
      clearHighlight();
      return;
    }
    const element = itemElements[index];
    if (element) updateHighlight(element);
  });

  createEffect(() => {
    const index = props.activeIndex;
    const element = itemElements[index];
    if (!element || !listRef) return;
    const containerRect = listRef.getBoundingClientRect();
    const targetRect = element.getBoundingClientRect();
    if (targetRect.top < containerRect.top) {
      element.scrollIntoView({ block: "nearest" });
    } else if (targetRect.bottom > containerRect.bottom) {
      element.scrollIntoView({ block: "nearest" });
    }
  });

  return (
    <div
      ref={(element) => {
        listRef = element;
        highlightContainerRef(element);
      }}
      role="menu"
      aria-orientation="vertical"
      aria-label="Editable properties"
      class="relative flex flex-col w-[calc(100%+16px)] -mx-2 -my-1.5 max-h-[var(--rg-edit-list-max-h)] overflow-y-auto outline-none no-scrollbar"
      onPointerMove={() => {
        didPointerMove = true;
      }}
    >
      <div
        ref={highlightRef}
        aria-hidden="true"
        class="pointer-events-none absolute opacity-0 transition-[top,left,width,height,opacity,border-radius] duration-75 ease-out bg-[var(--rg-surface-hover)]"
      />
      <Index each={props.properties}>
        {(propertyAccessor, propertyIndex) => {
          const property = () => propertyAccessor();
          const isActive = () => propertyIndex === props.activeIndex;
          return (
            <button
              ref={(element) => {
                itemElements[propertyIndex] = element;
                onCleanup(() => {
                  if (itemElements[propertyIndex] === element) {
                    itemElements[propertyIndex] = undefined;
                  }
                });
              }}
              data-react-grab-ignore-events
              data-react-grab-edit-property={property().property}
              type="button"
              role="menuitem"
              tabindex={-1}
              class="relative z-1 contain-layout flex items-center justify-between w-full px-2 py-1 cursor-pointer text-left border-none bg-transparent gap-2 min-h-[24px]"
              onPointerEnter={() => {
                if (didPointerMove) props.onHoverIndex(propertyIndex);
              }}
              onMouseDown={(event) => {
                // Browsers focus the clicked button by default, which steals
                // focus from the EditPanel's search input and breaks
                // subsequent arrow-key tweaking. Preventing the mousedown
                // default keeps focus where it is.
                event.preventDefault();
              }}
              onClick={(event) => {
                event.stopPropagation();
                props.onSelect(propertyIndex);
              }}
            >
              <span class="text-[13px] leading-4 font-sans font-medium text-[var(--rg-text-primary)] truncate min-w-0">
                {property().label}
              </span>
              <Show
                when={isActive()}
                fallback={
                  <span class="text-[11px] font-sans text-[var(--rg-text-secondary)] tabular-nums shrink-0">
                    {formatDisplayValue(property().value)}
                    {property().unit}
                  </span>
                }
              >
                <div
                  class="flex items-center gap-1 shrink-0 leading-none"
                  onPointerDown={(event) => event.stopPropagation()}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={(event) => event.stopPropagation()}
                >
                  <StepArrow
                    direction="left"
                    active={props.activeKey === "left"}
                    onPointerDown={() => props.onStep(-1, false)}
                  />
                  <span class="inline-flex items-baseline text-[var(--rg-text-primary)] tabular-nums min-w-[36px] justify-center">
                    <span
                      class="text-[12px] leading-4 font-medium"
                      style={{ "font-variant-numeric": "tabular-nums" }}
                    >
                      {formatDisplayValue(property().value)}
                    </span>
                    <span class="text-[10px] leading-4 font-medium text-[var(--rg-text-secondary)] ml-px">
                      {property().unit}
                    </span>
                  </span>
                  <StepArrow
                    direction="right"
                    active={props.activeKey === "right"}
                    onPointerDown={() => props.onStep(1, false)}
                  />
                </div>
              </Show>
            </button>
          );
        }}
      </Index>
    </div>
  );
};
