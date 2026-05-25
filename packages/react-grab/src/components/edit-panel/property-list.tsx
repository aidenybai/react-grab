import { createEffect, Index, Match, onCleanup, Show, Switch, type Component } from "solid-js";
import type { EditableProperty } from "../../types.js";
import { createMenuHighlight } from "../../utils/create-menu-highlight.js";
import { formatDisplayValue } from "../../utils/format-css-value.js";
import { ColorPicker } from "./color-picker.js";
import { CycleControl } from "./cycle-control.js";
import { asColor, asEnum, asNumeric } from "./narrow-property.js";
import { ValueStepper } from "./value-stepper.js";

interface PropertyListProps {
  properties: EditableProperty[];
  activeIndex: number;
  onHoverIndex: (index: number) => void;
  onSelect: (index: number) => void;
  onStep: (direction: 1 | -1) => void;
  onCommitValue: (value: number) => void;
  onCommitColor: (hex: string) => void;
  onCommitEnum: (value: string) => void;
  onColorPickerRegister: (trigger: (() => void) | null) => void;
  onEditComplete: () => void;
  onInteract: () => void;
  // True while a gesture is mid-flight (slider drag, native picker
  // open, etc.). Hover-driven row swaps are suppressed during this
  // window so a mouse twitch can't yank the active row out from under
  // the user. Does NOT stay true for the lifetime of pending tweaks —
  // hover should still navigate the list once the gesture settles.
  isAdjusting: () => boolean;
  activeKey: "left" | "right" | null;
  // Token chip sourced from the panel and forwarded through to the
  // active row's ValueStepper.
  activeTailwindLabel: string | null;
}

