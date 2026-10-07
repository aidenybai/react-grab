import type { Component, JSX } from "solid-js";
import { cn } from "../../utils/cn.js";
import { useMenuStore } from "./menu-context.js";

interface MenuListProps {
  ref?: (element: HTMLDivElement) => void;
  class?: string;
  label?: string;
  children: JSX.Element;
}

export const MenuList: Component<MenuListProps> = (props) => {
  const store = useMenuStore();

  return (
    <div
      ref={(element) => {
        store.setHighlightContainer(element);
        props.ref?.(element);
      }}
      role="menu"
      aria-orientation="vertical"
      aria-label={props.label}
      aria-activedescendant={store.keyboardNavigation ? store.activeDescendantId() : undefined}
      tabindex={store.keyboardNavigation ? -1 : undefined}
      class={cn("relative flex flex-col", props.class)}
      onPointerMove={() => store.notePointerMove()}
    >
      <div
        ref={store.setHighlightRail}
        aria-hidden="true"
        class="pointer-events-none absolute opacity-0 transition-[top,left,width,height,opacity,border-radius] duration-75 ease-out bg-[var(--rg-surface-hover)]"
      />
      {props.children}
    </div>
  );
};
