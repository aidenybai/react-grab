import { For, onCleanup, onMount, Show, type Component } from "solid-js";
import type { ContextMenuAction, DropdownAnchor } from "../../types.js";
import {
  DROPDOWN_EDGE_TRANSFORM_ORIGIN,
  MENU_HIGHLIGHT_CORNER_SHAPE,
  MENU_PANEL_CORNER_RADIUS_PX,
  TOOLBAR_MENU_MIN_WIDTH_PX,
  Z_INDEX_OVERLAY,
} from "../../constants.js";
import { cn } from "../../utils/cn.js";
import { Menu, createMenuStore } from "../menu/index.js";
import { suppressMenuEvent } from "../../utils/suppress-menu-event.js";
import { createAnchoredDropdown } from "../../utils/create-anchored-dropdown.js";
import { registerOverlayDismiss } from "../../utils/register-overlay-dismiss.js";

interface ToolbarMenuProps {
  position: DropdownAnchor | null;
  actions: ContextMenuAction[];
  defaultActionId: string;
  onSetDefaultAction: (actionId: string) => void;
  onDismiss: () => void;
}

export const ToolbarMenu: Component<ToolbarMenuProps> = (props) => {
  let containerRef: HTMLDivElement | undefined;
  const menuStore = createMenuStore({
    clearActiveOnPointerLeave: true,
    highlight: {
      topCornerRadiusPx: MENU_PANEL_CORNER_RADIUS_PX,
      bottomCornerRadiusPx: MENU_PANEL_CORNER_RADIUS_PX,
      cornerShape: MENU_HIGHLIGHT_CORNER_SHAPE,
    },
  });

  const dropdown = createAnchoredDropdown(
    () => containerRef,
    () => props.position,
  );

  onMount(() => {
    dropdown.measure();
    const unregisterOverlayDismiss = registerOverlayDismiss({
      isOpen: () => Boolean(props.position),
      onDismiss: props.onDismiss,
    });

    onCleanup(() => {
      dropdown.clearAnimationHandles();
      unregisterOverlayDismiss();
    });
  });

  return (
    <Show when={dropdown.shouldMount()}>
      <div
        ref={containerRef}
        data-react-grab-ignore-events
        data-react-grab-toolbar-menu
        class={cn(
          "fixed font-sans text-[13px] antialiased [filter:var(--rg-drop-shadow)] select-none will-change-[opacity,transform]",
          dropdown.isAnimatedIn()
            ? "transition-[opacity,transform] duration-220 ease-spring"
            : "transition-[opacity,transform] duration-120 ease-drawer",
        )}
        style={{
          top: `${dropdown.displayPosition().top}px`,
          left: `${dropdown.displayPosition().left}px`,
          "z-index": `${Z_INDEX_OVERLAY}`,
          "pointer-events": dropdown.isAnimatedIn() ? "auto" : "none",
          "transform-origin": DROPDOWN_EDGE_TRANSFORM_ORIGIN[dropdown.lastAnchorEdge()],
          opacity: dropdown.isAnimatedIn() ? "1" : "0",
          transform: dropdown.isAnimatedIn() ? "scale(1)" : "scale(0.92)",
        }}
        onPointerDown={suppressMenuEvent}
        onMouseDown={suppressMenuEvent}
        onClick={suppressMenuEvent}
        onContextMenu={suppressMenuEvent}
      >
        <Menu.Panel
          class="overflow-hidden"
          style={{ "min-width": `${TOOLBAR_MENU_MIN_WIDTH_PX}px` }}
        >
          <Menu.Provider store={menuStore}>
            <Menu.List label="Default action">
              <For each={props.actions}>
                {(action) => {
                  const isDefault = () => action.id === props.defaultActionId;

                  return (
                    <Menu.Item
                      value={action.id}
                      role="menuitemradio"
                      checked={isDefault()}
                      onSelect={() => {
                        props.onSetDefaultAction(action.id);
                        props.onDismiss();
                      }}
                    >
                      <Menu.Label
                        class={
                          isDefault()
                            ? "text-[var(--rg-text-primary)]"
                            : "text-[var(--rg-text-secondary)]"
                        }
                      >
                        {action.label}
                      </Menu.Label>
                      <Show when={action.shortcut}>
                        {(shortcutKey) => (
                          <Menu.Shortcut
                            shortcut={shortcutKey()}
                            modifier={action.shortcutModifier}
                          />
                        )}
                      </Show>
                    </Menu.Item>
                  );
                }}
              </For>
            </Menu.List>
          </Menu.Provider>
        </Menu.Panel>
      </div>
    </Show>
  );
};
