import { createMemo, createSignal, onCleanup, onMount, Show, type Component } from "solid-js";
import {
  DROPDOWN_EDGE_TRANSFORM_ORIGIN,
  EDIT_PANEL_ACTIVE_KEY_FLASH_MS,
  EDIT_SHIFT_STEP_MULTIPLIER,
  EDIT_SLIDER_SPRING_EASING,
  EDIT_VALUE_BUMP_MS,
  EDIT_VALUE_BUMP_PX,
  TIME_MACHINE_PANEL_MAX_WIDTH_PX,
  TIME_MACHINE_PANEL_MIN_WIDTH_PX,
  Z_INDEX_OVERLAY,
} from "../../constants.js";
import type {
  DropdownAnchor,
  TimeMachinePanelState,
  TimeMachineTimelineEntry,
} from "../../types.js";
import { cn } from "../../utils/cn.js";
import { createAnchoredDropdown } from "../../utils/create-anchored-dropdown.js";
import { formatRelativeTime } from "../../utils/format-relative-time.js";
import { getTagDisplay } from "../../utils/get-tag-display.js";
import { isEventFromOverlay } from "../../utils/is-event-from-overlay.js";
import { isKeyboardEventTriggeredByInput } from "../../utils/is-keyboard-event-triggered-by-input.js";
import { nativeClearTimeout, nativeSetTimeout } from "../../utils/native-timers.js";
import { registerOverlayDismiss } from "../../utils/register-overlay-dismiss.js";
import { suppressMenuEvent } from "../../utils/suppress-menu-event.js";
import { createModifierTracker } from "../../utils/modifier-tracker.js";
import { createStepController } from "../edit-panel/step-controller.js";
import { ValueStepper } from "../edit-panel/value-stepper.js";
import { TagBadge } from "../selection-label/tag-badge.js";
import { Surface } from "../ui/surface.js";
import { TimeMachineTimeline } from "./timeline.js";

interface TimeMachinePanelProps {
  state: TimeMachinePanelState | null;
  position: DropdownAnchor | null;
  entries: TimeMachineTimelineEntry[];
  cursor: number;
  onTravel: (cursor: number) => void;
  onDismiss: () => void;
}

export const TimeMachinePanel: Component<TimeMachinePanelProps> = (props) => (
  <Show keyed when={props.state}>
    {(state) => (
      <TimeMachinePanelBody
        state={state}
        position={() => props.position}
        entries={() => props.entries}
        cursor={() => props.cursor}
        onTravel={props.onTravel}
        onDismiss={props.onDismiss}
      />
    )}
  </Show>
);

interface TimeMachinePanelBodyProps {
  state: TimeMachinePanelState;
  position: () => DropdownAnchor | null;
  entries: () => TimeMachineTimelineEntry[];
  cursor: () => number;
  onTravel: (cursor: number) => void;
  onDismiss: () => void;
}

