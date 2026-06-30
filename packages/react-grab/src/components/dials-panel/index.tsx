import {
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  Show,
  type Component,
} from "solid-js";
import {
  DIAL_PANEL_MAX_HEIGHT_PX,
  DIAL_PANEL_MAX_WIDTH_PX,
  DIAL_PANEL_MIN_WIDTH_PX,
  DROPDOWN_EDGE_TRANSFORM_ORIGIN,
  EDIT_PANEL_ACTIVE_KEY_FLASH_MS,
  Z_INDEX_OVERLAY,
} from "../../constants.js";
import type { DropdownAnchor, DialPanelRuntime, DialValue } from "../../types.js";
import { cn } from "../../utils/cn.js";
import { createAnchoredDropdown } from "../../utils/create-anchored-dropdown.js";
import { registerOverlayDismiss } from "../../utils/register-overlay-dismiss.js";
import { suppressMenuEvent } from "../../utils/suppress-menu-event.js";
import { Surface } from "../ui/surface.js";
import { DialRows } from "./controls-tree.js";
import { buildDialViewModel } from "./view-rows.js";

interface DialsPanelProps {
  panels: DialPanelRuntime[];
  position: DropdownAnchor | null;
  onCommit: (id: string, path: string, value: DialValue) => void;
  onTriggerAction: (id: string, path: string) => void;
  onInteract: () => void;
  onDismiss: () => void;
}