export const PropertyList: Component<PropertyListProps> = (props) => {
  const itemElements: (HTMLButtonElement | undefined)[] = [];
  let listRef: HTMLDivElement | undefined;
  // Mount-time gate: a stationary cursor + the initial reflow can fire
  // phantom pointerenter on whatever row the mouse happens to be sitting
  // on, yanking the active row before the user has demonstrated intent
  // to use the mouse. Once any real pointer movement is observed, the
  // gate is permanently open for this panel mount.
  let didPointerMove = false;

  const {
    containerRef: highlightContainerRef,
    highlightRef,
    updateHighlight,
    clearHighlight,
    // No per-corner radii — the EditPanel's outer overflow:hidden +
    // rounded-[14px] superellipse already clips the highlight pill at
    // the panel's curve. Setting our own radii here makes the pill's
    // own corner curve compete with the panel's and visibly bulge past
    // the outline at first/last rows.
  } = createMenuHighlight({});

  createEffect(() => {
    itemElements.length = props.properties.length;
  });

  createEffect(() => {
    const element = itemElements[props.activeIndex];
    if (!element || props.activeIndex < 0) {
      clearHighlight();
      return;
    }
    // Two-pass update: first call snaps the highlight to the row's
    // current offsetWidth/Top (may be stale if the list just transitioned
    // from compact-hidden 0×0 to full-size — Solid effects can run
    // before the browser reflows the layout). Re-running on the next
    // animation frame captures the post-reflow dimensions, so the
    // highlight matches the row even when the user navigates back from
    // compact mode via arrow keys.
    updateHighlight(element);
    requestAnimationFrame(() => {
      const refreshed = itemElements[props.activeIndex];
      if (refreshed) updateHighlight(refreshed);
    });
    if (!listRef) return;
    const containerRect = listRef.getBoundingClientRect();
    const targetRect = element.getBoundingClientRect();
    if (targetRect.top < containerRect.top || targetRect.bottom > containerRect.bottom) {
      element.scrollIntoView({ block: "nearest" });
    }
  });

  return (
    <div
      ref={(element) => {
        listRef = element;
        highlightContainerRef(element);
      }}
      role="menu"
      aria-orientation="vertical"
      aria-label="Editable properties"
      class="relative flex flex-col w-full max-h-[var(--rg-edit-list-max-h)] overflow-y-auto outline-none no-scrollbar"
      onPointerMove={() => {
        didPointerMove = true;
      }}
    >
      <div
        ref={highlightRef}
        aria-hidden="true"
        class="pointer-events-none absolute opacity-0 transition-[top,left,width,height,opacity,border-radius] duration-75 ease-out bg-[var(--rg-surface-hover)]"
      />
      <Index each={props.properties}>
        {(property, propertyIndex) => {
          const isActive = () => propertyIndex === props.activeIndex;
          return (
            <button
              ref={(element) => {
                itemElements[propertyIndex] = element;
                onCleanup(() => {
                  if (itemElements[propertyIndex] === element) {
                    itemElements[propertyIndex] = undefined;
                  }
                });
              }}
              data-react-grab-ignore-events
              data-react-grab-edit-property={property().key}
              aria-current={isActive() ? "true" : undefined}
              type="button"
              role="menuitem"
              tabindex={-1}
              class="relative z-1 contain-layout block w-full px-0 py-0 cursor-pointer text-left border-none bg-transparent min-h-[24px]"
              onPointerEnter={() => {
                if (!didPointerMove) return;
                if (props.isAdjusting()) return;
                // The panel runs inside a Shadow DOM (mountRoot attaches a
                // shadow root on the overlay host). `document.activeElement`
                // returns the shadow HOST when focus is inside the shadow,
                // not the actual focused element — so we'd never see our
                // own value-edit input and would always change activeIndex
                // on hover, unmounting the user's in-progress edit. Read
                // the shadow root via getRootNode to find the real focused
                // element.
                const root = listRef?.getRootNode();
                const focused =
                  root instanceof ShadowRoot
                    ? (root.activeElement as HTMLElement | null)
                    : (document.activeElement as HTMLElement | null);
                if (focused?.matches("input[data-react-grab-input]")) return;
                props.onHoverIndex(propertyIndex);
              }}
              onMouseDown={(event) => {
                // Default focus on the clicked button would steal it from
                // EditPanel's search input and break arrow-key tweaking.
                event.preventDefault();
              }}
              onClick={(event) => {
                event.stopPropagation();
                props.onSelect(propertyIndex);
              }}
            >
              {/* Switch matches use boolean `when` (not `keyed`) so the
                  mounted control stays alive across value updates — the
                  native color picker dialog and the slider's pointer
                  capture both rely on the element instance persisting
                  while the value changes. Property data is read
                  reactively below via narrowing helper accessors. */}
              <Show
                when={isActive()}
                fallback={
                  <div class="flex items-center justify-between w-full px-2 py-1 gap-2 min-h-[24px]">
                    <span class="text-[13px] leading-4 font-sans font-medium text-[var(--rg-text-primary)] truncate min-w-0">
                      {property().label}
                    </span>
                    <Switch>
                      <Match when={property().kind === "numeric"}>
                        <span class="text-[11px] font-sans text-[var(--rg-text-secondary)] tabular-nums shrink-0">
                          {formatDisplayValue(asNumeric(property()).value)}
                          {asNumeric(property()).unit}
                        </span>
                      </Match>
                      <Match when={property().kind === "color"}>
                        <span
                          aria-hidden="true"
                          class="size-[12px] rounded-[3px] border-[var(--rg-border-button)] [border-width:0.5px] border-solid shrink-0"
                          style={{ "background-color": asColor(property()).value }}
                        />
                      </Match>
                      <Match when={property().kind === "enum"}>
                        <span class="text-[11px] font-sans text-[var(--rg-text-secondary)] shrink-0">
                          {asEnum(property()).value}
                        </span>
                      </Match>
                    </Switch>
                  </div>
                }
              >
                <Switch>
                  <Match when={property().kind === "numeric"}>
                    <ValueStepper
                      label={asNumeric(property()).label}
                      value={asNumeric(property()).value}
                      min={asNumeric(property()).min}
                      max={asNumeric(property()).max}
                      unit={asNumeric(property()).unit}
                      activeKey={props.activeKey}
                      onStep={props.onStep}
                      onCommitValue={props.onCommitValue}
                      onEditComplete={props.onEditComplete}
                      onInteract={props.onInteract}
                      tailwindLabel={props.activeTailwindLabel}
                    />
                  </Match>
                  <Match when={property().kind === "color"}>
                    <ColorPicker
                      label={asColor(property()).label}
                      value={asColor(property()).value}
                      onCommit={props.onCommitColor}
                      onEditComplete={props.onEditComplete}
                      onRegisterTrigger={props.onColorPickerRegister}
                      onInteract={props.onInteract}
                    />
                  </Match>
                  <Match when={property().kind === "enum"}>
                    <CycleControl
                      label={asEnum(property()).label}
                      value={asEnum(property()).value}
                      options={asEnum(property()).options}
                      activeKey={props.activeKey}
                      onCommit={props.onCommitEnum}
                    />
                  </Match>
                </Switch>
              </Show>
            </button>
          );
        }}
      </Index>
    </div>
  );
};
