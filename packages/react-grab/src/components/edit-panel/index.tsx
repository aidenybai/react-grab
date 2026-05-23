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
  ARROW_HEIGHT_PX,
  DROPDOWN_OFFSCREEN_POSITION,
  EDIT_PANEL_ADJUSTING_FADE_MS,
  EDIT_PANEL_ADJUSTING_IDLE_MS,
  EDIT_PANEL_ADJUSTING_OPACITY,
  EDIT_PANEL_MAX_WIDTH_PX,
  EDIT_PANEL_MIN_WIDTH_PX,
  EDIT_PROPERTY_LIST_MAX_HEIGHT_PX,
  EDIT_SHIFT_STEP_MULTIPLIER,
  LABEL_GAP_PX,
  Z_INDEX_OVERLAY,
} from "../../constants.js";
import type { EditableProperty, EditPanelState, OverlayBounds } from "../../types.js";
import {
  editablePropertyToCssProperties,
  formatEditableValue,
} from "../../utils/build-editable-properties.js";
import { clampNumericValue } from "../../utils/clamp-numeric-value.js";
import {
  clearPendingEdits,
  loadAllPendingEdits,
  loadPendingEdits,
  savePendingEdits,
  type PendingEdits,
} from "../../utils/edit-panel-storage.js";
import { expandCssLonghands } from "../../utils/expand-css-shorthand.js";
import {
  cleanNumericValue,
  formatDisplayValue,
} from "../../utils/format-display-value.js";
import { parseNumericValue } from "../../utils/parse-numeric-value.js";
import { filterPropertiesByQuery } from "../../utils/fuzzy-score-property.js";
import { formatSessionEditsPrompt } from "../../utils/format-edit-prompt.js";
import { getTagDisplay } from "../../utils/get-tag-display.js";
import {
  nativeCancelAnimationFrame,
  nativeRequestAnimationFrame,
} from "../../utils/native-raf.js";
import { registerOverlayDismiss } from "../../utils/register-overlay-dismiss.js";
import { suppressMenuEvent } from "../../utils/suppress-menu-event.js";
import { Arrow } from "../selection-label/arrow.js";
import { TagBadge } from "../selection-label/tag-badge.js";
import { PropertyList } from "./property-list.js";
import { StepArrow } from "./step-arrow.js";

interface EditPanelProps {
  state: EditPanelState | null;
  onDismiss: () => void;
  onSubmit: (prompt: string) => void;
  onAdjustingChange?: (adjusting: boolean) => void;
}

interface EditPanelPosition {
  left: number;
  top: number;
  arrowLeft: number;
  arrowPosition: "top" | "bottom";
}

const ACTIVE_KEY_FLASH_MS = 100;

const DEFAULT_POSITION: EditPanelPosition = {
  left: DROPDOWN_OFFSCREEN_POSITION.left,
  top: DROPDOWN_OFFSCREEN_POSITION.top,
  arrowLeft: 0,
  arrowPosition: "bottom",
};

const writePreviewStyles = (
  element: Element,
  cssProperties: string[],
  value: string,
  previous: Map<string, string>,
): void => {
  if (!(element instanceof HTMLElement)) return;
  for (const property of cssProperties) {
    if (!previous.has(property)) {
      previous.set(property, element.style.getPropertyValue(property));
    }
    element.style.setProperty(property, value);
  }
};

const restorePreviewStyles = (
  element: Element,
  previous: Map<string, string>,
): void => {
  if (!(element instanceof HTMLElement)) return;
  for (const [property, originalValue] of previous) {
    if (originalValue) {
      element.style.setProperty(property, originalValue);
    } else {
      element.style.removeProperty(property);
    }
  }
  previous.clear();
};

