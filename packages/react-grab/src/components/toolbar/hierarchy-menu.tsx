import { createEffect, For, Show, type Component } from "solid-js";
import type { ArrowNavigationState, DropdownAnchor } from "../../types.js";
import {
  HIERARCHY_INDENT_PX,
  HIERARCHY_MENU_MIN_WIDTH_PX,
  MENU_HIGHLIGHT_CORNER_SHAPE,
  MENU_PANEL_CORNER_RADIUS_PX,
} from "../../constants.js";
import { Menu, createMenuStore } from "../menu/index.js";
import { AnchoredDropdownSurface } from "../ui/anchored-dropdown-surface.js";

interface HierarchyMenuProps {
  position: DropdownAnchor | null;
  state?: ArrowNavigationState;
  onSelect?: (index: number) => void;
}

export const HierarchyMenu: Component<HierarchyMenuProps> = (props) => {
  const activeIndex = () => props.state?.activeIndex ?? 0;

  const menuStore = createMenuStore({
    keyboardNavigation: true,
    requirePointerMove: true,
    value: () => String(activeIndex()),
    onValueChange: (value) => {
      if (value !== null) props.onSelect?.(Number(value));
    },
    highlight: {
      topCornerRadiusPx: MENU_PANEL_CORNER_RADIUS_PX,
      bottomCornerRadiusPx: MENU_PANEL_CORNER_RADIUS_PX,
      cornerShape: MENU_HIGHLIGHT_CORNER_SHAPE,
    },
  });

  // The active row is driven by keyboard from the host; resetting the
  // pointer-move gate whenever the chain changes keeps a phantom
  // pointerenter (fired when the highlight repositions under a stationary
  // cursor) from hijacking that keyboard-driven selection.
  createEffect(() => {
    void props.state?.items;
    menuStore.resetPointerMove();
  });

  return (
    <AnchoredDropdownSurface
      position={props.position}
      dataAttribute="data-react-grab-hierarchy-menu"
    >
      <Menu.Panel
        class="overflow-hidden"
        style={{ "min-width": `${HIERARCHY_MENU_MIN_WIDTH_PX}px` }}
      >
        <Menu.Provider store={menuStore}>
          <Menu.List label="Navigate element hierarchy">
            <For each={props.state?.items ?? []}>
              {(item, itemIndex) => (
                <Menu.Item
                  value={String(itemIndex())}
                  role="menuitemradio"
                  checked={itemIndex() === activeIndex()}
                  onSelect={() => props.onSelect?.(itemIndex())}
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
                        "text-[var(--rg-text-primary)]": itemIndex() === activeIndex(),
                        "text-[var(--rg-text-secondary)]": itemIndex() !== activeIndex(),
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
      </Menu.Panel>
    </AnchoredDropdownSurface>
  );
};
