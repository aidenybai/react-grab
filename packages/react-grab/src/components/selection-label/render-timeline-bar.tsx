import { For } from "solid-js";
import type { Component } from "solid-js";
import type { InspectTimelineData } from "../../types.js";
import {
  RENDER_DURATION_NEGLIGIBLE_MS,
  RENDER_DURATION_FAST_MS,
  RENDER_DURATION_SLOW_MS,
  TIMELINE_HEIGHT_PX,
  TIMELINE_BAR_WIDTH_PX,
  TIMELINE_BAR_MIN_HEIGHT_PX,
} from "../../constants.js";

interface RenderTimelineBarProps {
  timeline: InspectTimelineData;
}

const formatDuration = (milliseconds: number): string => {
  if (milliseconds < RENDER_DURATION_NEGLIGIBLE_MS) return "<0.1ms";
  if (milliseconds < 10) return `${milliseconds.toFixed(1)}ms`;
  return `${Math.round(milliseconds)}ms`;
};

const getBarColor = (duration: number): string => {
  if (duration < RENDER_DURATION_NEGLIGIBLE_MS) return "rgba(0,0,0,0.15)";
  if (duration <= RENDER_DURATION_FAST_MS) return "#34a853";
  if (duration <= RENDER_DURATION_SLOW_MS) return "#f9ab00";
  return "#ea4335";
};

export const RenderTimelineBar: Component<RenderTimelineBarProps> = (props) => {
  const renderCount = () => props.timeline.commits.length;
  const maxDuration = () =>
    Math.max(
      ...props.timeline.commits.map((renderCommit) => renderCommit.duration),
      RENDER_DURATION_NEGLIGIBLE_MS,
    );
  const totalDuration = () =>
    props.timeline.commits.reduce((sum, renderCommit) => sum + renderCommit.duration, 0);

  return (
    <div class="flex flex-col gap-1 min-w-0">
      <div
        class="flex items-end justify-end gap-px w-full rounded-[3px] bg-black/5 px-0.5 overflow-hidden"
        style={{ height: `${TIMELINE_HEIGHT_PX}px` }}
      >
        <For each={props.timeline.commits}>
          {(renderCommit) => {
            const barHeight = () => {
              const ratio = renderCommit.duration / maxDuration();
              return Math.max(ratio * (TIMELINE_HEIGHT_PX - 2), TIMELINE_BAR_MIN_HEIGHT_PX);
            };
            return (
              <div
                class="shrink-0 rounded-t-[1px]"
                style={{
                  width: `${TIMELINE_BAR_WIDTH_PX}px`,
                  height: `${barHeight()}px`,
                  "background-color": getBarColor(renderCommit.duration),
                }}
              />
            );
          }}
        </For>
      </div>
      <span class="text-[11px] leading-3 text-black/40 tabular-nums">
        {renderCount()} render{renderCount() !== 1 ? "s" : ""} ·{" "}
        {formatDuration(totalDuration())}
      </span>
    </div>
  );
};
