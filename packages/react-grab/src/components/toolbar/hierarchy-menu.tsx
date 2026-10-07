import { For, Show, type Component } from "solid-js";
import type { HierarchyState, DropdownAnchor } from "../../types.js";
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
  state?: HierarchyState;
}

// Display-only tree of the current selection's DOM neighborhood. It is
// non-interactive (see AnchoredDropdownSurface interactive={false}); the active
// row is driven entirely by keyboard navigation in core via `state.activeIndex`,
// which feeds the menu store's controlled highlight.
export const HierarchyMenu: Component<HierarchyMenuProps> = (props) => {
  const activeIndex = () => props.state?.activeIndex ?? 0;

  const menuStore = createMenuStore({
    value: () => String(activeIndex()),
    highlight: {
      topCornerRadiusPx: MENU_PANEL_CORNER_RADIUS_PX,
      bottomCornerRadiusPx: MENU_PANEL_CORNER_RADIUS_PX,
      cornerShape: MENU_HIGHLIGHT_CORNER_SHAPE,
    },
  });

  return (
    <AnchoredDropdownSurface
      position={props.position}
      dataAttribute="data-react-grab-hierarchy-menu"
      interactive={false}
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
                >
                  <span class="flex items-center min-w-0 w-full">
                    <Show when={item.depth > 0}>
                      <span
                        aria-hidden="true"
                        class="shrink-0 font-mono text-[11px] leading-4 text-[var(--rg-text-secondary)] opacity-60 mr-1"
                        style={{ "padding-left": `${(item.depth - 1) * HIERARCHY_INDENT_PX}px` }}
                        textContent={item.isLast ? "└─" : "├─"}
                      />
                    </Show>
                    <span
                      class="text-[13px] leading-4 h-fit font-medium overflow-hidden text-ellipsis whitespace-nowrap min-w-0 transition-colors"
                      classList={{
                        "text-[var(--rg-text-primary)]": itemIndex() === activeIndex(),
                        "text-[var(--rg-text-secondary)]": itemIndex() !== activeIndex(),
                      }}
                    >
                      <Show when={item.componentName}>
                        <span textContent={item.componentName} />
                        <span class="text-[var(--rg-text-secondary)]">.</span>
                      </Show>
                      <span textContent={item.tagName} />
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