export const DialsPanel: Component<DialsPanelProps> = (props) => {
  let containerRef: HTMLDivElement | undefined;
  let activeKeyTimeout: ReturnType<typeof setTimeout> | undefined;
  const [collapsedOverrides, setCollapsedOverrides] = createSignal(new Map<string, boolean>());
  const [activeIndex, setActiveIndex] = createSignal(-1);
  const [activeKey, setActiveKey] = createSignal<"left" | "right" | null>(null);
  const [searchQuery, setSearchQuery] = createSignal("");

  const flashActiveKey = (key: "left" | "right") => {
    setActiveKey(key);
    clearTimeout(activeKeyTimeout);
    activeKeyTimeout = setTimeout(() => setActiveKey(null), EDIT_PANEL_ACTIVE_KEY_FLASH_MS);
  };

  const dropdown = createAnchoredDropdown(
    () => containerRef,
    () => props.position,
  );

  const getValue = (panelId: string, path: string): DialValue => {
    const panel = props.panels.find((candidate) => candidate.id === panelId);
    return panel ? panel.valuesByPath[path] : 0;
  };

  const isCollapsed = (key: string, defaultCollapsed: boolean): boolean => {
    const overrides = collapsedOverrides();
    return overrides.has(key) ? Boolean(overrides.get(key)) : defaultCollapsed;
  };

  const setCollapsed = (key: string, collapsed: boolean) => {
    setCollapsedOverrides((previous) => {
      const next = new Map(previous);
      next.set(key, collapsed);
      return next;
    });
  };

  const viewModel = createMemo(() =>
    buildDialViewModel(
      props.panels,
      {
        getValue,
        commit: props.onCommit,
        triggerAction: props.onTriggerAction,
        isCollapsed,
        setCollapsed,
      },
      searchQuery(),
    ),
  );

  createEffect(() => {
    const count = viewModel().navEntries.length;
    setActiveIndex((previous) => (previous >= count ? count - 1 : previous));
  });

  const handleKeyDown = (event: KeyboardEvent) => {
    const entries = viewModel().navEntries;
    if (entries.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      event.stopPropagation();
      setActiveIndex((previous) => (previous < 0 ? 0 : Math.min(previous + 1, entries.length - 1)));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      event.stopPropagation();
      setActiveIndex((previous) => (previous < 0 ? entries.length - 1 : Math.max(previous - 1, 0)));
      return;
    }
    const activeEntry = entries[activeIndex()];
    if (!activeEntry) return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      event.stopPropagation();
      flashActiveKey("right");
      activeEntry.adjust(1, event.shiftKey);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      event.stopPropagation();
      flashActiveKey("left");
      activeEntry.adjust(-1, event.shiftKey);
    } else if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      activeEntry.activate();
    }
  };

  const handlePointerDown = (event: PointerEvent) => {
    suppressMenuEvent(event);
    const target = event.target;
    if (target instanceof HTMLElement && target.closest("input, textarea")) return;
    containerRef?.focus({ preventScroll: true });
  };

  let isPanelEngaged = false;

  const isWithinPanel = (event: Event): boolean => {
    const target = event.composedPath()[0];
    return target instanceof Node && Boolean(containerRef?.contains(target));
  };

  onMount(() => {
    dropdown.measure();
    // Keyboard navigation is gated on engagement (a click inside the panel)
    // rather than DOM focus, since clicks land on inner tabindex=-1 controls
    // and focus tracking across the shadow boundary is unreliable.
    const handleWindowPointerDown = (event: PointerEvent) => {
      isPanelEngaged = isWithinPanel(event);
    };
    const handleWindowKeyDown = (event: KeyboardEvent) => {
      if (!isPanelEngaged) return;
      const target = event.composedPath()[0];
      if (target instanceof HTMLElement && target.closest("input, textarea")) return;
      handleKeyDown(event);
    };
    window.addEventListener("pointerdown", handleWindowPointerDown, { capture: true });
    window.addEventListener("keydown", handleWindowKeyDown, { capture: true });
    const unregisterDismiss = registerOverlayDismiss({
      isOpen: () => Boolean(props.position),
      onDismiss: props.onDismiss,
      shouldIgnoreRightClick: true,
      shouldIgnoreInputEvents: true,
    });
    onCleanup(() => {
      window.removeEventListener("pointerdown", handleWindowPointerDown, { capture: true });
      window.removeEventListener("keydown", handleWindowKeyDown, { capture: true });
      dropdown.clearAnimationHandles();
      unregisterDismiss();
      clearTimeout(activeKeyTimeout);
    });
  });

  return (
    <Show when={dropdown.shouldMount()}>
      <div
        ref={containerRef}
        role="dialog"
        aria-label="React Grab dials"
        data-react-grab-ignore-events
        data-react-grab-dials-panel
        tabindex={0}
        class={cn(
          "fixed font-sans text-[13px] antialiased outline-none [filter:var(--rg-drop-shadow)] select-none",
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
        onPointerDown={handlePointerDown}
        onMouseDown={suppressMenuEvent}
        onClick={suppressMenuEvent}
        onContextMenu={suppressMenuEvent}
      >
        <Surface
          class="flex flex-col overflow-hidden w-fit py-1.5"
          style={{
            "min-width": `${DIAL_PANEL_MIN_WIDTH_PX}px`,
            "max-width": `${DIAL_PANEL_MAX_WIDTH_PX}px`,
            "max-height": `${DIAL_PANEL_MAX_HEIGHT_PX}px`,
          }}
        >
          <div class="shrink-0 px-2 pb-1.5 mb-1 [border-bottom-width:0.5px] border-solid border-[var(--rg-border-subtle)]">
            <input
              type="text"
              data-react-grab-ignore-events
              data-react-grab-input
              aria-label="Search dials"
              autocapitalize="none"
              autocorrect="off"
              autocomplete="off"
              spellcheck={false}
              class="w-full p-0 m-0 bg-transparent border-none outline-none text-[var(--rg-text-primary)] placeholder:text-[var(--rg-text-secondary)] text-[13px] leading-4 font-medium"
              value={searchQuery()}
              onInput={(event) => {
                setSearchQuery(event.currentTarget.value);
                setActiveIndex(-1);
              }}
              placeholder="Search"
            />
          </div>
          <DialRows
            rows={viewModel().rows}
            activeIndex={activeIndex()}
            activeKey={activeKey()}
            getValue={getValue}
            onToggleFolder={(navIndex) => viewModel().navEntries[navIndex]?.activate()}
            onActivate={setActiveIndex}
            onCommit={props.onCommit}
            onTriggerAction={props.onTriggerAction}
            onInteract={props.onInteract}
          />
        </Surface>
      </div>
    </Show>
  );
};