export const EditPanel: Component<EditPanelProps> = (props) => {
  let containerRef: HTMLDivElement | undefined;
  let searchInputRef: HTMLTextAreaElement | undefined;
  const previewBaseline = new Map<string, string>();

  const [measuredWidth, setMeasuredWidth] = createSignal(0);
  const [measuredHeight, setMeasuredHeight] = createSignal(0);
  const [searchQuery, setSearchQuery] = createSignal("");
  const [activeIndex, setActiveIndex] = createSignal(0);
  const [tweakedValues, setTweakedValues] = createSignal<Record<string, number>>({});
  const [activeKey, setActiveKey] = createSignal<"left" | "right" | null>(null);
  const [liveBounds, setLiveBounds] = createSignal<OverlayBounds | null>(null);
  const [isAdjusting, setIsAdjusting] = createSignal(false);

  let activeKeyTimerId: ReturnType<typeof setTimeout> | undefined;
  let adjustingIdleTimerId: ReturnType<typeof setTimeout> | undefined;
  let boundsFrameId: number | null = null;
  let didCommitOnSubmit = false;
  // Snapshot of the target element captured when the panel opens, so that
  // when isVisible flips false (because the parent has already nulled
  // props.state) we still know which DOM node to restore styles on.
  let openedElement: Element | null = null;

  const isVisible = createMemo(() => props.state !== null);

  const tagDisplay = createMemo(() => {
    const state = props.state;
    return getTagDisplay({
      tagName: state?.tagName,
      componentName: state?.componentName,
    });
  });

  const baseFilteredProperties = createMemo<EditableProperty[]>(() => {
    const state = props.state;
    if (!state) return [];
    const query = searchQuery();
    // No query: only surface canonical, non-default rows. Canonical means
    // "the highest-level form that captures this side", so a uniform
    // padding shows as one row instead of seven. Searching unlocks the
    // full list — that's how Tailwind aliases like `pl` can rank to
    // `padding-left` even when the consolidated `padding` is what we
    // normally show.
    const candidates = query
      ? state.properties
      : state.properties.filter(
          (entry) => entry.prioritized || (entry.isCanonical && !entry.isDefault),
        );
    return filterPropertiesByQuery(candidates, query);
  });

  // A tweak on an aggregate property (e.g. padding-y → padding-top + padding-bottom)
  // also redefines the values of any property whose CSS longhands are fully
  // covered by the tweak's longhands. Without this, the row for "padding top"
  // keeps showing its original 4px while the element actually has 47px applied
  // via the padding-y tweak.
  const filteredProperties = createMemo<EditableProperty[]>(() => {
    const tweaks = tweakedValues();
    const tweakEntries = Object.entries(tweaks);
    if (tweakEntries.length === 0) return baseFilteredProperties();
    const tweakLonghandsByKey = new Map<string, string[]>();
    for (const [key] of tweakEntries) {
      tweakLonghandsByKey.set(key, expandCssLonghands(key));
    }
    return baseFilteredProperties().map((property) => {
      if (tweaks[property.property] !== undefined) {
        return { ...property, value: tweaks[property.property] };
      }
      const propertyLonghands = expandCssLonghands(property.property);
      for (const [tweakKey, tweakValue] of tweakEntries) {
        const tweakLonghands = tweakLonghandsByKey.get(tweakKey)!;
        const isFullyCovered = propertyLonghands.every((longhand) =>
          tweakLonghands.includes(longhand),
        );
        if (isFullyCovered) {
          return { ...property, value: tweakValue };
        }
      }
      return property;
    });
  });

  const activeProperty = createMemo<EditableProperty | null>(() => {
    const properties = filteredProperties();
    if (properties.length === 0) return null;
    const index = Math.min(Math.max(0, activeIndex()), properties.length - 1);
    return properties[index] ?? null;
  });

  const measure = () => {
    if (!containerRef) return;
    const rect = containerRef.getBoundingClientRect();
    setMeasuredWidth(rect.width);
    setMeasuredHeight(rect.height);
  };

  createEffect(() => {
    if (isVisible()) nativeRequestAnimationFrame(measure);
  });

  const applyPreview = (property: EditableProperty, value: number): void => {
    const state = props.state;
    if (!state) return;
    const previewValue = formatEditableValue({ ...property, value });
    const cssProperties = editablePropertyToCssProperties(property.property);
    writePreviewStyles(state.element, cssProperties, previewValue, previewBaseline);
  };

  // Pending edits saved on a previous Enter survive across page reloads
  // until the source code catches up. The trick is detecting "source has
  // caught up" — we left inline styles on the element after commit, so
  // getComputedStyle just reads back our own preview value, not the
  // source's value. We disambiguate by temporarily removing each saved
  // property's inline overrides, snapshotting the source-only value,
  // then re-applying the inline preview if the source hasn't caught up.
  const restorePendingEditsFromStorage = () => {
    const state = props.state;
    if (!state || !(state.element instanceof HTMLElement)) return;
    const saved = loadPendingEdits(state);
    if (!saved) return;

    const element = state.element;
    const propertyByKey = new Map(state.properties.map((entry) => [entry.property, entry]));
    const stillPending: PendingEdits = {};
    const tweaksToApply: Record<string, number> = {};

    for (const [propertyKey, savedEdit] of Object.entries(saved)) {
      const property = propertyByKey.get(propertyKey);
      if (!property) continue;
      const sourceValue = readSourceValueWithoutInline(element, property);
      if (sourceValue !== null && sourceValue === savedEdit.value) continue;
      stillPending[propertyKey] = savedEdit;
      tweaksToApply[propertyKey] = savedEdit.value;
      applyPreview(property, savedEdit.value);
    }

    if (Object.keys(stillPending).length === 0) {
      clearPendingEdits(state);
    } else if (Object.keys(stillPending).length !== Object.keys(saved).length) {
      savePendingEdits(state, stillPending);
    }

    if (Object.keys(tweaksToApply).length > 0) {
      setTweakedValues(tweaksToApply);
    }
  };

  // Pop our inline overrides for the property's CSS longhands (preserving
  // !important priority), read getComputedStyle (= what the underlying
  // source produces), confirm every longhand resolves to the same saved
  // value, then put the inline overrides back. The mutate-read-mutate
  // happens in one synchronous task so the user never sees the
  // intermediate state.
  const readSourceValueWithoutInline = (
    element: HTMLElement,
    property: EditableProperty,
  ): number | null => {
    const cssProperties = editablePropertyToCssProperties(property.property);
    const savedInline = new Map<string, { value: string; priority: string }>();
    for (const cssProperty of cssProperties) {
      const value = element.style.getPropertyValue(cssProperty);
      const priority = element.style.getPropertyPriority(cssProperty);
      savedInline.set(cssProperty, { value, priority });
      element.style.removeProperty(cssProperty);
    }
    const computed = getComputedStyle(element);
    const values: number[] = [];
    let resolved: number | null = null;
    for (const cssProperty of cssProperties) {
      const raw = computed.getPropertyValue(cssProperty);
      if (!raw) {
        resolved = null;
        break;
      }
      const parsed = parseNumericValue(raw);
      if (!parsed) {
        resolved = null;
        break;
      }
      // Opacity is the only property the editor expresses as 0–100% over a
      // 0–1 computed value. Other %-unit properties (width, max-width, …)
      // already parse to their UI value, so don't scale them.
      const normalized =
        property.property === "opacity"
          ? Math.round(parsed.value * 100)
          : cleanNumericValue(parsed.value);
      values.push(normalized);
    }
    for (const [cssProperty, { value, priority }] of savedInline) {
      if (value) element.style.setProperty(cssProperty, value, priority);
    }
    if (values.length === 0 || values.length !== cssProperties.length) return null;
    // For aggregate keys (padding-top,padding-bottom) all longhands must
    // resolve to the same value for us to treat the saved aggregate as
    // applied — otherwise the agent only synced one side.
    resolved = values[0];
    for (let index = 1; index < values.length; index++) {
      if (values[index] !== resolved) return null;
    }
    return resolved;
  };

  createEffect(
    on(isVisible, (visible) => {
      if (!visible) {
        const targetElement = openedElement;
        openedElement = null;
        setSearchQuery("");
        setActiveIndex(0);
        setTweakedValues({});
        setActiveKey(null);
        setLiveBounds(null);
        setIsAdjusting(false);
        clearTimeout(adjustingIdleTimerId);
        stopBoundsPolling();
        // Commit (Enter) keeps the live preview on the element so the user
        // sees the result; cancel (Esc / click-outside) reverts. props.state
        // is already null by the time this effect runs (the parent clears
        // it synchronously on dismiss), so we restore on the element we
        // captured when the panel opened.
        if (!didCommitOnSubmit && targetElement) {
          restorePreviewStyles(targetElement, previewBaseline);
        } else {
          // Drop our bookkeeping without removing the styles we wrote, so
          // subsequent edits on the same element start from this committed
          // state rather than the pre-edit baseline.
          previewBaseline.clear();
        }
        didCommitOnSubmit = false;
        return;
      }
      openedElement = props.state?.element ?? null;
      queueMicrotask(() => searchInputRef?.focus({ preventScroll: true }));
      startBoundsPolling();
      restorePendingEditsFromStorage();
    }),
  );

  // Tweaks change the target element's layout (padding, width, etc.), and
  // those changes can ripple through ancestors that are sized by their
  // children, so just observing the element with ResizeObserver misses many
  // cases. A per-frame poll with dirty-check is cheap (one rect read), runs
  // only while the panel is open, and catches every reflow regardless of
  // cause (our tweak, user scroll, ancestor reflow, OS animation).
  const startBoundsPolling = () => {
    if (boundsFrameId !== null) return;
    const tick = () => {
      boundsFrameId = nativeRequestAnimationFrame(tick);
      const state = props.state;
      if (!state) return;
      const rect = state.element.getBoundingClientRect();
      const current = liveBounds() ?? state.selectionBounds;
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

  const flashActiveKey = (direction: "left" | "right") => {
    setActiveKey(direction);
    clearTimeout(activeKeyTimerId);
    activeKeyTimerId = setTimeout(() => {
      setActiveKey((current) => (current === direction ? null : current));
    }, ACTIVE_KEY_FLASH_MS);
  };

  // While the user is actively stepping the value, dim the panel and hide
  // the selection overlay so the result is unobstructed. The flag clears
  // after EDIT_PANEL_ADJUSTING_IDLE_MS of no further steps; an effect below
  // forwards each transition to the parent (core) so the page-level
  // selection box can hide in lockstep.
  const markAsAdjusting = () => {
    setIsAdjusting(true);
    clearTimeout(adjustingIdleTimerId);
    adjustingIdleTimerId = setTimeout(() => {
      setIsAdjusting(false);
    }, EDIT_PANEL_ADJUSTING_IDLE_MS);
  };

  createEffect(
    on(isAdjusting, (adjusting) => props.onAdjustingChange?.(adjusting), { defer: true }),
  );

  const ensureSearchFocused = () => {
    queueMicrotask(() => {
      const active = searchInputRef?.ownerDocument.activeElement;
      if (active !== searchInputRef) searchInputRef?.focus({ preventScroll: true });
    });
  };

  const step = (direction: 1 | -1, shift: boolean) => {
    const property = activeProperty();
    if (!property) return;
    const multiplier = shift ? EDIT_SHIFT_STEP_MULTIPLIER : 1;
    const next = cleanNumericValue(
      clampNumericValue(
        property.value + direction * multiplier,
        property.min,
        property.max,
      ),
    );
    if (next === property.value) return;
    setTweakedValues((current) => ({ ...current, [property.property]: next }));
    applyPreview(property, next);
    flashActiveKey(direction === 1 ? "right" : "left");
    markAsAdjusting();
    ensureSearchFocused();
  };

  const handleSubmit = () => {
    const state = props.state;
    if (!state) return;
    const tweaks = tweakedValues();
    const pendingEdits: PendingEdits = {};
    let hasChanges = false;
    for (const property of state.properties) {
      const tweakedValue = tweaks[property.property];
      if (tweakedValue === undefined) continue;
      if (tweakedValue === property.original) continue;
      pendingEdits[property.property] = { value: tweakedValue, unit: property.unit };
      hasChanges = true;
    }
    if (hasChanges) {
      savePendingEdits(state, pendingEdits);
    }
    // The copy prompt covers every still-pending edit across the session,
    // not just this element's diff, so the agent gets the full backlog of
    // UI tweaks the user has made and can apply them in one batch. Read
    // BEFORE clearing the current element's entry so a no-change submit
    // still ships the rest of the session's pending edits to the agent.
    const prompt = formatSessionEditsPrompt(loadAllPendingEdits());
    if (!hasChanges) {
      // No net change → user reverted everything for this element. Drop
      // its pending entry so reopening starts from the source baseline.
      clearPendingEdits(state);
    }
    didCommitOnSubmit = true;
    props.onSubmit(prompt);
  };

  const navigateActive = (direction: 1 | -1) => {
    const properties = filteredProperties();
    if (properties.length === 0) return;
    setActiveIndex((current) => {
      const next = current + direction;
      return (next + properties.length) % properties.length;
    });
  };

  const handleSearchKeyDown = (event: KeyboardEvent) => {
    if (event.isComposing) return;
    if (event.key === "ArrowUp") {
      event.preventDefault();
      event.stopImmediatePropagation();
      navigateActive(-1);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      event.stopImmediatePropagation();
      navigateActive(1);
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      event.stopImmediatePropagation();
      step(-1, event.shiftKey);
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      event.stopImmediatePropagation();
      step(1, event.shiftKey);
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      event.stopImmediatePropagation();
      navigateActive(event.shiftKey ? -1 : 1);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      event.stopImmediatePropagation();
      handleSubmit();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopImmediatePropagation();
      props.onDismiss();
    }
  };

  const computedPosition = createMemo<EditPanelPosition>(() => {
    const state = props.state;
    if (!state) return DEFAULT_POSITION;
    const panelWidth = measuredWidth();
    const panelHeight = measuredHeight();
    if (panelWidth === 0 || panelHeight === 0) return DEFAULT_POSITION;

    const bounds = liveBounds() ?? state.selectionBounds;
    const cursorX = state.position.x;
    const left = Math.max(
      LABEL_GAP_PX,
      Math.min(cursorX - panelWidth / 2, window.innerWidth - panelWidth - LABEL_GAP_PX),
    );
    const arrowLeft = Math.max(
      ARROW_HEIGHT_PX,
      Math.min(cursorX - left, panelWidth - ARROW_HEIGHT_PX),
    );

    const positionBelow = bounds.y + bounds.height + ARROW_HEIGHT_PX + LABEL_GAP_PX;
    const positionAbove = bounds.y - panelHeight - ARROW_HEIGHT_PX - LABEL_GAP_PX;
    const overflowsBottom = positionBelow + panelHeight > window.innerHeight;
    const hasSpaceAbove = positionAbove >= 0;
    const shouldFlipAbove = overflowsBottom && hasSpaceAbove;
    const top = shouldFlipAbove ? positionAbove : positionBelow;
    const arrowPosition: "top" | "bottom" = shouldFlipAbove ? "top" : "bottom";

    return { left, top, arrowLeft, arrowPosition };
  });

  onMount(() => {
    const unregisterDismiss = registerOverlayDismiss({
      isOpen: isVisible,
      onDismiss: props.onDismiss,
      shouldIgnoreRightClick: true,
    });

    onCleanup(() => {
      unregisterDismiss();
      clearTimeout(activeKeyTimerId);
      clearTimeout(adjustingIdleTimerId);
      stopBoundsPolling();
      if (openedElement) restorePreviewStyles(openedElement, previewBaseline);
    });
  });

  const handleSelectProperty = (index: number) => {
    setActiveIndex(index);
    ensureSearchFocused();
  };

  return (
    <Show when={isVisible() && props.state}>
      <div
        ref={containerRef}
        data-react-grab-ignore-events
        data-react-grab-edit-panel
        class="fixed font-sans text-[13px] antialiased [filter:var(--rg-drop-shadow)] select-none"
        style={{
          top: `${computedPosition().top}px`,
          left: `${computedPosition().left}px`,
          "z-index": `${Z_INDEX_OVERLAY}`,
          "pointer-events": "auto",
          "--rg-edit-list-max-h": `${EDIT_PROPERTY_LIST_MAX_HEIGHT_PX}px`,
          opacity: isAdjusting() ? EDIT_PANEL_ADJUSTING_OPACITY : 1,
          transition: `opacity ${EDIT_PANEL_ADJUSTING_FADE_MS}ms ease-out`,
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
            "min-width": isAdjusting() ? undefined : `${EDIT_PANEL_MIN_WIDTH_PX}px`,
            "max-width": `${EDIT_PANEL_MAX_WIDTH_PX}px`,
          }}
        >
          {/* TagBadge header — hidden during adjustment so the panel shrinks
              down to just the active row. */}
          <div
            class="contain-layout shrink-0 flex items-center gap-1 pt-1.5 pb-1 w-fit h-fit px-2"
            style={isAdjusting() ? HIDDEN_FOCUS_PRESERVING_STYLE : undefined}
          >
            <TagBadge
              tagName={tagDisplay().tagName}
              componentName={tagDisplay().componentName}
              isClickable={false}
              onClick={() => {}}
              shrink
              forceShowIcon={false}
            />
          </div>

          {/* Search + list — hidden during adjustment, but the textarea
              keeps focus (positioned 0×0 invisibly via HIDDEN_FOCUS_PRESERVING_STYLE)
              so keyboard handlers continue to fire. */}
          <div
            class={
              isAdjusting()
                ? ""
                : "[font-synthesis:none] contain-layout shrink-0 flex flex-col items-start px-2 py-1.5 w-auto h-fit self-stretch [border-top-width:0.5px] border-t-solid border-t-[var(--rg-border-subtle)] antialiased rounded-t-none rounded-b-[6px]"
            }
            style={isAdjusting() ? HIDDEN_FOCUS_PRESERVING_STYLE : undefined}
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
                const value = event.currentTarget.value;
                setSearchQuery(value);
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
                  onStep={step}
                />
              </div>
            </Show>
          </div>

          {/* Compact row — only visible while adjusting. Shows just the
              active property's label + value + stepper, nothing else.
              Reads activeProperty() through the Show accessor (not a
              captured const) so each tweak flows through to the displayed
              number reactively. */}
          <Show when={isAdjusting() && activeProperty()}>
            {(activeProp) => (
              <div
                class="flex items-center justify-between gap-3 w-full px-3 py-1.5 min-h-[28px]"
                onMouseDown={(event) => event.preventDefault()}
              >
                <span class="text-[13px] leading-4 font-medium text-[var(--rg-text-secondary)] truncate min-w-0">
                  {activeProp().label}
                </span>
                <div class="flex items-center gap-1 shrink-0 leading-none">
                  <StepArrow
                    direction="left"
                    active={activeKey() === "left"}
                    onPointerDown={() => step(-1, false)}
                  />
                  <span class="inline-flex items-baseline text-[var(--rg-text-primary)] tabular-nums min-w-[36px] justify-center">
                    <span class="text-[13px] leading-4 font-medium">
                      {formatDisplayValue(activeProp().value)}
                    </span>
                    <span class="text-[10px] leading-4 font-medium text-[var(--rg-text-secondary)] ml-px">
                      {activeProp().unit}
                    </span>
                  </span>
                  <StepArrow
                    direction="right"
                    active={activeKey() === "right"}
                    onPointerDown={() => step(1, false)}
                  />
                </div>
              </div>
            )}
          </Show>
        </div>
      </div>
    </Show>
  );
};

// Visually removes an element from layout flow while keeping it in the DOM,
// so a focused textarea inside still receives keyboard events and our
// onKeyDown handler keeps working through the panel's compact state.
const HIDDEN_FOCUS_PRESERVING_STYLE = {
  position: "absolute" as const,
  opacity: 0,
  "pointer-events": "none" as const,
  width: "0",
  height: "0",
  margin: "0",
  padding: "0",
  overflow: "hidden" as const,
};
