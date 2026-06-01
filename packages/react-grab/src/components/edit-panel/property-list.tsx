import { createEffect, Index, Match, onCleanup, Show, Switch, type Component } from "solid-js";
import type { EditableProperty } from "../../types.js";
import { createMenuHighlight } from "../../utils/create-menu-highlight.js";
import { getShadowActiveElement } from "../../utils/get-shadow-active-element.js";
import { formatDisplayValue } from "../../utils/format-css-value.js";
import { ActivePropertyControl } from "./active-property-control.js";
import { narrowColor, narrowEnum, narrowNumeric } from "./narrow-property.js";

const enumDisplayValue = (property: EditableProperty): string => {
  const enumProperty = narrowEnum(property);
  if (!enumProperty) return "";
  return (
    enumProperty.options.find((option) => option.value === enumProperty.value)?.label ??
    enumProperty.value
  );
};

interface PropertyListProps {
  properties: EditableProperty[];
  activeIndex: number;
  onHoverIndex: (index: number) => void;
  onSelect: (index: number) => void;
  onStep: (direction: 1 | -1) => void;
  onCommit: (value: number | string) => void;
  onColorPickerRegister: (trigger: (() => void) | null, owner?: () => void) => void;
  onEditComplete: () => void;
  onInvalidCommit: () => void;
  onInteract: () => void;
  isAdjusting: () => boolean;
  activeKey: "left" | "right" | null;
  activeTailwindLabel: string | null;
}

