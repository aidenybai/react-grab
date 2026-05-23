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
  loadPendingEdits,
  savePendingEdits,
} from "../../utils/edit-panel-storage.js";
import { expandCssLonghands } from "../../utils/expand-css-shorthand.js";
import { cleanNumericValue } from "../../utils/format-display-value.js";
import { filterPropertiesByQuery } from "../../utils/fuzzy-score-property.js";
import { formatStyleDiffPrompt, type EditPromptChange } from "../../utils/format-edit-prompt.js";
import { getTagDisplay } from "../../utils/get-tag-display.js";
import {
  nativeCancelAnimationFrame,
  nativeRequestAnimationFrame,
} from "../../utils/native-raf.js";
import { registerOverlayDismiss } from "../../utils/register-overlay-dismiss.js";
import { suppressMenuEvent } from "../../utils/suppress-menu-event.js";
import { Arrow } from "../selection-label/arrow.js";
import { BottomSection } from "../selection-label/bottom-section.js";
import { TagBadge } from "../selection-label/tag-badge.js";
import { PropertyList } from "./property-list.js";

interface EditPanelProps {
  state: EditPanelState | null;
  onDismiss: () => void;
  onSubmit: (prompt: string) => void;
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

  let activeKeyTimerId: ReturnType<typeof setTimeout> | undefined;
  let boundsFrameId: number | null = null;
  let didCommitOnSubmit = false;

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
    // No query: only surface properties that actually matter for this
    // element (non-default values plus Tailwind-targeted ones). Searching
    // gives access to the full list so users can still edit any property
    // they want even if it's at its default.
    const candidates = query
      ? state.properties
      : state.properties.filter((entry) => !entry.isDefault);
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
  // until the source code catches up. On open we compare each saved value
  // against the element's freshly-snapshotted original: matches mean the
  // agent applied the change for real (drop), mismatches mean the edit is
  // still pending (re-apply as preview so the user sees their work).
  const restorePendingEditsFromStorage = () => {
    const state = props.state;
    if (!state) return;
    const saved = loadPendingEdits(state);
    if (!saved) return;

    const propertyByKey = new Map(state.properties.map((entry) => [entry.property, entry]));
    const stillPending: Record<string, number> = {};
    const tweaksToApply: Record<string, number> = {};

    for (const [propertyKey, savedValue] of Object.entries(saved)) {
      const property = propertyByKey.get(propertyKey);
      if (!property) continue;
      if (savedValue === property.original) continue;
      stillPending[propertyKey] = savedValue;
      tweaksToApply[propertyKey] = savedValue;
      applyPreview(property, savedValue);
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

  createEffect(
    on(isVisible, (visible) => {
      if (!visible) {
        setSearchQuery("");
        setActiveIndex(0);
        setTweakedValues({});
        setActiveKey(null);
        setLiveBounds(null);
        stopBoundsPolling();
        // Commit (Enter) keeps the live preview on the element so the user
        // sees the result; cancel (Esc / click-outside) reverts.
        if (!didCommitOnSubmit) {
          const state = props.state;
          if (state) restorePreviewStyles(state.element, previewBaseline);
        } else {
          // Drop our bookkeeping without removing the styles we wrote, so
          // subsequent edits on the same element start from this committed
          // state rather than the pre-edit baseline.
          previewBaseline.clear();
        }
        didCommitOnSubmit = false;
        return;
      }
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
    ensureSearchFocused();
  };

  const handleSubmit = () => {
    const state = props.state;
    if (!state) return;
    const tweaks = tweakedValues();
    const changes: EditPromptChange[] = [];
    const pendingEdits: Record<string, number> = {};
    for (const property of state.properties) {
      const tweakedValue = tweaks[property.property];
      if (tweakedValue === undefined) continue;
      if (tweakedValue === property.original) continue;
      changes.push({ property, value: tweakedValue });
      pendingEdits[property.property] = tweakedValue;
    }
    if (changes.length > 0) {
      savePendingEdits(state, pendingEdits);
    }
    const prompt = formatStyleDiffPrompt({ changes });
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
      stopBoundsPolling();
      const state = props.state;
      if (state) restorePreviewStyles(state.element, previewBaseline);
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
              "min-width": `${EDIT_PANEL_MIN_WIDTH_PX}px`,
              "max-width": `${EDIT_PANEL_MAX_WIDTH_PX}px`,
            }}
          >
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
            <BottomSection>
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
            </BottomSection>
          </div>
        </div>
    </Show>
  );
};
