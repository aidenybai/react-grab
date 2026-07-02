import { createMemo, createSignal, For, Index, type Component, type JSX } from "solid-js";
import {
  TIME_MACHINE_TIMELINE_ACTIVE_DOT_SIZE_PX,
  TIME_MACHINE_TIMELINE_DOT_SIZE_PX,
  TIME_MACHINE_TIMELINE_HASH_MARK_COUNT,
  TIME_MACHINE_TIMELINE_LABEL_WIDTH_PX,
  TIME_MACHINE_TIMELINE_LANE_HEIGHT_PX,
  TIME_MACHINE_TIMELINE_MAX_TRACKS,
  TIME_MACHINE_TIMELINE_PLAYHEAD_WIDTH_PX,
} from "../../constants.js";
import type { TimeMachineTimelineEntry } from "../../types.js";

interface TimelineDot {
  cursorPosition: number;
  entryId: number;
  laneIndex: number;
}

interface TimelineLane {
  componentName: string;
  laneIndex: number;
}

interface TimeMachineTimelineProps {
  entries: TimeMachineTimelineEntry[];
  cursor: number;
  onTravel: (cursor: number) => void;
  onInteract?: () => void;
}

const HASH_MARK_PERCENTS = Array.from(
  { length: TIME_MACHINE_TIMELINE_HASH_MARK_COUNT },
  (_, hashMarkIndex) => ((hashMarkIndex + 1) * 100) / (TIME_MACHINE_TIMELINE_HASH_MARK_COUNT + 1),
);