export const PropertyList: Component<PropertyListProps> = (props) => {
  const itemElements: (HTMLButtonElement | undefined)[] = [];
  let listRef: HTMLDivElement | undefined;
  // Mount-time gate: a stationary cursor + the initial reflow can fire
  // phantom pointerenter on whatever row the mouse happens to be sitting
  // on, yanking the active row before the user has demonstrated intent
  // to use the mouse. Once any real pointer movement is observed, the
  // gate is permanently open for this panel mount.
  let didPointerMove = false;
  let pendingHoverIndex: number | null = null;

  const isHoverOwnedByFocusedInlineInput = (): boolean => {
    if (!listRef) return false;
    const focusedElement = getShadowActiveElement(listRef);
    return (
      focusedElement instanceof HTMLElement &&
      focusedElement.matches("input[data-react-grab-input]")
    );
  };

  const maybeActivateHoveredIndex = (propertyIndex: number, source: "enter" | "move") => {
    if (source === "move") didPointerMove = true;
    const isFocusLocked = isHoverOwnedByFocusedInlineInput();
    if (!didPointerMove) return;
    if (isFocusLocked) return;
    if (props.isAdjusting()) {
      pendingHoverIndex = propertyIndex;
      return;
    }
    pendingHoverIndex = null;
    if (propertyIndex === props.activeIndex) return;
    props.onHoverIndex(propertyIndex);
  };

  createEffect(() => {
    if (props.isAdjusting()) return;
    const propertyIndex = pendingHoverIndex;
    if (propertyIndex === null) return;
    pendingHoverIndex = null;
    const element = itemElements[propertyIndex];
    const isFocusLocked = isHoverOwnedByFocusedInlineInput();
    if (!didPointerMove) return;
    if (isFocusLocked) return;
    if (!element?.matches(":hover")) return;
    if (propertyIndex === props.activeIndex) return;
    props.onHoverIndex(propertyIndex);
  });

  const {
    containerRef: highlightContainerRef,
    highlightRef,
    updateHighlight,
    clearHighlight,
  } = createMenuHighlight({});

  createEffect(() => {
    itemElements.length = props.properties.length;
  });

  let pendingHighlightFrame: number | undefined;
  createEffect(() => {
    const activeIndex = props.activeIndex;
    const element = itemElements[activeIndex];
    if (!element || activeIndex < 0) {
      clearHighlight();
      return;
    }
    updateHighlight(element);
    if (pendingHighlightFrame !== undefined) {
      cancelAnimationFrame(pendingHighlightFrame);
    }
    pendingHighlightFrame = requestAnimationFrame(() => {
      pendingHighlightFrame = undefined;
      const refreshed = itemElements[activeIndex];
      if (refreshed) updateHighlight(refreshed);
    });
    if (!listRef) return;
    const containerRect = listRef.getBoundingClientRect();
    const targetRect = element.getBoundingClientRect();
    if (targetRect.top < containerRect.top || targetRect.bottom > containerRect.bottom) {
      element.scrollIntoView({ block: "nearest" });
    }
  });
  onCleanup(() => {
    if (pendingHighlightFrame !== undefined) cancelAnimationFrame(pendingHighlightFrame);
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
      class="relative flex flex-col w-full max-h-[var(--rg-edit-list-max-h)] overflow-y-auto outline-none no-scrollbar"
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
              aria-current={isActive() ? "true" : undefined}
              type="button"
              role="menuitem"
              tabindex={-1}
              class="relative z-1 contain-layout block w-full h-[24px] px-0 py-0 cursor-pointer text-left border-none bg-transparent"
              onPointerEnter={() => {
                maybeActivateHoveredIndex(propertyIndex, "enter");
              }}
              onPointerMove={() => {
                maybeActivateHoveredIndex(propertyIndex, "move");
              }}
              onPointerLeave={() => {
                if (pendingHoverIndex === propertyIndex) pendingHoverIndex = null;
              }}
              onMouseDown={(event) => {
                // Default focus on the clicked button would steal it from
                // EditPanel's search input and break arrow-key tweaking.
                // Blur any in-progress inline value input FIRST so its
                // onBlur=>commit fires before the subsequent onClick
                // changes activeIndex and unmounts the input (otherwise
                // the typed draft is silently lost).
                const focusedElement = listRef ? getShadowActiveElement(listRef) : null;
                if (
                  focusedElement instanceof HTMLElement &&
                  focusedElement.matches("input[data-react-grab-input]")
                ) {
                  focusedElement.blur();
                }
                event.preventDefault();
              }}
              onClick={(event) => {
                event.stopPropagation();
                props.onSelect(propertyIndex);
              }}
            >
              <Show
                when={isActive()}
                fallback={
                  <div class="flex items-center justify-between w-full h-[24px] px-2 gap-2">
                    <span class="text-[13px] leading-4 font-sans font-medium text-[var(--rg-text-primary)] truncate min-w-0">
                      {property().label}
                    </span>
                    <Switch>
                      <Match when={narrowNumeric(property())}>
                        {(numeric) => (
                          <span class="font-sans text-[var(--rg-text-secondary)] tabular-nums shrink-0">
                            <span class="text-[11px]">{formatDisplayValue(numeric().value)}</span>
                            <span class="text-[9px] ml-px">{numeric().unit}</span>
                          </span>
                        )}
                      </Match>
                      <Match when={narrowColor(property())}>
                        {(color) => (
                          <span
                            aria-hidden="true"
                            class="size-[12px] rounded-[3px] border-[var(--rg-border-button)] [border-width:0.5px] border-solid shrink-0"
                            style={{ "background-color": color().value }}
                          />
                        )}
                      </Match>
                      <Match when={narrowEnum(property())}>
                        {(enumProp) => (
                          <span class="text-[11px] font-sans text-[var(--rg-text-secondary)] shrink-0">
                            {enumDisplayValue(enumProp())}
                          </span>
                        )}
                      </Match>
                    </Switch>
                  </div>
                }
              >
                <div class="flex items-center w-full h-[24px]">
                  <ActivePropertyControl
                    property={property()}
                    activeKey={props.activeKey}
                    onStep={props.onStep}
                    onCommit={props.onCommit}
                    onEditComplete={props.onEditComplete}
                    onInvalidCommit={props.onInvalidCommit}
                    onInteract={props.onInteract}
                    onColorPickerRegister={props.onColorPickerRegister}
                    showLabel
                    tailwindLabel={props.activeTailwindLabel}
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
