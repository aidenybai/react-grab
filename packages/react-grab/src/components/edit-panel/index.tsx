import {
  createEffect,
  createMemo,
  createSignal,
  Match,
  on,
  onCleanup,
  onMount,
  Show,
  Switch,
  type Component,
} from "solid-js";
import {
  DROPDOWN_EDGE_TRANSFORM_ORIGIN,
  EDIT_PANEL_ACTIVE_KEY_FLASH_MS,
  EDIT_PANEL_ADJUSTING_IDLE_MS,
  EDIT_PANEL_MAX_WIDTH_PX,
  EDIT_PANEL_MIN_WIDTH_PX,
  EDIT_PROPERTY_LIST_MAX_HEIGHT_PX,
  TAILWIND_SPACING_UNIT_PX,
  Z_INDEX_OVERLAY,
} from "../../constants.js";
import type {
  DropdownAnchor,
  EditableProperty,
  EditPanelState,
} from "../../types.js";
import { clampToRange } from "../../utils/clamp-to-range.js";
import { cn } from "../../utils/cn.js";
import { createAnchoredDropdown } from "../../utils/create-anchored-dropdown.js";
import { expandAggregateLonghands } from "../../utils/expand-aggregate-longhands.js";
import { cleanNumericValue, formatEditableValue } from "../../utils/format-css-value.js";
import { formatSessionEditsPrompt } from "../../utils/format-edit-prompt.js";
import { getTagDisplay } from "../../utils/get-tag-display.js";
import { tailwindPrefixToProperty } from "../../utils/tailwind-class-map.js";
import { registerOverlayDismiss } from "../../utils/register-overlay-dismiss.js";
import { suppressMenuEvent } from "../../utils/suppress-menu-event.js";
import { TagBadge } from "../selection-label/tag-badge.js";
import { ColorPicker } from "./color-picker.js";
import { HIDDEN_FOCUS_PRESERVING_STYLE } from "./constants.js";
import { CycleControl } from "./cycle-control.js";
import { asColor, asEnum, asNumeric } from "./narrow-property.js";
import { createPreviewStyles } from "./preview-styles.js";
import { PropertyList } from "./property-list.js";
import { stepProperty } from "./step-property.js";
import { createTweakStore } from "./tweak-store.js";
import { ValueStepper } from "./value-stepper.js";

interface EditPanelProps {
  state: EditPanelState | null;
  position: DropdownAnchor | null;
  onDismiss: () => void;
  onSubmit: (prompt: string) => void;
  onInteractingChange?: (interacting: boolean) => void;
}

// Thin wrapper that uses keyed <Show> so every signal/effect in the body
// is torn down and rebuilt when the panel opens on a different element
// (or after a dismiss → re-open cycle). No manual state-reset bookkeeping
// in the body, no stale closures, no leaked timers.
export const EditPanel: Component<EditPanelProps> = (props) => (
  <Show keyed when={props.state}>
    {(state) => (
      <EditPanelBody
        state={state}
        position={() => props.position}
        onDismiss={props.onDismiss}
        onSubmit={props.onSubmit}
        onInteractingChange={props.onInteractingChange}
      />
    )}
  </Show>
);

interface EditPanelBodyProps {
  state: EditPanelState;
  position: () => DropdownAnchor | null;
  onDismiss: () => void;
  onSubmit: (prompt: string) => void;
  onInteractingChange?: (interacting: boolean) => void;
}

