import {
  createEffect,
  createMemo,
  createSignal,
  on,
  onCleanup,
  onMount,
  Show,
  type Component,
} from "solid-js";
import {
  EDIT_PANEL_ACTIVE_KEY_FLASH_MS,
  EDIT_PANEL_ADJUSTING_IDLE_MS,
  EDIT_PANEL_MAX_WIDTH_PX,
  EDIT_PANEL_MIN_WIDTH_PX,
  EDIT_PROPERTY_LIST_MAX_HEIGHT_PX,
  EDIT_SHIFT_STEP_MULTIPLIER,
  Z_INDEX_OVERLAY,
} from "../../constants.js";
import type { EditableProperty, EditPanelState, OverlayBounds } from "../../types.js";
import { clampToRange } from "../../utils/clamp-to-range.js";
import {
  clearPendingEdits,
  loadAllPendingEdits,
  loadPendingEdits,
  savePendingEdits,
  type PendingEdit,
} from "../../utils/edit-panel-storage.js";
import { cleanNumericValue, formatEditableValue } from "../../utils/format-css-value.js";
import { formatSessionEditsPrompt } from "../../utils/format-edit-prompt.js";
import { parseNumericValue } from "../../utils/parse-numeric-value.js";
import { filterPropertiesByQuery } from "../../utils/fuzzy-score-property.js";
import { getTagDisplay } from "../../utils/get-tag-display.js";
import { nativeCancelAnimationFrame, nativeRequestAnimationFrame } from "../../utils/native-raf.js";
import { registerOverlayDismiss } from "../../utils/register-overlay-dismiss.js";
import { suppressMenuEvent } from "../../utils/suppress-menu-event.js";
import { IconSubmit } from "../icons/icon-submit.jsx";
import { Arrow } from "../selection-label/arrow.js";
import { TagBadge } from "../selection-label/tag-badge.js";
import { computeEditPanelPosition, OFFSCREEN_POSITION } from "./compute-position.js";
import { HIDDEN_FOCUS_PRESERVING_STYLE } from "./constants.js";
import { createPreviewStyles } from "./preview-styles.js";
import { PropertyList } from "./property-list.js";
import { ValueStepper } from "./value-stepper.js";

interface EditPanelProps {
  state: EditPanelState | null;
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
        onDismiss={props.onDismiss}
        onSubmit={props.onSubmit}
        onInteractingChange={props.onInteractingChange}
      />
    )}
  </Show>
);

interface EditPanelBodyProps {
  state: EditPanelState;
  onDismiss: () => void;
  onSubmit: (prompt: string) => void;
  onInteractingChange?: (interacting: boolean) => void;
}

