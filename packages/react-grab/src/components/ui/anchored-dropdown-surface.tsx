import { onCleanup, onMount, Show, type Component, type JSX } from "solid-js";
import type { DropdownAnchor } from "../../types.js";
import { DROPDOWN_EDGE_TRANSFORM_ORIGIN, Z_INDEX_OVERLAY } from "../../constants.js";
import { cn } from "../../utils/cn.js";
import { suppressMenuEvent } from "../../utils/suppress-menu-event.js";
import { createAnchoredDropdown } from "../../utils/create-anchored-dropdown.js";
import { registerOverlayDismiss } from "../../utils/register-overlay-dismiss.js";

interface AnchoredDropdownSurfaceProps {
  position: DropdownAnchor | null;
  // Test/debug hook applied as a bare attribute on the positioned container
  // (e.g. "data-react-grab-toolbar-menu").
  dataAttribute: string;
  // When provided, the surface dismisses on outside click / Escape.
  onDismiss?: () => void;
  // When false the surface is display-only (pointer-events: none): it never
  // captures clicks, so page selection works through it. Defaults to true.
  interactive?: boolean;
  children: JSX.Element;
}

// Shared chrome for toolbar-anchored dropdowns: the mount/measure lifecycle,
// the spring/exit animation, viewport-clamped positioning, and the
// pointer-event suppression that keeps clicks inside the dropdown from leaking
// to the page. Consumers supply only their panel contents.
export const AnchoredDropdownSurface: Component<AnchoredDropdownSurfaceProps> = (props) => {
  let containerRef: HTMLDivElement | undefined;

  const isInteractive = () => props.interactive !== false;

  const dropdown = createAnchoredDropdown(
    () => containerRef,
    () => props.position,
  );

  onMount(() => {
    dropdown.measure();
    const unregisterOverlayDismiss = props.onDismiss
      ? registerOverlayDismiss({
          isOpen: () => Boolean(props.position),
          onDismiss: props.onDismiss,
        })
      : undefined;

    onCleanup(() => {
      dropdown.clearAnimationHandles();
      unregisterOverlayDismiss?.();
    });
  });

  return (
    <Show when={dropdown.shouldMount()}>
      <div
        ref={containerRef}
        data-react-grab-ignore-events
        {...{ [props.dataAttribute]: "" }}
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
        onPointerDown={suppressMenuEvent}
        onMouseDown={suppressMenuEvent}
        onClick={suppressMenuEvent}
        onContextMenu={suppressMenuEvent}
      >
        {props.children}
      </div>
    </Show>
  );
};