const EditPanelBody: Component<EditPanelBodyProps> = (props) => {
  const initialElement = props.state.element;
  const initialProperties = props.state.properties;

  let searchInputRef: HTMLTextAreaElement | undefined;
  const preview = createPreviewStyles(initialElement);

  const [searchQuery, setSearchQuery] = createSignal(props.state.initialSearchQuery ?? "");
  const [activeIndex, setActiveIndex] = createSignal(0);
  const [activeKey, setActiveKey] = createSignal<"left" | "right" | null>(null);
  const tweakStore = createTweakStore({ initialProperties, searchQuery });
  // Compact mode: shows just the value stepper (no TagBadge, no search,
  // no list). Driven directly by user action rather than derived from
  // search content:
  //   - Stepper commit (Left/Right) or click-to-type commit → setIsCompact(true)
  //   - Navigate (Up/Down/Tab) or type in search → setIsCompact(false)
  // Auto-applied Tailwind classes (typed in search) intentionally don't
  // flip the layout — the user is still searching, just with side-effect
  // value application.
  const [isCompact, setIsCompact] = createSignal(false);

  let activeKeyTimerId: ReturnType<typeof setTimeout> | undefined;
  let interactingIdleTimerId: ReturnType<typeof setTimeout> | undefined;
  // Transient: true for EDIT_PANEL_ADJUSTING_IDLE_MS after the user's
  // last touch on a control. The composed `isInteracting` accessor
  // OR-s this with hasPendingTweaks so the page-level selection overlay
  // stays hidden across the full edit lifecycle (transient action OR
  // any committed tweak) without the timer needing to encode latch
  // logic itself.
  const [isTransientInteraction, setIsTransientInteraction] = createSignal(false);
  const isInteracting = createMemo(
    () => isTransientInteraction() || tweakStore.hasPendingTweaks(),
  );

  const tagDisplay = createMemo(() =>
    getTagDisplay({
      tagName: props.state.tagName,
      componentName: props.state.componentName,
    }),
  );

  const filteredProperties = tweakStore.filteredProperties;

  const activeProperty = createMemo<EditableProperty | null>(() => {
    const properties = filteredProperties();
    if (properties.length === 0) return null;
    const index = Math.min(Math.max(0, activeIndex()), properties.length - 1);
    return properties[index];
  });

  let containerRef: HTMLDivElement | undefined;

  const dropdown = createAnchoredDropdown(() => containerRef, props.position);

  const flashActiveKey = (direction: "left" | "right") => {
    setActiveKey(direction);
    clearTimeout(activeKeyTimerId);
    activeKeyTimerId = setTimeout(() => {
      setActiveKey((current) => (current === direction ? null : current));
    }, EDIT_PANEL_ACTIVE_KEY_FLASH_MS);
  };

  // Fires the transient "user just touched a control" pulse. Kept
  // dumb: the panel's `isInteracting` accessor composes this with the
  // store's hasPendingTweaks so the page-level overlay stays hidden
  // for the full session without this timer encoding latch logic.
  const markAsInteracting = () => {
    setIsTransientInteraction(true);
    clearTimeout(interactingIdleTimerId);
    interactingIdleTimerId = setTimeout(
      () => setIsTransientInteraction(false),
      EDIT_PANEL_ADJUSTING_IDLE_MS,
    );
  };

  // Bridge the composed isInteracting signal to the parent overlay
  // controller via the prop callback.
  createEffect(() => props.onInteractingChange?.(isInteracting()));

  const ensureSearchFocused = () => {
    queueMicrotask(() => {
      const active = searchInputRef?.ownerDocument.activeElement;
      if (active !== searchInputRef) searchInputRef?.focus({ preventScroll: true });
    });
  };

  interface CommitOptions {
    flash?: 1 | -1;
    focus?: boolean;
    compact?: boolean;
  }

  // Canonical write path for every committed tweak (keyboard step,
  // typed value, drag, colour pick, enum cycle, tailwind auto-apply).
  // The store owns kind-tagged storage; preview owns inline styles;
  // markAsInteracting owns the overlay-hide pulse. Callers only choose
  // which optional side-effects fire (flash an arrow, refocus search,
  // collapse to compact).
  const commit = (
    property: EditableProperty,
    nextValue: number | string,
    options: CommitOptions = {},
  ) => {
    tweakStore.applyTweak(property, nextValue);
    preview.apply(property.cssProperties, formatEditableValue(property, nextValue));
    markAsInteracting();
    if (options.flash) flashActiveKey(options.flash === 1 ? "right" : "left");
    if (options.focus) ensureSearchFocused();
    if (options.compact) setIsCompact(true);
  };

  const commitTweak = (direction: 1 | -1, shift: boolean): EditableProperty | null => {
    const property = activeProperty();
    if (!property) return null;
    const next = stepProperty(property, direction, shift);
    if (next === null) return null;
    commit(property, next, { flash: direction, focus: true });
    return property;
  };

  const stepFromKeyboard = (direction: 1 | -1, shift: boolean) => {
    if (commitTweak(direction, shift)) setIsCompact(true);
  };

  const stepFromPointer = (direction: 1 | -1) => {
    commitTweak(direction, false);
  };

  const commitNumericValue = (rawValue: number) => {
    const property = activeProperty();
    if (!property || property.kind !== "numeric") return;
    const next = cleanNumericValue(clampToRange(rawValue, property.min, property.max));
    if (next === property.value) return;
    commit(property, next);
  };

  const commitColorValue = (hex: string) => {
    const property = activeProperty();
    if (!property || property.kind !== "color") return;
    if (hex.toLowerCase() === property.value.toLowerCase()) return;
    commit(property, hex);
  };

  const commitEnumValue = (value: string) => {
    const property = activeProperty();
    if (!property || property.kind !== "enum") return;
    if (value === property.value) return;
    commit(property, value);
  };

  // Auto-apply when the search query is a complete `<prefix>-<n>` Tailwind
  // class. `p-64` immediately writes 256px to padding (no Enter needed),
  // `opacity-50` writes 50%. Skips arbitrary values (`p-[10px]`) and the
  // named scales (`text-xs`, `rounded-full`) — those don't map 1:1 to a
  // numeric multiplier.
  const TAILWIND_CLASS_PATTERN = /^([a-z-]+)-(-?\d+(?:\.\d+)?)$/;
  // Whether a tailwind cssKey resolves to at least one trackable
  // numeric row in initialProperties (either as the exact key or
  // through aggregate-longhand expansion). Auto-apply both gates
  // compact-intent and the value commit on this — typing a class for
  // a property the panel can't edit shouldn't shrink the UI around
  // an empty target.
  const hasTrackableTarget = (cssKey: string): boolean => {
    if (initialProperties.some((entry) => entry.key === cssKey && entry.kind === "numeric")) {
      return true;
    }
    const longhands = expandAggregateLonghands(cssKey);
    return initialProperties.some(
      (entry) => longhands.includes(entry.key) && entry.kind === "numeric",
    );
  };

  const tryApplyTailwindClass = (query: string) => {
    // Strip trailing partial value (digit or hanging dash) so `mt`,
    // `mt-`, `mt-4` all distill down to the prefix `mt`. If that prefix
    // maps to an editable property AND that property is actually
    // trackable, signal user intent to target it → collapse to compact
    // so the stepper is visible and ready, even before any value is
    // applied.
    const intentPrefix = query.replace(/-\d*$/, "").replace(/-$/, "");
    const intentCssKey = intentPrefix ? tailwindPrefixToProperty(intentPrefix) : null;
    if (intentCssKey && hasTrackableTarget(intentCssKey)) {
      setIsCompact(true);
    }
    const match = query.match(TAILWIND_CLASS_PATTERN);
    if (!match) return;
    const cssKey = tailwindPrefixToProperty(match[1]);
    if (!cssKey) return;
    const rawNumber = Number.parseFloat(match[2]);
    if (!Number.isFinite(rawNumber)) return;
    // opacity-50 (0–100 percent, our UI scale matches) and border-N
    // (literal pixels per Tailwind spec) both use the raw number as-is.
    // Everything else follows the 4px spacing unit.
    const usesLiteralNumber = cssKey === "opacity" || cssKey === "border-width";
    const candidate = usesLiteralNumber ? rawNumber : rawNumber * TAILWIND_SPACING_UNIT_PX;

    // First try: the prefix maps to an exact aggregate row (e.g. `p` →
    // canonical "padding" when all sides are uniform). Tailwind numeric
    // classes only target numeric properties — colour classes resolve
    // to canonical hex via a different code path (none yet).
    const exact = initialProperties.find(
      (entry) => entry.key === cssKey && entry.kind === "numeric",
    );
    if (exact && exact.kind === "numeric") {
      const next = cleanNumericValue(clampToRange(candidate, exact.min, exact.max));
      commit(exact, next, { compact: true });
      return;
    }

    // Fallback: the canonical aggregate isn't in the list (e.g. element
    // has non-uniform padding, so "padding" was filtered out). Commit
    // to every individual side row whose longhand is covered, so the
    // store reflects the change AND the preview spans all real sides
    // (expandAggregateLonghands handles both comma-joined partial
    // aggregates and top-level aggregates → 4 sides).
    const longhands = expandAggregateLonghands(cssKey);
    const sideProperties = initialProperties.filter(
      (entry) => longhands.includes(entry.key) && entry.kind === "numeric",
    );
    if (sideProperties.length === 0) return;
    for (const side of sideProperties) {
      if (side.kind !== "numeric") continue;
      const next = cleanNumericValue(clampToRange(candidate, side.min, side.max));
      commit(side, next, { compact: true });
    }
  };

  const handleSubmit = () => {
    const pendingEdits = tweakStore.buildPendingEdits();
    const entry = {
      filePath: props.state.filePath ?? "",
      lineNumber: props.state.lineNumber ?? 0,
      edits: pendingEdits,
    };
    props.onSubmit(formatSessionEditsPrompt(pendingEdits.length > 0 ? [entry] : []));
  };

  // Close paths (Escape, click-outside) just close — the inline preview
  // styles stay on the element via preview.forget() in onCleanup, so the
  // page keeps showing the user's tweaks until the agent updates the
  // source. No prompt fires, nothing persisted.
  const dismissPreservingTweaks = () => {
    props.onDismiss();
  };

  const navigateActive = (direction: 1 | -1) => {
    const properties = filteredProperties();
    if (properties.length === 0) return;
    setActiveIndex((current) => (current + direction + properties.length) % properties.length);
    // Navigating the list (Up/Down/Tab) needs the list to be visible —
    // re-expand back to full mode. Next adjust (Left/Right) flips it
    // back to compact via setIsCompact(true) in commitTweak.
    setIsCompact(false);
  };

  // Color rows register a trigger fn on mount so Enter on a colour
  // active row opens the native picker instead of submitting the panel.
  // Cleared on unmount so we never accidentally call into a stale ref.
  let colorPickerTrigger: (() => void) | null = null;
  const registerColorPickerTrigger = (trigger: (() => void) | null) => {
    colorPickerTrigger = trigger;
  };

  const keyHandlers: Record<string, (event: KeyboardEvent) => void> = {
    ArrowUp: () => navigateActive(-1),
    ArrowDown: () => navigateActive(1),
    ArrowLeft: (event) => stepFromKeyboard(-1, event.shiftKey),
    ArrowRight: (event) => stepFromKeyboard(1, event.shiftKey),
    Tab: (event) => navigateActive(event.shiftKey ? -1 : 1),
    Enter: () => {
      // Colour rows: first Enter opens the native picker (pick-affordance);
      // once a tweak is committed for this row, fall through to submit
      // like every other kind so the diff gets copied without an extra
      // Escape-and-re-Enter round trip.
      const property = activeProperty();
      const isUntweakedColor =
        property?.kind === "color" && !tweakStore.hasTweakFor(property.key);
      if (isUntweakedColor && colorPickerTrigger) {
        colorPickerTrigger();
        return;
      }
      handleSubmit();
    },
    Escape: () => dismissPreservingTweaks(),
  };

  const handleSearchKeyDown = (event: KeyboardEvent) => {
    if (event.isComposing) return;
    const handler = keyHandlers[event.key];
    if (!handler) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    handler(event);
  };

  // Keep the active row in sync with the filtered list — collapse on empty,
  // clamp when the list shrinks beneath the previous index.
  createEffect(
    on(filteredProperties, (properties) => {
      if (properties.length === 0) {
        setActiveIndex(-1);
        return;
      }
      if (activeIndex() < 0 || activeIndex() >= properties.length) {
        setActiveIndex(0);
      }
    }),
  );


  onMount(() => {
    queueMicrotask(() => {
      searchInputRef?.focus({ preventScroll: true });
      // Move cursor to end so the next keystroke from the user appends
      // to the seeded query (type-to-edit flow), not overwrites.
      if (searchInputRef) {
        const length = searchInputRef.value.length;
        searchInputRef.setSelectionRange(length, length);
      }
    });
    dropdown.measure();
    // If seeded with a tailwind prefix (e.g. user typed `m` while
    // hovering in selection mode), run the same auto-apply pipeline
    // that onInput uses so compact mode + value application kicks in.
    const seed = searchQuery();
    if (seed) tryApplyTailwindClass(seed);

    const unregisterDismiss = registerOverlayDismiss({
      isOpen: () => true,
      onDismiss: dismissPreservingTweaks,
      shouldIgnoreRightClick: true,
      // Escape inside our own inputs (search textarea, click-to-type value
      // editor) is owned by those inputs (commit/cancel), not the panel
      // dismissal path. The panel's own window-level handler still routes
      // Escape-from-search to dismissPreservingTweaks.
      shouldIgnoreInputEvents: true,
    });

    // Window-level keydown so arrow/Enter/Esc work regardless of where
    // focus actually lives — in compact mode the search textarea is
    // hidden 0×0 and some browsers blur it, which would otherwise strand
    // the keyboard handler. The textarea's own onKeyDown still fires too,
    // but stopImmediatePropagation there prevents double-processing.
    //
    // The HTMLInputElement check carves out the click-to-type value
    // editor — while its input owns focus, Enter/Esc are owned by the
    // editor (commit/cancel), not by the panel (submit/dismiss).
    // The panel renders inside a Shadow DOM, so events bubbling out get
    // retargeted to the shadow host. `event.target` outside the shadow
    // is the host DIV (never an HTMLInputElement), which is why we read
    // the real original target from `composedPath()[0]`.
    const handleWindowKeyDown = (event: KeyboardEvent) => {
      const originalTarget = event.composedPath()[0];
      if (originalTarget instanceof HTMLInputElement) return;
      handleSearchKeyDown(event);
    };
    window.addEventListener("keydown", handleWindowKeyDown, { capture: true });

    onCleanup(() => {
      unregisterDismiss();
      window.removeEventListener("keydown", handleWindowKeyDown, { capture: true });
      clearTimeout(activeKeyTimerId);
      clearTimeout(interactingIdleTimerId);
      dropdown.clearAnimationHandles();
      // The reactive bridge stops firing on unmount, so explicitly
      // tell the parent the overlay can come back. Safe to call even
      // when we weren't interacting — the parent's setter is idempotent.
      setIsTransientInteraction(false);
      props.onInteractingChange?.(false);
      // All dismissal paths preserve the user's tweaks (req: Escape does
      // not reset state). Inline styles stay applied; the page shows the
      // tweaked values until the source is updated.
      preview.forget();
    });
  });

  const handleSelectProperty = (index: number) => {
    setActiveIndex(index);
    ensureSearchFocused();
  };

  return (
    <Show when={dropdown.shouldMount()}>
      <div
        ref={containerRef}
        data-react-grab-ignore-events
        data-react-grab-edit-panel
        data-rg-compact={isCompact() ? "true" : "false"}
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
          "pointer-events": dropdown.isAnimatedIn() ? "auto" : "none",
          "transform-origin": DROPDOWN_EDGE_TRANSFORM_ORIGIN[dropdown.lastAnchorEdge()],
          opacity: dropdown.isAnimatedIn() ? "1" : "0",
          transform: dropdown.isAnimatedIn() ? "scale(1)" : "scale(0.92)",
          "--rg-edit-list-max-h": `${EDIT_PROPERTY_LIST_MAX_HEIGHT_PX}px`,
        }}
        onPointerDown={suppressMenuEvent}
        onMouseDown={suppressMenuEvent}
        onClick={suppressMenuEvent}
        onContextMenu={suppressMenuEvent}
      >
        <div
          class="contain-layout flex flex-col justify-center items-start rounded-[14px] overflow-hidden antialiased w-fit h-fit [font-synthesis:none] [corner-shape:superellipse(1.25)] bg-[var(--rg-panel-bg)]"
          style={{
            "min-width": isCompact() ? undefined : `${EDIT_PANEL_MIN_WIDTH_PX}px`,
            "max-width": `${EDIT_PANEL_MAX_WIDTH_PX}px`,
          }}
        >
          {/* TagBadge: full mode only — once the user starts editing, the
              element name is implicit (they just clicked it) and gets in
              the way of the value-focused compact layout. */}
          <Show when={!isCompact()}>
            <div class="contain-layout shrink-0 flex items-center gap-1 pt-1.5 pb-1 w-fit h-fit px-2">
              <TagBadge
                tagName={tagDisplay().tagName}
                componentName={tagDisplay().componentName}
                isClickable={false}
                onClick={() => {}}
                shrink
                forceShowIcon={false}
              />
            </div>
          </Show>

          {/* Search input. Always mounted (owns focus). Hidden when
              compact AND empty — typing into it would re-show it via
              setIsCompact(false) in onInput. When compact but the user
              already typed something, keeps showing so they can see
              what they typed. */}
          <div
            class={
              isCompact() && searchQuery() === ""
                ? ""
                : "[font-synthesis:none] contain-layout shrink-0 flex flex-col items-start px-2 py-1.5 w-full self-stretch [border-top-width:0.5px] border-t-solid border-t-[var(--rg-border-subtle)] antialiased"
            }
            style={isCompact() && searchQuery() === "" ? HIDDEN_FOCUS_PRESERVING_STYLE : undefined}
          >
            <textarea
              ref={(element) => {
                searchInputRef = element;
                queueMicrotask(() => element.focus({ preventScroll: true }));
              }}
              data-react-grab-ignore-events
              data-react-grab-input
              aria-label="Search properties"
              aria-keyshortcuts="Enter Escape ArrowUp ArrowDown ArrowLeft ArrowRight Tab"
              class="text-[var(--rg-text-primary)] text-[13px] leading-4 font-medium bg-transparent border-none resize-none w-full p-0 m-0 outline-none"
              style={{
                "field-sizing": "content",
                "min-height": "16px",
                "max-height": "16px",
                "scrollbar-width": "none",
              }}
              value={searchQuery()}
              onInput={(event) => {
                const next = event.currentTarget.value;
                setSearchQuery(next);
                setActiveIndex(0);
                setIsCompact(false);
                tryApplyTailwindClass(next);
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search property"
              rows={1}
            />
          </div>

          {/* Property list. Always mounted (so e2e tests + the active
              row's value can be queried even in compact). Hidden in
              compact via HIDDEN_FOCUS_PRESERVING_STYLE. */}
          <Show when={filteredProperties().length > 0}>
            <div
              class={
                isCompact()
                  ? ""
                  : "[font-synthesis:none] contain-layout shrink-0 flex flex-col items-start w-full self-stretch antialiased"
              }
              style={isCompact() ? HIDDEN_FOCUS_PRESERVING_STYLE : undefined}
            >
              <PropertyList
                properties={filteredProperties()}
                activeIndex={activeIndex()}
                activeKey={activeKey()}
                onHoverIndex={setActiveIndex}
                onSelect={handleSelectProperty}
                onStep={stepFromPointer}
                onCommitValue={commitNumericValue}
                onCommitColor={commitColorValue}
                onCommitEnum={commitEnumValue}
                onColorPickerRegister={registerColorPickerTrigger}
                onEditComplete={ensureSearchFocused}
                onInteract={markAsInteracting}
                isInteracting={isInteracting}
              />
            </div>
          </Show>

          {/* Compact-mode dropdown — mirrors the comment plugin's
              prompt-mode UX: focused value editor + circular submit
              button (rendered inside ValueStepper via onSubmit). */}
          <Show when={isCompact() && activeProperty()}>
            {(activeProp) => (
              <div
                class="flex items-center justify-center w-full px-3 py-1.5 min-h-[28px]"
                onMouseDown={(event) => event.preventDefault()}
              >
                {/* Non-keyed Switch matches keep the underlying control
                    mounted while the value updates — native color
                    pickers / slider pointer captures need element
                    persistence across re-renders. */}
                {/* Compact ColorPicker intentionally omits
                    onRegisterTrigger — the list view's instance is the
                    canonical registrant (it stays mounted while compact
                    is on, just hidden). Registering here would race the
                    list's trigger to null on compact unmount and break
                    the Enter→picker shortcut. */}
                <Switch>
                  <Match when={activeProp().kind === "numeric"}>
                    <ValueStepper
                      value={asNumeric(activeProp()).value}
                      min={asNumeric(activeProp()).min}
                      max={asNumeric(activeProp()).max}
                      unit={asNumeric(activeProp()).unit}
                      activeKey={activeKey()}
                      onStep={stepFromPointer}
                      onCommitValue={commitNumericValue}
                      onEditComplete={ensureSearchFocused}
                      onInteract={markAsInteracting}
                      emphasized
                    />
                  </Match>
                  <Match when={activeProp().kind === "color"}>
                    <ColorPicker
                      value={asColor(activeProp()).value}
                      onCommit={commitColorValue}
                      onEditComplete={ensureSearchFocused}
                      onInteract={markAsInteracting}
                      emphasized
                    />
                  </Match>
                  <Match when={activeProp().kind === "enum"}>
                    <CycleControl
                      value={asEnum(activeProp()).value}
                      options={asEnum(activeProp()).options}
                      activeKey={activeKey()}
                      onCommit={commitEnumValue}
                      emphasized
                    />
                  </Match>
                </Switch>
              </div>
            )}
          </Show>
        </div>
      </div>
    </Show>
  );
};
