import { Show, For } from "solid-js";
import type { Component } from "solid-js";
import type { InspectPropertiesState } from "../../types.js";
import { BottomSection } from "./bottom-section.js";
import { RenderTimelineBar } from "./render-timeline-bar.js";

interface ElementPropertiesPanelProps {
  state: InspectPropertiesState;
}

const PropertyRow: Component<{ label: string; value: string }> = (props) => (
  <div class="flex items-center justify-between gap-3 min-w-0">
    <span class="text-[12px] leading-4 text-black/50 shrink-0">{props.label}</span>
    <span class="text-[12px] leading-4 text-black font-medium truncate min-w-0 text-right">
      {props.value || "\u2014"}
    </span>
  </div>
);

const SectionDivider: Component = () => (
  <div class="mt-0.5 pt-0.5 [border-top-width:0.5px] border-t-solid border-t-[#D9D9D9]" />
);

export const ElementPropertiesPanel: Component<ElementPropertiesPanelProps> = (props) => {
  const hasTimeline = () => Boolean(props.state.timeline?.commits.length);
  const hasTopSection = () => Boolean(props.state.source) || hasTimeline();

  return (
    <BottomSection>
      <div
        class="flex flex-col w-full max-w-[280px] gap-0.5 cursor-text select-text"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <Show when={props.state.source}>
          <span class="text-[12px] leading-4 text-black/40">{props.state.source}</span>
        </Show>

        <Show when={props.state.timeline}>
          {(timeline) => <RenderTimelineBar timeline={timeline()} />}
        </Show>

        <Show when={hasTopSection() && props.state.reactProps.length > 0}>
          <SectionDivider />
        </Show>

        <For each={props.state.reactProps}>
          {(propertyRow) => (
            <PropertyRow label={propertyRow.label} value={propertyRow.value} />
          )}
        </For>

        <Show when={props.state.hooks.length > 0}>
          <SectionDivider />
          <For each={props.state.hooks}>
            {(hookRow) => <PropertyRow label={hookRow.label} value={hookRow.value} />}
          </For>
        </Show>
      </div>
    </BottomSection>
  );
};
