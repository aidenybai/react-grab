import { createEffect, For, Show, type Component } from "solid-js";
import type { ArrowNavigationItem } from "../../types.js";
import {
  HIERARCHY_INDENT_PX,
  MENU_HIGHLIGHT_CORNER_SHAPE,
  MENU_PANEL_CORNER_RADIUS_PX,
} from "../../constants.js";
import { Menu, createMenuStore } from "../menu/index.js";
import { BottomSection } from "./bottom-section.js";

interface ArrowNavigationMenuProps {
  items: ArrowNavigationItem[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

export const ArrowNavigationMenu: Component<ArrowNavigationMenuProps> = (props) => {
  const menuStore = createMenuStore({
    keyboardNavigation: true,
    requirePointerMove: true,
    value: () => String(props.activeIndex),
    onValueChange: (value) => {
      if (value !== null) props.onSelect(Number(value));
    },
    highlight: {
      bottomCornerRadiusPx: MENU_PANEL_CORNER_RADIUS_PX,
      cornerShape: MENU_HIGHLIGHT_CORNER_SHAPE,
    },
  });

  // The active row is driven by keyboard from the host; resetting the
  // pointer-move gate whenever the chain changes keeps a phantom
  // pointerenter (fired when the highlight repositions under a stationary
  // cursor) from hijacking that keyboard-driven selection.
  createEffect(() => {
    void props.items;
    menuStore.resetPointerMove();
  });

  return (
    <BottomSection>
      <Menu.Provider store={menuStore}>
        <Menu.List label="Navigate element hierarchy" class="w-[calc(100%+16px)] -mx-2 -my-1.5">
          <For each={props.items}>
            {(item, itemIndex) => (
              <Menu.Item
                value={String(itemIndex())}
                role="menuitemradio"
                checked={itemIndex() === props.activeIndex}
                onSelect={() => props.onSelect(itemIndex())}
              >
                <span class="flex items-center min-w-0 w-full">
                  <Show when={item.depth > 0}>
                    <span
                      aria-hidden="true"
                      class="shrink-0 font-mono text-[11px] leading-4 text-[var(--rg-text-secondary)] opacity-60 mr-1"
                      style={{ "padding-left": `${(item.depth - 1) * HIERARCHY_INDENT_PX}px` }}
                    >
                      {item.isLast ? "└─" : "├─"}
                    </span>
                  </Show>
                  <span
                    class="text-[13px] leading-4 h-fit font-medium overflow-hidden text-ellipsis whitespace-nowrap min-w-0 transition-colors"
                    classList={{
                      "text-[var(--rg-text-primary)]": itemIndex() === props.activeIndex,
                      "text-[var(--rg-text-secondary)]": itemIndex() !== props.activeIndex,
                    }}
                  >
                    <Show when={item.componentName}>
                      {item.componentName}
                      <span class="text-[var(--rg-text-secondary)]">.</span>
                    </Show>
                    {item.tagName}
                  </span>
                </span>
              </Menu.Item>
            )}
          </For>
        </Menu.List>
      </Menu.Provider>
    </BottomSection>
  );
};
