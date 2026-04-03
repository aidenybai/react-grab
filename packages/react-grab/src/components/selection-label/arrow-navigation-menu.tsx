import { Show, For, createEffect } from "solid-js";
import type { Component } from "solid-js";
import type { ArrowNavigationItem } from "../../types.js";
import { createMenuHighlight } from "../../utils/create-menu-highlight.js";
import { BottomSection } from "./bottom-section.js";

interface ArrowNavigationMenuProps {
  items: ArrowNavigationItem[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

export const ArrowNavigationMenu: Component<ArrowNavigationMenuProps> = (
  props,
) => {
  const {
    containerRef: highlightContainerRef,
    highlightRef,
    updateHighlight,
    clearHighlight,
  } = createMenuHighlight();

  let menuItemsRef: HTMLDivElement | undefined;
  let didPointerMove = false;

  const getMenuItemByIndex = (
    itemIndex: number,
  ): HTMLButtonElement | undefined => {
    if (!menuItemsRef) return undefined;
    const activeMenuButton = menuItemsRef.querySelector<HTMLButtonElement>(
      `[data-react-grab-arrow-nav-index="${itemIndex}"]`,
    );
    return activeMenuButton ?? undefined;
  };

  // When items change we reset pointer tracking so that keyboard-driven
  // active index changes are not overridden by phantom pointerenter events
  // fired when the highlight element repositions under the cursor.
  createEffect(() => {
    void props.items;
    didPointerMove = false;
  });

  createEffect(() => {
    const activeMenuItem = getMenuItemByIndex(props.activeIndex);
    if (activeMenuItem) {
      updateHighlight(activeMenuItem);
    }
  });

  return (
    <BottomSection>
      <div
        ref={(element) => {
          menuItemsRef = element;
          highlightContainerRef(element);
        }}
        class="relative flex flex-col w-[calc(100%+16px)] -mx-2 -my-1.5"
        onPointerMove={() => {
          didPointerMove = true;
        }}
      >
        <div
          ref={highlightRef}
          class="pointer-events-none absolute bg-black/5 opacity-0 transition-[top,left,width,height,opacity] duration-75 ease-out"
        />
        <For each={props.items}>
          {(item, itemIndex) => (
            <button
              data-react-grab-ignore-events
              data-react-grab-arrow-nav-item={item.tagName}
              data-react-grab-arrow-nav-index={itemIndex()}
              class="relative z-1 contain-layout flex items-center w-full px-2 py-1 cursor-pointer text-left border-none bg-transparent"
              onPointerDown={(event) => event.stopPropagation()}
              onPointerEnter={(event) => {
                updateHighlight(event.currentTarget);
                if (didPointerMove) {
                  props.onSelect(itemIndex());
                }
              }}
              onPointerLeave={() => {
                const activeMenuItem = getMenuItemByIndex(props.activeIndex);
                if (activeMenuItem) {
                  updateHighlight(activeMenuItem);
                } else {
                  clearHighlight();
                }
              }}
              onClick={(event) => {
                event.stopPropagation();
                props.onSelect(itemIndex());
              }}
            >
              <span
                class="text-[13px] leading-4 h-fit font-medium overflow-hidden text-ellipsis whitespace-nowrap min-w-0 transition-colors"
                classList={{
                  "text-black": itemIndex() === props.activeIndex,
                  "text-black/30": itemIndex() !== props.activeIndex,
                }}
              >
                <Show when={item.componentName}>
                  {item.componentName}
                  <span class="text-black/40">.</span>
                </Show>
                {item.tagName}
              </span>
            </button>
          )}
        </For>
      </div>
    </BottomSection>
  );
};
