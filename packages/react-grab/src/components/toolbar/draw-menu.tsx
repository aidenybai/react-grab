import { For, type Component } from "solid-js";
import type { DropdownAnchor } from "../../types.js";
import {
  MENU_HIGHLIGHT_CORNER_SHAPE,
  MENU_PANEL_CORNER_RADIUS_PX,
  TOOLBAR_MENU_MIN_WIDTH_PX,
} from "../../constants.js";
import { cn } from "../../utils/cn.js";
import { ShortcutHint } from "../shortcut-hint.js";
import { createMenuHighlight } from "../../utils/create-menu-highlight.js";
import { AnchoredDropdownPanel } from "./anchored-dropdown-panel.js";

interface DrawMenuProps {
  position: DropdownAnchor | null;
  onCopy: () => void;
  onCancel: () => void;
}

interface DrawMenuItem {
  label: string;
  shortcut: string;
  emphasis: boolean;
  run: () => void;
}

export const DrawMenu: Component<DrawMenuProps> = (props) => {
  const { containerRef, highlightRef, updateHighlight, clearHighlight } = createMenuHighlight({
    topCornerRadiusPx: MENU_PANEL_CORNER_RADIUS_PX,
    bottomCornerRadiusPx: MENU_PANEL_CORNER_RADIUS_PX,
    cornerShape: MENU_HIGHLIGHT_CORNER_SHAPE,
  });

  const items = (): DrawMenuItem[] => [
    { label: "Copy", shortcut: "Enter", emphasis: true, run: props.onCopy },
    { label: "Cancel", shortcut: "Esc", emphasis: false, run: props.onCancel },
  ];

  return (
    <AnchoredDropdownPanel
      position={props.position}
      dataAttr="data-react-grab-draw-menu"
      interactive
    >
      <div
        class="contain-layout flex flex-col rounded-[14px] antialiased w-fit h-fit overflow-hidden [font-synthesis:none] [corner-shape:superellipse(1.25)] bg-[var(--rg-panel-bg)]"
        style={{ "min-width": `${TOOLBAR_MENU_MIN_WIDTH_PX}px` }}
      >
        <div ref={containerRef} role="menu" class="relative flex flex-col">
          <div
            ref={highlightRef}
            aria-hidden="true"
            class="pointer-events-none absolute opacity-0 transition-[top,left,width,height,opacity,border-radius] duration-75 ease-out bg-[var(--rg-surface-hover)]"
          />
          <For each={items()}>
            {(item) => (
              <button
                data-react-grab-ignore-events
                type="button"
                role="menuitem"
                class="relative z-1 contain-layout flex items-center justify-between w-full px-2 py-1 cursor-pointer text-left border-none bg-transparent"
                onPointerDown={(event) => event.stopPropagation()}
                onPointerEnter={(event) => updateHighlight(event.currentTarget)}
                onPointerLeave={clearHighlight}
                onClick={(event) => {
                  event.stopPropagation();
                  item.run();
                }}
              >
                <span
                  class={cn(
                    "text-[13px] leading-4 font-sans font-medium",
                    item.emphasis
                      ? "text-[var(--rg-text-primary)]"
                      : "text-[var(--rg-text-secondary)]",
                  )}
                >
                  {item.label}
                </span>
                <ShortcutHint
                  shortcut={item.shortcut}
                  modifier={false}
                  class="text-[11px] font-sans text-[var(--rg-text-secondary)] ml-4"
                />
              </button>
            )}
          </For>
        </div>
      </div>
    </AnchoredDropdownPanel>
  );
};