// A component timeline in the spirit of transitions.dev's Refine ruler: one
// lane per component, its recorded changes as dots on a shared axis, and a
// draggable playhead. The axis is entry-index based (not wall clock) so a
// burst of changes doesn't collapse into an unscrubbable clump.
export const TimeMachineTimeline: Component<TimeMachineTimelineProps> = (props) => {
  let laneAreaRef: HTMLDivElement | undefined;
  const [isDragging, setIsDragging] = createSignal(false);

  const laneModel = createMemo<{ lanes: TimelineLane[]; dots: TimelineDot[] }>(() => {
    const laneIndexByComponentName = new Map<string, number>();
    const lanes: TimelineLane[] = [];
    const dots: TimelineDot[] = [];
    let overflowLaneIndex = -1;

    for (let entryIndex = 0; entryIndex < props.entries.length; entryIndex++) {
      const entry = props.entries[entryIndex];
      let laneIndex = laneIndexByComponentName.get(entry.componentName);
      if (laneIndex === undefined) {
        if (lanes.length < TIME_MACHINE_TIMELINE_MAX_TRACKS) {
          laneIndex = lanes.length;
          laneIndexByComponentName.set(entry.componentName, laneIndex);
          lanes.push({ componentName: entry.componentName, laneIndex });
        } else {
          // Components beyond the lane budget share a trailing overflow lane
          // so every change stays visible and scrubbable.
          if (overflowLaneIndex === -1) {
            overflowLaneIndex = lanes.length;
            lanes.push({ componentName: "…", laneIndex: overflowLaneIndex });
          }
          laneIndex = overflowLaneIndex;
        }
      }
      dots.push({ cursorPosition: entryIndex + 1, entryId: entry.id, laneIndex });
    }

    return { lanes, dots };
  });

  const positionPercent = (cursorPosition: number): number =>
    props.entries.length === 0 ? 0 : (cursorPosition / props.entries.length) * 100;

  const laneAreaHeightPx = () => laneModel().lanes.length * TIME_MACHINE_TIMELINE_LANE_HEIGHT_PX;

  const travelToClientX = (clientX: number) => {
    if (!laneAreaRef || props.entries.length === 0) return;
    const laneAreaRect = laneAreaRef.getBoundingClientRect();
    if (laneAreaRect.width <= 0) return;
    const ratio = Math.max(0, Math.min(1, (clientX - laneAreaRect.left) / laneAreaRect.width));
    props.onTravel(Math.round(ratio * props.entries.length));
  };

  const handlePointerDown: JSX.EventHandler<HTMLDivElement, PointerEvent> = (event) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
    props.onInteract?.();
    travelToClientX(event.clientX);
  };

  const handlePointerMove: JSX.EventHandler<HTMLDivElement, PointerEvent> = (event) => {
    if (!isDragging()) return;
    travelToClientX(event.clientX);
  };

  const releaseDrag: JSX.EventHandler<HTMLDivElement, PointerEvent> = (event) => {
    const target = event.currentTarget;
    if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
    setIsDragging(false);
  };

  return (
    <div
      data-react-grab-time-machine-timeline
      class="flex w-full px-2 py-1.5 [border-top-width:0.5px] border-t-solid border-t-[var(--rg-border-subtle)]"
    >
      <div
        class="flex flex-col shrink-0"
        style={{ width: `${TIME_MACHINE_TIMELINE_LABEL_WIDTH_PX}px` }}
      >
        <For each={laneModel().lanes}>
          {(lane) => (
            <span
              class="text-[10px] leading-3 text-[var(--rg-text-secondary)] truncate flex items-center pr-1.5"
              style={{ height: `${TIME_MACHINE_TIMELINE_LANE_HEIGHT_PX}px` }}
            >
              {lane.componentName}
            </span>
          )}
        </For>
      </div>
      <div
        ref={laneAreaRef}
        role="slider"
        aria-label="Timeline"
        aria-valuemin={0}
        aria-valuemax={props.entries.length}
        aria-valuenow={props.cursor}
        tabIndex={-1}
        class="relative flex-1 min-w-0"
        style={{
          height: `${laneAreaHeightPx()}px`,
          cursor: "ew-resize",
          "touch-action": "none",
          "user-select": "none",
          "-webkit-user-select": "none",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={releaseDrag}
        onPointerCancel={releaseDrag}
        onLostPointerCapture={releaseDrag}
      >
        <div
          aria-hidden="true"
          class="absolute inset-y-0 left-0 right-0 rounded-[4px] bg-[var(--rg-surface-active)] pointer-events-none"
          style={{ opacity: 0.35 }}
        />
        <Index each={HASH_MARK_PERCENTS}>
          {(percent) => (
            <div
              aria-hidden="true"
              class="absolute inset-y-0 w-px bg-[var(--rg-text-secondary)] pointer-events-none"
              style={{ left: `${percent()}%`, opacity: 0.15 }}
            />
          )}
        </Index>
        <For each={laneModel().dots}>
          {(dot) => {
            const isApplied = () => dot.cursorPosition <= props.cursor;
            const isAtPlayhead = () => dot.cursorPosition === props.cursor;
            const dotSizePx = () =>
              isAtPlayhead()
                ? TIME_MACHINE_TIMELINE_ACTIVE_DOT_SIZE_PX
                : TIME_MACHINE_TIMELINE_DOT_SIZE_PX;
            return (
              <div
                data-react-grab-timeline-dot={dot.entryId}
                class="absolute rounded-full pointer-events-none"
                style={{
                  left: `calc(${positionPercent(dot.cursorPosition)}% - ${dotSizePx() / 2}px)`,
                  top: `${
                    dot.laneIndex * TIME_MACHINE_TIMELINE_LANE_HEIGHT_PX +
                    (TIME_MACHINE_TIMELINE_LANE_HEIGHT_PX - dotSizePx()) / 2
                  }px`,
                  width: `${dotSizePx()}px`,
                  height: `${dotSizePx()}px`,
                  background: isApplied() ? "var(--rg-text-primary)" : "var(--rg-text-secondary)",
                  opacity: isApplied() ? 0.9 : 0.3,
                  transition:
                    "opacity 120ms ease, width 120ms ease, height 120ms ease, top 120ms ease, left 120ms ease",
                }}
              />
            );
          }}
        </For>
        <div
          data-react-grab-timeline-playhead
          aria-hidden="true"
          class="absolute rounded-[1px] bg-[var(--rg-text-primary)] pointer-events-none"
          style={{
            left: `calc(${positionPercent(props.cursor)}% - ${TIME_MACHINE_TIMELINE_PLAYHEAD_WIDTH_PX / 2}px)`,
            top: "-2px",
            bottom: "-2px",
            width: `${TIME_MACHINE_TIMELINE_PLAYHEAD_WIDTH_PX}px`,
            opacity: isDragging() ? 0.95 : 0.7,
            transition: isDragging() ? "none" : "left 80ms ease-out",
          }}
        />
      </div>
    </div>
  );
};
