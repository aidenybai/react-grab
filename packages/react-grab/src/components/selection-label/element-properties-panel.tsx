import { Show, For } from "solid-js";
import type { Component } from "solid-js";
import type {
  InspectPropertiesState,
  InspectPropertyRow,
} from "../../types.js";
import { BottomSection } from "./bottom-section.js";

interface ElementPropertiesPanelProps {
  state: InspectPropertiesState;
}

const ColorSwatch: Component<{ color: string }> = (props) => (
  <span
    class="inline-block size-[10px] shrink-0 rounded-[2px] border border-black/15 align-middle"
    style={{ "background-color": props.color }}
  />
);

const PropertyRow: Component<{
  label: string;
  value: string;
  colorHex?: string;
}> = (props) => (
  <div class="flex items-center justify-between gap-3 min-w-0">
    <span class="text-[12px] leading-4 text-black/50 shrink-0">
      {props.label}
    </span>
    <span class="text-[12px] leading-4 text-black font-medium break-all min-w-0 text-right flex items-center gap-1 justify-end">
      <Show when={props.colorHex}>
        <ColorSwatch color={props.colorHex!} />
      </Show>
      {props.value || "\u2014"}
    </span>
  </div>
);

const PropertyRows: Component<{ rows: InspectPropertyRow[] }> = (props) => (
  <For each={props.rows}>
    {(row) => (
      <PropertyRow
        label={row.label}
        value={row.value}
        colorHex={row.colorHex}
      />
    )}
  </For>
);

const SectionDivider: Component<{ label: string }> = (props) => (
  <div class="flex flex-col mt-1 pt-1 [border-top-width:0.5px] border-t-solid border-t-[#D9D9D9]">
    <span class="text-[10px] leading-3 font-semibold tracking-wider text-black/40 uppercase">
      {props.label}
    </span>
  </div>
);

const ContrastBadge: Component<{
  ratio: number;
  aa: boolean;
  aaa: boolean;
}> = (props) => (
  <div class="flex items-center gap-1.5 min-w-0">
    <span class="text-[12px] leading-4 text-black/50 shrink-0">Contrast</span>
    <span class="flex items-center gap-1 ml-auto">
      <span
        class="text-[11px] leading-none font-semibold px-1 py-0.5 rounded-[3px]"
        classList={{
          "bg-[#0f9d58]/15 text-[#0f9d58]": props.aa,
          "bg-[#db4437]/15 text-[#db4437]": !props.aa,
        }}
      >
        AA
      </span>
      <span class="text-[12px] leading-4 text-black font-medium tabular-nums">
        {props.ratio}
      </span>
      <Show when={props.aaa}>
        <span class="text-[11px] leading-none font-semibold px-1 py-0.5 rounded-[3px] bg-[#0f9d58]/15 text-[#0f9d58]">
          AAA
        </span>
      </Show>
    </span>
  </div>
);

const FocusableIndicator: Component<{ focusable: boolean }> = (props) => (
  <div class="flex items-center justify-between gap-3 min-w-0">
    <span class="text-[12px] leading-4 text-black/50 shrink-0">
      Keyboard-focusable
    </span>
    <Show
      when={props.focusable}
      fallback={
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          class="text-black/25 shrink-0"
        >
          <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5" />
          <line x1="4.5" y1="11.5" x2="11.5" y2="4.5" stroke="currentColor" stroke-width="1.5" />
        </svg>
      }
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
        class="text-[#0f9d58] shrink-0"
      >
        <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5" />
        <path
          d="M5 8.5L7 10.5L11 5.5"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </Show>
  </div>
);

export const ElementPropertiesPanel: Component<ElementPropertiesPanelProps> = (
  props,
) => (
  <BottomSection>
    <div
      class="flex flex-col w-full max-w-[280px] gap-0.5 cursor-text select-text"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div class="flex items-center justify-between gap-3 min-w-0">
        <span class="text-[12px] leading-4 text-black/50 shrink-0">Size</span>
        <span class="text-[12px] leading-4 text-black font-medium tabular-nums whitespace-nowrap">
          {Math.round(props.state.width)} × {Math.round(props.state.height)}
        </span>
      </div>

      <PropertyRows rows={props.state.properties} />

      <Show when={props.state.className}>
        <div class="flex items-start gap-1.5 min-w-0 mt-0.5">
          <span class="text-[12px] leading-4 text-black/50 shrink-0">
            class
          </span>
          <span class="text-[12px] leading-4 text-[#8B2BB9]/70 font-mono break-all min-w-0 line-clamp-3">
            {props.state.className}
          </span>
        </div>
      </Show>

      <Show when={props.state.reactProps.length > 0}>
        <SectionDivider label="Props" />
        <PropertyRows rows={props.state.reactProps} />
      </Show>

      <Show when={props.state.accessibility.length > 0}>
        <SectionDivider label="Accessibility" />
        <Show when={props.state.contrast}>
          {(contrastInfo) => (
            <ContrastBadge
              ratio={contrastInfo().ratio}
              aa={contrastInfo().aa}
              aaa={contrastInfo().aaa}
            />
          )}
        </Show>
        <For each={props.state.accessibility}>
          {(row) => (
            <Show
              when={row.label !== "Keyboard-focusable"}
              fallback={
                <FocusableIndicator focusable={row.value === "Yes"} />
              }
            >
              <PropertyRow label={row.label} value={row.value} />
            </Show>
          )}
        </For>
      </Show>
    </div>
  </BottomSection>
);