const TimeMachinePanelBody: Component<TimeMachinePanelBodyProps> = (props) => {
  let containerRef: HTMLDivElement | undefined;
  let activeKeyTimerId: number | undefined;

  const [activeKey, setActiveKey] = createSignal<"left" | "right" | null>(null);
  const dropdown = createAnchoredDropdown(() => containerRef, props.position);

  const totalEntries = () => props.entries().length;

  const tagDisplay = createMemo(() =>
    getTagDisplay({
      tagName: props.state.tagName,
      componentName: props.state.componentName,
    }),
  );

  const currentEntry = createMemo<TimeMachineTimelineEntry | null>(() => {
    const cursor = props.cursor();
    if (cursor === 0) return null;
    return props.entries()[cursor - 1] ?? null;
  });

  const positionLabel = () => {
    if (totalEntries() === 0) return "No changes yet";
    return currentEntry()?.componentName ?? "Start";
  };

  const clockLabel = () => {
    if (props.cursor() >= totalEntries()) return "Now";
    const entry = currentEntry();
    if (!entry) return "Start";
    return formatRelativeTime(entry.timestamp);
  };

  // Native timer: the flash must clear while the time machine's page-clock
  // freeze suspends the page's own scheduling.
  const flashActiveKey = (direction: "left" | "right") => {
    setActiveKey(direction);
    nativeClearTimeout(activeKeyTimerId);
    activeKeyTimerId = nativeSetTimeout(() => {
      setActiveKey((currentKey) => (currentKey === direction ? null : currentKey));
    }, EDIT_PANEL_ACTIVE_KEY_FLASH_MS);
  };

  const travelBy = (direction: 1 | -1, shiftHeld: boolean) => {
    const stepSize = shiftHeld ? EDIT_SHIFT_STEP_MULTIPLIER : 1;
    props.onTravel(props.cursor() + direction * stepSize);
    flashActiveKey(direction === 1 ? "right" : "left");
  };

  const stepFromKeyboard = (direction: 1 | -1, shiftHeld: boolean) => {
    travelBy(direction, shiftHeld);
  };

  const stepFromPointer = (direction: 1 | -1) => {
    travelBy(direction, false);
  };

  const isShiftHeld = createModifierTracker((event) => event.shiftKey);
  const isAltHeld = createModifierTracker((event) => event.altKey);
  const stepController = createStepController({ step: stepFromKeyboard, isShiftHeld, isAltHeld });

  const playShake = () => {
    if (!containerRef) return;
    const surface = containerRef.firstElementChild;
    if (!(surface instanceof HTMLElement)) return;
    surface.classList.remove("animate-shake");
    // Force reflow so re-adding the class restarts the animation.
    void surface.offsetWidth;
    surface.classList.add("animate-shake");
  };

  onMount(() => {
    dropdown.measure();

    const unregisterDismiss = registerOverlayDismiss({
      isOpen: () => true,
      onDismiss: (source) => {
        // Opened from the toolbar (no element), the panel is a persistent
        // utility over a live app: clicking the page interacts with it (and
        // records new history) instead of dismissing. Escape or the toolbar
        // button close it.
        if (source === "pointer" && !props.state.element) return;
        stepController.cancelRepeat();
        props.onDismiss();
      },
      shouldIgnoreRightClick: true,
      shouldIgnoreInputEvents: true,
    });

    const handleWindowKeyDown = (event: KeyboardEvent) => {
      if (isEventFromOverlay(event, "data-react-grab-input")) return;
      if (isKeyboardEventTriggeredByInput(event)) return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        event.stopImmediatePropagation();
        stepController.pressArrow(event.key, event.repeat, event.shiftKey, event.altKey);
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        event.stopImmediatePropagation();
        stepController.cancelRepeat();
        props.onDismiss();
      }
    };
    const handleWindowKeyUp = (event: KeyboardEvent) => {
      stepController.releaseKey(event.key);
    };
    window.addEventListener("keydown", handleWindowKeyDown, { capture: true });
    window.addEventListener("keyup", handleWindowKeyUp, { capture: true });

    onCleanup(() => {
      unregisterDismiss();
      window.removeEventListener("keydown", handleWindowKeyDown, { capture: true });
      window.removeEventListener("keyup", handleWindowKeyUp, { capture: true });
      nativeClearTimeout(activeKeyTimerId);
      dropdown.clearAnimationHandles();
    });
  });

  return (
    <Show when={dropdown.shouldMount()}>
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Time machine"
        data-react-grab-ignore-events
        data-react-grab-time-machine-panel
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
            "min-width": `${TIME_MACHINE_PANEL_MIN_WIDTH_PX}px`,
            "max-width": `${TIME_MACHINE_PANEL_MAX_WIDTH_PX}px`,
            transform: `translateX(${stepController.heldDirection() * EDIT_VALUE_BUMP_PX}px)`,
            transition: `transform ${EDIT_VALUE_BUMP_MS}ms ${EDIT_SLIDER_SPRING_EASING}`,
          }}
        >
          <div class="contain-layout shrink-0 flex items-center justify-between gap-1 pt-1.5 pb-1 px-2 w-full self-stretch">
            <Show
              when={props.state.element}
              fallback={
                <span class="text-[13px] leading-4 font-medium text-[var(--rg-text-primary)]">
                  Time Machine
                </span>
              }
            >
              <TagBadge
                tagName={tagDisplay().tagName}
                componentName={tagDisplay().componentName}
                isClickable={false}
                onClick={() => {}}
                shrink
              />
            </Show>
            <span
              data-react-grab-time-machine-clock
              class="text-[11px] leading-4 text-[var(--rg-text-secondary)] tabular-nums whitespace-nowrap"
            >
              {clockLabel()}
            </span>
          </div>
          <Show when={totalEntries() > 0}>
            <TimeMachineTimeline
              entries={props.entries()}
              cursor={props.cursor()}
              onTravel={props.onTravel}
            />
          </Show>
          <div
            class="flex items-center justify-center w-full px-2 py-1.5 min-h-[28px] [border-top-width:0.5px] border-t-solid border-t-[var(--rg-border-subtle)]"
            onMouseDown={(event) => event.preventDefault()}
          >
            <ValueStepper
              label={positionLabel()}
              value={props.cursor()}
              min={0}
              max={totalEntries()}
              unit={`/${totalEntries()}`}
              activeKey={activeKey()}
              onStep={stepFromPointer}
              onCommitValue={(value) => props.onTravel(value)}
              onInvalidCommit={playShake}
              emphasized
            />
          </div>
        </Surface>
      </div>
    </Show>
  );
};
