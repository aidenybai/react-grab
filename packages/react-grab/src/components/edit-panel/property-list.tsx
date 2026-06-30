import { Index, Match, onCleanup, Show, Switch, type Component } from "solid-js";
import type { EditableProperty } from "../../types.js";
import { createMenuList } from "../../utils/create-menu-list.js";
import { formatDisplayValue } from "../../utils/format-css-value.js";
import { ActivePropertyControl } from "./active-property-control.js";
import { narrowColor, narrowEnum, narrowNumeric } from "./narrow-property.js";

const getEnumDisplayValue = (property: EditableProperty): string => {
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
  onCommit: (value: number | string, source: "keyboard" | "pointer") => void;
  onColorPickerRegister: (trigger: (() => void) | null, owner?: () => void) => void;
  onEditComplete: () => void;
  onInvalidCommit: () => void;
  onInteract: () => void;
  isAdjusting: () => boolean;
  activeKey: "left" | "right" | null;
  activeTailwindLabel: string | null;
}

export const PropertyList: Component<PropertyListProps> = (props) => {
  const menu = createMenuList({
    activeIndex: () => props.activeIndex,
    itemCount: () => props.properties.length,
    onHoverIndex: (index) => props.onHoverIndex(index),
    isAdjusting: () => props.isAdjusting(),
  });

  return (
    <div
      ref={menu.containerRef}
      role="menu"
      aria-orientation="vertical"
      aria-label="Editable properties"
      class="relative flex flex-col w-full max-h-[var(--rg-edit-list-max-h)] overflow-y-auto outline-none no-scrollbar"
      onPointerMove={menu.handleListPointerMove}
    >
      <div
        ref={menu.highlightRef}
        aria-hidden="true"
        class="pointer-events-none absolute opacity-0 transition-[top,left,width,height,opacity,border-radius] duration-75 ease-out bg-[var(--rg-surface-hover)]"
      />
      <Index each={props.properties}>
        {(property, propertyIndex) => {
          const isActive = () => propertyIndex === props.activeIndex;
          const hover = menu.rowHoverHandlers(propertyIndex);
          return (
            <button
              ref={(element) => {
                menu.registerItem(propertyIndex, element);
                onCleanup(() => menu.registerItem(propertyIndex, undefined));
              }}
              data-react-grab-ignore-events
              data-react-grab-edit-property={property().key}
              aria-current={isActive() ? "true" : undefined}
              type="button"
              role="menuitem"
              tabindex={-1}
              class="relative z-1 contain-layout block w-full h-[24px] px-0 py-0 cursor-pointer text-left border-none bg-transparent"
              onPointerEnter={hover.onPointerEnter}
              onPointerMove={hover.onPointerMove}
              onPointerLeave={hover.onPointerLeave}
              onMouseDown={menu.handleRowMouseDown}
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
                            {getEnumDisplayValue(enumProp())}
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
