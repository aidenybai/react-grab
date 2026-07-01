import { createMemo, For, onCleanup, onMount, Show, type Accessor, type Component } from "solid-js";
import {
  DROPDOWN_EDGE_TRANSFORM_ORIGIN,
  HISTORY_PANEL_MAX_WIDTH_PX,
  HISTORY_PANEL_MIN_WIDTH_PX,
  Z_INDEX_OVERLAY,
} from "../../constants.js";
import type { DropdownAnchor, HistoryMoment, HistoryPanelState } from "../../types.js";
import { cn } from "../../utils/cn.js";
import { createAnchoredDropdown } from "../../utils/create-anchored-dropdown.js";
import { formatRelativeTime } from "../../utils/format-relative-time.js";
import { getTagDisplay } from "../../utils/get-tag-display.js";
import { isEventFromOverlay } from "../../utils/is-event-from-overlay.js";
import { registerOverlayDismiss } from "../../utils/register-overlay-dismiss.js";
import { suppressMenuEvent } from "../../utils/suppress-menu-event.js";
import { EditPanelCopyButton } from "../edit-panel/copy-button.js";
import { StepArrow } from "../edit-panel/step-arrow.js";
import { TagBadge } from "../selection-label/tag-badge.js";
import { Surface } from "../ui/surface.js";

interface HistoryPanelProps {
  state: HistoryPanelState | null;
  position: DropdownAnchor | null;
  onDismiss: () => void;
  onStep: (direction: 1 | -1) => void;
  onSubmit: () => void;
}

export const HistoryPanel: Component<HistoryPanelProps> = (props) => (
  <Show when={props.state}>
    {(state) => (
      <Show keyed when={state().element}>
        {(_element) => (
          <HistoryPanelBody
            state={state}
            position={() => props.position}
            onDismiss={props.onDismiss}
            onStep={props.onStep}
            onSubmit={props.onSubmit}
          />
        )}
      </Show>
    )}
  </Show>
);

interface HistoryPanelBodyProps {
  state: Accessor<HistoryPanelState>;
  position: () => DropdownAnchor | null;
  onDismiss: () => void;
  onStep: (direction: 1 | -1) => void;
  onSubmit: () => void;
}

const HistoryPanelBody: Component<HistoryPanelBodyProps> = (props) => {
  let containerRef: HTMLDivElement | undefined;
  const dropdown = createAnchoredDropdown(() => containerRef, props.position);

  const tagDisplay = createMemo(() =>
    getTagDisplay({
      tagName: props.state().tagName,
      componentName: props.state().componentName,
    }),
  );

  const moments = createMemo(() => props.state().moments);
  const hasMoments = createMemo(() => moments().length > 0);
  const currentMoment = createMemo<HistoryMoment | null>(() => {
    const list = moments();
    if (list.length === 0) return null;
    return list[props.state().cursor] ?? null;
  });
  const canStepBack = createMemo(() => props.state().cursor > 0);
  const canStepForward = createMemo(() => props.state().cursor < moments().length - 1);

  onMount(() => {
    dropdown.measure();

    const unregisterDismiss = registerOverlayDismiss({
      isOpen: () => true,
      onDismiss: props.onDismiss,
      shouldIgnoreRightClick: true,
    });

    const handleWindowKeyDown = (event: KeyboardEvent) => {
      if (isEventFromOverlay(event, "data-react-grab-input")) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        event.stopImmediatePropagation();
        props.onStep(-1);
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        event.stopImmediatePropagation();
        props.onStep(1);
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        event.stopImmediatePropagation();
        props.onSubmit();
      }
    };
    window.addEventListener("keydown", handleWindowKeyDown, { capture: true });

    onCleanup(() => {
      unregisterDismiss();
      window.removeEventListener("keydown", handleWindowKeyDown, { capture: true });
      dropdown.clearAnimationHandles();
    });
  });

  return (
    <Show when={dropdown.shouldMount()}>
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Component render history"
        data-react-grab-ignore-events
        data-react-grab-history-panel
        class={cn(
          "fixed font-sans text-[13px] antialiased [filter:var(--rg-drop-shadow)] select-none",
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
        <Surface
          class="flex flex-col justify-center items-start overflow-hidden w-fit h-fit"
          style={{
            "min-width": `${HISTORY_PANEL_MIN_WIDTH_PX}px`,
            "max-width": `${HISTORY_PANEL_MAX_WIDTH_PX}px`,
          }}
        >
          <div class="contain-layout shrink-0 flex items-center gap-1 pt-1.5 pb-1 h-fit px-2 w-full self-stretch justify-between">
            <TagBadge
              tagName={tagDisplay().tagName}
              componentName={tagDisplay().componentName}
              isClickable={false}
              onClick={() => {}}
              shrink
            />
            <Show when={hasMoments()}>
              <EditPanelCopyButton onCopy={props.onSubmit} />
            </Show>
          </div>

          <Show
            when={currentMoment()}
            fallback={
              <div class="flex items-center justify-center w-full px-3 py-2 [border-top-width:0.5px] border-t-solid border-t-[var(--rg-border-subtle)]">
                <span class="text-[var(--rg-text-secondary)] text-[12px] leading-4">
                  No renders recorded yet
                </span>
              </div>
            }
          >
            {(moment) => (
              <>
                <div class="contain-layout shrink-0 flex flex-col items-start gap-0.5 px-2 py-1.5 w-full self-stretch [border-top-width:0.5px] border-t-solid border-t-[var(--rg-border-subtle)]">
                  <Show
                    when={moment().changes.length > 0}
                    fallback={
                      <span class="text-[var(--rg-text-secondary)] text-[12px] leading-4">
                        Re-rendered (no tracked prop or state change)
                      </span>
                    }
                  >
                    <For each={moment().changes}>
                      {(change) => (
                        <div class="flex items-center gap-1.5 w-full min-w-0 tabular-nums">
                          <span class="text-[var(--rg-text-secondary)] text-[11px] leading-4 shrink-0">
                            {change.label}
                          </span>
                          <span class="text-[var(--rg-text-primary)] text-[12px] leading-4 truncate">
                            {change.prev}
                          </span>
                          <span class="text-[var(--rg-text-secondary)] text-[11px] leading-4 shrink-0">
                            →
                          </span>
                          <span class="text-[var(--rg-text-primary)] text-[12px] leading-4 truncate">
                            {change.next}
                          </span>
                        </div>
                      )}
                    </For>
                  </Show>
                </div>

                <div class="contain-layout shrink-0 flex items-center justify-between gap-2 px-2 py-1.5 w-full self-stretch [border-top-width:0.5px] border-t-solid border-t-[var(--rg-border-subtle)]">
                  <div
                    class="opacity-100 transition-opacity"
                    style={{ opacity: canStepBack() ? "1" : "0.3" }}
                  >
                    <StepArrow
                      direction="left"
                      active={false}
                      onPointerDown={() => props.onStep(-1)}
                    />
                  </div>
                  <span class="text-[var(--rg-text-secondary)] text-[11px] leading-4 tabular-nums">
                    {props.state().cursor + 1} / {moments().length}
                    <span class="mx-1">·</span>
                    {formatRelativeTime(moment().timestamp)}
                  </span>
                  <div
                    class="opacity-100 transition-opacity"
                    style={{ opacity: canStepForward() ? "1" : "0.3" }}
                  >
                    <StepArrow
                      direction="right"
                      active={false}
                      onPointerDown={() => props.onStep(1)}
                    />
                  </div>
                </div>
              </>
            )}
          </Show>
        </Surface>
      </div>
    </Show>
  );
};