const EditPanelBody: Component<EditPanelBodyProps> = (props) => {
  const initialElement = props.state.element;
  const initialProperties = props.state.properties;

  let searchInputRef: HTMLTextAreaElement | undefined;
  const preview = createPreviewStyles(initialElement);

  const [measuredWidth, setMeasuredWidth] = createSignal(0);
  const [measuredHeight, setMeasuredHeight] = createSignal(0);
  const [searchQuery, setSearchQuery] = createSignal("");
  const [activeIndex, setActiveIndex] = createSignal(0);
  const [tweakedValues, setTweakedValues] = createSignal<Record<string, number>>({});
  const [activeKey, setActiveKey] = createSignal<"left" | "right" | null>(null);
  const [liveBounds, setLiveBounds] = createSignal<OverlayBounds | null>(null);
  // Sticky-true once the user commits any tweak (keyboard step, pointer
  // step, click-to-type). Drives the layout collapse to compact mode,
  // which only re-expands when the user types in the search field.
  const [hasCommittedAnyEdit, setHasCommittedAnyEdit] = createSignal(false);

  let activeKeyTimerId: ReturnType<typeof setTimeout> | undefined;
  let interactingIdleTimerId: ReturnType<typeof setTimeout> | undefined;
  let isInteractingFlag = false;

  // Compact mode is sticky: once the user commits a tweak, the panel
  // collapses to just the value stepper + submit button (no tag badge,
  // no search, no list). It only re-expands when the user types a
  // non-empty search query — typing on the hidden-but-focused search
  // textarea snaps the panel back to the full layout so they can see
  // the filtered property list.
  const isCompact = createMemo(() => hasCommittedAnyEdit() && searchQuery() === "");

  const tagDisplay = createMemo(() =>
    getTagDisplay({
      tagName: props.state.tagName,
      componentName: props.state.componentName,
    }),
  );

  const baseFilteredProperties = createMemo<EditableProperty[]>(() => {
    const query = searchQuery();
    // No query: only surface canonical, non-default rows. Canonical means
    // "the highest-level form that captures this side", so a uniform
    // padding shows as one row instead of seven. Searching unlocks the
    // full list — that's how Tailwind aliases like `pl` can rank to
    // `padding-left` even when the consolidated `padding` is what we
    // normally show.
    const candidates = query
      ? initialProperties
      : initialProperties.filter(
          (entry) => entry.prioritized || (entry.isCanonical && !entry.isDefault),
        );
    return filterPropertiesByQuery(candidates, query);
  });

  // A tweak on an aggregate (e.g. padding-y → padding-top + padding-bottom)
  // also redefines any row whose longhands are fully covered by the tweak's
  // longhands. Walk the tweaked properties first to build a longhand →
  // value lookup, then overlay it on the base rows.
  const filteredProperties = createMemo<EditableProperty[]>(() => {
    const tweaks = tweakedValues();
    const tweakKeys = Object.keys(tweaks);
    if (tweakKeys.length === 0) return baseFilteredProperties();

    const tweakValueByLonghand = new Map<string, number>();
    const propertyByKey = new Map(initialProperties.map((entry) => [entry.key, entry]));
    for (const key of tweakKeys) {
      const property = propertyByKey.get(key);
      if (!property) continue;
      for (const longhand of property.cssProperties) {
        tweakValueByLonghand.set(longhand, tweaks[key]);
      }
    }

    return baseFilteredProperties().map((property) => {
      if (tweaks[property.key] !== undefined) {
        return { ...property, value: tweaks[property.key] };
      }
      const first = tweakValueByLonghand.get(property.cssProperties[0]);
      if (first === undefined) return property;
      const allCoveredSameValue = property.cssProperties.every(
        (longhand) => tweakValueByLonghand.get(longhand) === first,
      );
      return allCoveredSameValue ? { ...property, value: first } : property;
    });
  });

  const activeProperty = createMemo<EditableProperty | null>(() => {
    const properties = filteredProperties();
    if (properties.length === 0) return null;
    const index = Math.min(Math.max(0, activeIndex()), properties.length - 1);
    return properties[index];
  });

  let containerRef: HTMLDivElement | undefined;
  let resizeObserver: ResizeObserver | undefined;

  const measure = () => {
    if (!containerRef) return;
    const rect = containerRef.getBoundingClientRect();
    setMeasuredWidth(rect.width);
    setMeasuredHeight(rect.height);
  };

  const attachContainerRef = (element: HTMLDivElement) => {
    containerRef = element;
    resizeObserver?.disconnect();
    resizeObserver = new ResizeObserver(() => measure());
    resizeObserver.observe(element);
  };

  // Pops our inline overrides for the property's CSS longhands (preserving
  // !important priority), reads getComputedStyle (= what the source produces),
  // confirms every longhand resolves to the same saved value, then puts the
  // inline overrides back. The mutate-read-mutate happens in one synchronous
  // task so the user never sees the intermediate state.
  const readSourceValueWithoutInline = (
    element: HTMLElement,
    property: EditableProperty,
  ): number | null => {
    const savedInline = new Map<string, { value: string; priority: string }>();
    for (const cssProperty of property.cssProperties) {
      savedInline.set(cssProperty, {
        value: element.style.getPropertyValue(cssProperty),
        priority: element.style.getPropertyPriority(cssProperty),
      });
      element.style.removeProperty(cssProperty);
    }
    const computed = getComputedStyle(element);
    const values: number[] = [];
    for (const cssProperty of property.cssProperties) {
      const raw = computed.getPropertyValue(cssProperty);
      const parsed = raw ? parseNumericValue(raw) : null;
      if (!parsed) {
        values.length = 0;
        break;
      }
      // Opacity is the only property the editor expresses as 0–100% over a
      // 0–1 computed value. Other %-unit properties (width, max-width, …)
      // already parse to their UI value.
      values.push(
        property.key === "opacity"
          ? Math.round(parsed.value * 100)
          : cleanNumericValue(parsed.value),
      );
    }
    for (const [cssProperty, { value, priority }] of savedInline) {
      if (value) element.style.setProperty(cssProperty, value, priority);
    }
    if (values.length !== property.cssProperties.length) return null;
    // All longhands must resolve to the same value for an aggregate to
    // count as applied — otherwise the agent only synced one side.
    for (let index = 1; index < values.length; index++) {
      if (values[index] !== values[0]) return null;
    }
    return values[0];
  };

  // Pending edits saved on a previous Enter survive across page reloads
  // until the source catches up. Detecting "source caught up" requires
  // briefly stripping our inline preview so we read the source-only value.
  const restorePendingEditsFromStorage = () => {
    if (!(initialElement instanceof HTMLElement)) return;
    const saved = loadPendingEdits(props.state);
    if (!saved) return;

    const propertyByKey = new Map(initialProperties.map((entry) => [entry.key, entry]));

    const survivingEdits = saved.filter((edit) => {
      const property = propertyByKey.get(edit.key);
      if (!property) return false;
      if (readSourceValueWithoutInline(initialElement, property) === edit.value) return false;
      preview.apply(property.cssProperties, formatEditableValue(property, edit.value));
      return true;
    });

    if (survivingEdits.length === 0) {
      clearPendingEdits(props.state);
      return;
    }
    if (survivingEdits.length !== saved.length) savePendingEdits(props.state, survivingEdits);
    setTweakedValues(Object.fromEntries(survivingEdits.map((edit) => [edit.key, edit.value])));
    // Treat restored edits as commits so the panel opens straight into
    // compact mode — the user already committed these, no need to make
    // them re-discover their own pending state.
    setHasCommittedAnyEdit(true);
  };

  // Tweaks change layout (padding, width, etc.), which can ripple through
  // ancestors that size to their children — so observing only the target
  // element misses many cases. A per-frame poll with dirty-check is cheap
  // (one rect read) and catches every reflow regardless of cause.
  let boundsFrameId: number | null = null;
  const startBoundsPolling = () => {
    if (boundsFrameId !== null) return;
    const tick = () => {
      boundsFrameId = nativeRequestAnimationFrame(tick);
      const rect = initialElement.getBoundingClientRect();
      const current = liveBounds() ?? props.state.selectionBounds;
      if (
        current.x === rect.left &&
        current.y === rect.top &&
        current.width === rect.width &&
        current.height === rect.height
      ) {
        return;
      }
      setLiveBounds({
        borderRadius: current.borderRadius,
        transform: current.transform,
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      });
    };
    tick();
  };

  const stopBoundsPolling = () => {
    if (boundsFrameId === null) return;
    nativeCancelAnimationFrame(boundsFrameId);
    boundsFrameId = null;
  };

  const flashActiveKey = (direction: "left" | "right") => {
    setActiveKey(direction);
    clearTimeout(activeKeyTimerId);
    activeKeyTimerId = setTimeout(() => {
      setActiveKey((current) => (current === direction ? null : current));
    }, EDIT_PANEL_ACTIVE_KEY_FLASH_MS);
  };

  // Timed "currently tweaking" flag — fires onInteractingChange so the
  // parent hides the page-level selection overlay while the user is
  // actively adjusting values.
  const markAsInteracting = () => {
    if (!isInteractingFlag) {
      isInteractingFlag = true;
      props.onInteractingChange?.(true);
    }
    clearTimeout(interactingIdleTimerId);
    interactingIdleTimerId = setTimeout(() => {
      isInteractingFlag = false;
      props.onInteractingChange?.(false);
    }, EDIT_PANEL_ADJUSTING_IDLE_MS);
  };

  const ensureSearchFocused = () => {
    queueMicrotask(() => {
      const active = searchInputRef?.ownerDocument.activeElement;
      if (active !== searchInputRef) searchInputRef?.focus({ preventScroll: true });
    });
  };

  // Pure step: computes the next value, writes it through, returns the
  // property that was tweaked (or null if no change). All commit paths
  // flip hasCommittedAnyEdit true and ping interacting.
  const commitTweak = (direction: 1 | -1, shift: boolean): EditableProperty | null => {
    const property = activeProperty();
    if (!property) return null;
    const multiplier = shift ? EDIT_SHIFT_STEP_MULTIPLIER : 1;
    const next = cleanNumericValue(
      clampToRange(property.value + direction * multiplier, property.min, property.max),
    );
    if (next === property.value) return null;
    setTweakedValues((current) => ({ ...current, [property.key]: next }));
    preview.apply(property.cssProperties, formatEditableValue(property, next));
    flashActiveKey(direction === 1 ? "right" : "left");
    setHasCommittedAnyEdit(true);
    markAsInteracting();
    ensureSearchFocused();
    return property;
  };

  const stepFromKeyboard = (direction: 1 | -1, shift: boolean) => {
    commitTweak(direction, shift);
  };

  const stepFromPointer = (direction: 1 | -1) => {
    commitTweak(direction, false);
  };

  // Click-to-type entry point. Clamps the raw user input (parsed float)
  // to the property's bounds and writes through the same preview pipeline
  // as the steppers.
  const commitTypedValue = (rawValue: number) => {
    const property = activeProperty();
    if (!property) return;
    const next = cleanNumericValue(clampToRange(rawValue, property.min, property.max));
    if (next === property.value) return;
    setTweakedValues((current) => ({ ...current, [property.key]: next }));
    preview.apply(property.cssProperties, formatEditableValue(property, next));
    setHasCommittedAnyEdit(true);
    markAsInteracting();
  };

  // Persist current tweaks to sessionStorage and return the diff. Used
  // by both Enter (commits + fires agent prompt) and Escape / click-outside
  // (commits silently, no prompt).
  const persistTweaks = (): PendingEdit[] => {
    const tweaks = tweakedValues();
    const pendingEdits: PendingEdit[] = [];
    for (const property of initialProperties) {
      const tweakedValue = tweaks[property.key];
      if (tweakedValue === undefined || tweakedValue === property.original) continue;
      pendingEdits.push({
        key: property.key,
        cssProperties: property.cssProperties,
        value: tweakedValue,
        unit: property.unit,
      });
    }
    if (pendingEdits.length > 0) {
      savePendingEdits(props.state, pendingEdits);
    } else {
      // No net change → user reverted everything for this element. Drop
      // its pending entry so reopening starts from the source baseline.
      clearPendingEdits(props.state);
    }
    return pendingEdits;
  };

  const handleSubmit = () => {
    const pendingEdits = persistTweaks();
    // The copy prompt covers every still-pending edit across the session,
    // not just this element's diff, so the agent gets the full backlog of
    // UI tweaks and can apply them in one batch. Read AFTER persisting
    // this element's edits so they're included.
    const sessionEntries = loadAllPendingEdits();
    // When the current element lacks filePath/lineNumber, savePendingEdits
    // can't persist (no storage key) and loadAllPendingEdits won't surface
    // the in-flight tweaks. Prepend them inline so the agent still sees
    // them in the prompt.
    const hasStorageKey = Boolean(props.state.filePath) && props.state.lineNumber !== undefined;
    if (pendingEdits.length > 0 && !hasStorageKey) {
      sessionEntries.unshift({
        filePath: props.state.filePath ?? "",
        lineNumber: props.state.lineNumber ?? 0,
        edits: pendingEdits,
      });
    }
    props.onSubmit(formatSessionEditsPrompt(sessionEntries));
  };

  // Close paths (Escape, click-outside) preserve the user's tweaks —
  // inline styles stay applied + sessionStorage saves the diff so reopening
  // surfaces it again. No agent prompt fires.
  const dismissPreservingTweaks = () => {
    persistTweaks();
    props.onDismiss();
  };

  const navigateActive = (direction: 1 | -1) => {
    const properties = filteredProperties();
    if (properties.length === 0) return;
    setActiveIndex((current) => (current + direction + properties.length) % properties.length);
  };

  const keyHandlers: Record<string, (event: KeyboardEvent) => void> = {
    ArrowUp: () => navigateActive(-1),
    ArrowDown: () => navigateActive(1),
    ArrowLeft: (event) => stepFromKeyboard(-1, event.shiftKey),
    ArrowRight: (event) => stepFromKeyboard(1, event.shiftKey),
    Tab: (event) => navigateActive(event.shiftKey ? -1 : 1),
    Enter: () => handleSubmit(),
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

  const computedPosition = createMemo(() => {
    const panelWidth = measuredWidth();
    const panelHeight = measuredHeight();
    if (panelWidth === 0 || panelHeight === 0) return OFFSCREEN_POSITION;
    return computeEditPanelPosition({
      state: props.state,
      bounds: liveBounds() ?? props.state.selectionBounds,
      panelWidth,
      panelHeight,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    });
  });

  // Keep the active row in sync with the filtered list — collapse on empty,
  // clamp when the list shrinks beneath the previous index.
  createEffect(
    on(baseFilteredProperties, (properties) => {
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
    queueMicrotask(() => searchInputRef?.focus({ preventScroll: true }));
    nativeRequestAnimationFrame(measure);
    startBoundsPolling();
    restorePendingEditsFromStorage();

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
    const handleWindowKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return;
      handleSearchKeyDown(event);
    };
    window.addEventListener("keydown", handleWindowKeyDown, { capture: true });

    onCleanup(() => {
      unregisterDismiss();
      window.removeEventListener("keydown", handleWindowKeyDown, { capture: true });
      clearTimeout(activeKeyTimerId);
      clearTimeout(interactingIdleTimerId);
      stopBoundsPolling();
      resizeObserver?.disconnect();
      if (isInteractingFlag) {
        isInteractingFlag = false;
        props.onInteractingChange?.(false);
      }
      // All dismissal paths preserve the user's tweaks now (req: Escape
      // does not reset state). Inline styles stay applied; the page shows
      // the tweaked values until the source is updated.
      preview.forget();
    });
  });

  const handleSelectProperty = (index: number) => {
    setActiveIndex(index);
    ensureSearchFocused();
  };

  return (
    <div
      ref={attachContainerRef}
      data-react-grab-ignore-events
      data-react-grab-edit-panel
      class="fixed font-sans text-[13px] antialiased [filter:var(--rg-drop-shadow)] select-none"
      style={{
        top: `${computedPosition().top}px`,
        left: `${computedPosition().left}px`,
        "z-index": `${Z_INDEX_OVERLAY}`,
        "pointer-events": "auto",
        "--rg-edit-list-max-h": `${EDIT_PROPERTY_LIST_MAX_HEIGHT_PX}px`,
      }}
      onPointerDown={suppressMenuEvent}
      onMouseDown={suppressMenuEvent}
      onClick={suppressMenuEvent}
      onContextMenu={suppressMenuEvent}
    >
      <Arrow
        position={computedPosition().arrowPosition}
        leftPercent={0}
        leftOffsetPx={computedPosition().arrowLeft}
      />
      <div
        class="contain-layout flex flex-col justify-center items-start rounded-[14px] antialiased w-fit h-fit [font-synthesis:none] [corner-shape:superellipse(1.25)] bg-[var(--rg-panel-bg)]"
        style={{
          "min-width": isCompact() ? undefined : `${EDIT_PANEL_MIN_WIDTH_PX}px`,
          "max-width": `${EDIT_PANEL_MAX_WIDTH_PX}px`,
        }}
      >
        {/* TagBadge: full mode only — once the user starts editing, the
            element name is implicit (they just clicked it) and gets in the
            way of the value-focused compact layout. */}
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

        {/* Search + list. Always mounted: the search textarea owns focus,
            and in compact mode it stays focused via HIDDEN_FOCUS_PRESERVING_STYLE
            so the next keystroke from the user (typing) snaps the panel
            back to full layout. */}
        <div
          class={
            isCompact()
              ? ""
              : "[font-synthesis:none] contain-layout shrink-0 flex flex-col items-start px-2 py-1.5 w-auto h-fit self-stretch [border-top-width:0.5px] border-t-solid border-t-[var(--rg-border-subtle)] antialiased rounded-t-none rounded-b-[6px]"
          }
          style={isCompact() ? HIDDEN_FOCUS_PRESERVING_STYLE : undefined}
        >
          <textarea
            ref={(element) => {
              searchInputRef = element;
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
              setSearchQuery(event.currentTarget.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search property"
            rows={1}
          />
          <Show when={filteredProperties().length > 0}>
            <div class="w-full pt-2">
              <PropertyList
                properties={filteredProperties()}
                activeIndex={activeIndex()}
                activeKey={activeKey()}
                onHoverIndex={setActiveIndex}
                onSelect={handleSelectProperty}
                onStep={stepFromPointer}
                onCommitValue={commitTypedValue}
                onEditComplete={ensureSearchFocused}
              />
            </div>
          </Show>
        </div>

        {/* Compact-mode dropdown — mirrors the comment plugin's prompt-mode
            UX: focused value editor + circular submit button. Click the
            number to type directly, click ✓ to commit + send to the agent. */}
        <Show when={isCompact() && activeProperty()}>
          {(activeProp) => (
            <div
              class="flex items-center justify-center gap-2 w-full px-3 py-1.5 min-h-[28px]"
              onMouseDown={(event) => event.preventDefault()}
            >
              <ValueStepper
                value={activeProp().value}
                unit={activeProp().unit}
                activeKey={activeKey()}
                onStep={stepFromPointer}
                onCommitValue={commitTypedValue}
                onEditComplete={ensureSearchFocused}
                emphasized
              />
              <button
                data-react-grab-ignore-events
                data-react-grab-submit
                type="button"
                aria-label="Submit edits"
                class="contain-layout shrink-0 flex items-center justify-center size-4 rounded-full bg-[var(--rg-submit-bg)] cursor-pointer interactive-scale a11y-hitbox"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSubmit()}
              >
                <IconSubmit size={10} aria-hidden="true" class="text-[var(--rg-submit-fg)]" />
              </button>
            </div>
          )}
        </Show>
      </div>
    </div>
  );
};
