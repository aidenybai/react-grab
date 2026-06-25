import { onCleanup, onMount, Show, type Component, type JSX } from "solid-js";
import type { DropdownAnchor } from "../../types.js";
import { DROPDOWN_EDGE_TRANSFORM_ORIGIN, Z_INDEX_OVERLAY } from "../../constants.js";
import { cn } from "../../utils/cn.js";
import { createAnchoredDropdown } from "../../utils/create-anchored-dropdown.js";
import { suppressMenuEvent } from "../../utils/suppress-menu-event.js";

interface AnchoredDropdownPanelProps {
  position: DropdownAnchor | null;
  // Data attribute used by callers/tests to find the panel (e.g. the toolbar menu).
  dataAttr: string;
  // Interactive panels accept pointer input and swallow menu events; passive
  // ones (e.g. the "Copied" toast) stay pointer-events:none.
  interactive?: boolean;
  children: JSX.Element;
}

// The shared shell for toolbar-anchored dropdowns (toolbar menu, draw
// Copy/Cancel menu, "Copied" toast): edge-aware positioning + enter/exit
// animation. Callers provide only the panel contents.
export const AnchoredDropdownPanel: Component<AnchoredDropdownPanelProps> = (props) => {
  let containerRef: HTMLDivElement | undefined;
  const dropdown = createAnchoredDropdown(
    () => containerRef,
    () => props.position,
  );

  const isInteractive = () => props.interactive === true;

  onMount(() => {
    dropdown.measure();
    onCleanup(() => dropdown.clearAnimationHandles());
  });

  return (
    <Show when={dropdown.shouldMount()}>
      <div
        ref={containerRef}
        data-react-grab-ignore-events
        {...{ [props.dataAttr]: "" }}
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
          "pointer-events": isInteractive() && dropdown.isAnimatedIn() ? "auto" : "none",
          "transform-origin": DROPDOWN_EDGE_TRANSFORM_ORIGIN[dropdown.lastAnchorEdge()],
          opacity: dropdown.isAnimatedIn() ? "1" : "0",
          transform: dropdown.isAnimatedIn() ? "scale(1)" : "scale(0.92)",
        }}
        onPointerDown={isInteractive() ? suppressMenuEvent : undefined}
        onMouseDown={isInteractive() ? suppressMenuEvent : undefined}
        onClick={isInteractive() ? suppressMenuEvent : undefined}
        onContextMenu={isInteractive() ? suppressMenuEvent : undefined}
      >
        {props.children}
      </div>
    </Show>
  );
};
