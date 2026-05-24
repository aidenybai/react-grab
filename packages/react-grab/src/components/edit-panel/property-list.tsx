import { createEffect, Index, onCleanup, Show, type Component } from "solid-js";
import { MENU_HIGHLIGHT_CORNER_SHAPE, MENU_PANEL_CORNER_RADIUS_PX } from "../../constants.js";
import type { EditableProperty } from "../../types.js";
import { createMenuHighlight } from "../../utils/create-menu-highlight.js";
import { formatDisplayValue } from "../../utils/format-css-value.js";
import { ValueStepper } from "./value-stepper.js";

interface PropertyListProps {
  properties: EditableProperty[];
  activeIndex: number;
  onHoverIndex: (index: number) => void;
  onSelect: (index: number) => void;
  onStep: (direction: 1 | -1) => void;
  onCommitValue: (value: number) => void;
  onEditComplete: () => void;
  activeKey: "left" | "right" | null;
}

export const PropertyList: Component<PropertyListProps> = (props) => {
  const itemElements: (HTMLButtonElement | undefined)[] = [];
  let listRef: HTMLDivElement | undefined;
  // Stationary cursor + reflow can fire phantom pointerenter on rows the
  // user didn't actually mouse onto, which would yank keyboard focus to a
  // different row. We only trust pointerenter after we've observed real
  // pointer movement at least once.
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
    didPointerMove = false;
  });

  createEffect(() => {
    const element = itemElements[props.activeIndex];
    if (!element || props.activeIndex < 0) {
      clearHighlight();
      return;
    }
    updateHighlight(element);
    if (!listRef) return;
    const containerRect = listRef.getBoundingClientRect();
    const targetRect = element.getBoundingClientRect();
    if (targetRect.top < containerRect.top || targetRect.bottom > containerRect.bottom) {
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
        {(property, propertyIndex) => {
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
              data-react-grab-edit-property={property().key}
              type="button"
              role="menuitem"
              tabindex={-1}
              class="relative z-1 contain-layout flex items-center justify-between w-full px-2 py-1 cursor-pointer text-left border-none bg-transparent gap-2 min-h-[24px]"
              onPointerEnter={() => {
                if (didPointerMove) props.onHoverIndex(propertyIndex);
              }}
              onMouseDown={(event) => {
                // Default focus on the clicked button would steal it from
                // EditPanel's search input and break arrow-key tweaking.
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
                  onPointerDown={(event) => event.stopPropagation()}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={(event) => event.stopPropagation()}
                >
                  <ValueStepper
                    value={property().value}
                    unit={property().unit}
                    activeKey={props.activeKey}
                    onStep={props.onStep}
                    onCommitValue={props.onCommitValue}
                    onEditComplete={props.onEditComplete}
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
