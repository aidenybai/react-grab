import {
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  Show,
  type Component,
} from "solid-js";
import {
  DROPDOWN_EDGE_TRANSFORM_ORIGIN,
  EDIT_PANEL_ACTIVE_KEY_FLASH_MS,
  EDIT_PANEL_ADJUSTING_IDLE_MS,
  EDIT_INLINE_NUMERIC_REPLACE_IDLE_MS,
  EDIT_PANEL_MAX_WIDTH_PX,
  EDIT_PANEL_MIN_WIDTH_PX,
  EDIT_PROPERTY_LIST_MAX_HEIGHT_PX,
  EDIT_SLIDER_SPRING_EASING,
  EDIT_VALUE_BUMP_MS,
  EDIT_VALUE_BUMP_PX,
  IME_COMPOSING_KEY_CODE,
  Z_INDEX_OVERLAY,
} from "../../constants.js";
import type {
  DropdownAnchor,
  EditableProperty,
  EditPanelState,
  OverlayDismissSource,
} from "../../types.js";
import { clampToRange } from "../../utils/clamp-to-range.js";
import { cn } from "../../utils/cn.js";
import { createAnchoredDropdown } from "../../utils/create-anchored-dropdown.js";
import { findTailwindClass } from "../../utils/find-tailwind-class.js";
import { formatEditableValue, roundEditableNumericValue } from "../../utils/format-css-value.js";
import { formatSessionEditsPrompt } from "../../utils/format-edit-prompt.js";
import { getShadowActiveElement } from "../../utils/get-shadow-active-element.js";
import { getTagDisplay } from "../../utils/get-tag-display.js";
import { isEventFromOverlay } from "../../utils/is-event-from-overlay.js";
import { registerOverlayDismiss } from "../../utils/register-overlay-dismiss.js";
import { suppressMenuEvent } from "../../utils/suppress-menu-event.js";
import { TagBadge } from "../selection-label/tag-badge.js";
import { ActivePropertyControl } from "./active-property-control.js";
import { HIDDEN_FOCUS_PRESERVING_STYLE } from "./constants.js";
import { createDiscardConfirmation } from "./discard-confirmation.js";
import { PropertyList } from "./property-list.js";
import { arePropertyValuesEqual } from "./property-values-equal.js";
import { createShiftTracker } from "./shift-tracker.js";
import { createStepController } from "./step-controller.js";
import { stepProperty } from "./step-property.js";
import { createTailwindAutoApply } from "./tailwind-autoapply.js";
import { createTweakStore } from "./tweak-store.js";

interface EditPanelProps {
  state: EditPanelState | null;
  position: DropdownAnchor | null;
  onDismiss: () => void;
  onSubmit: (prompt: string) => void;
  onInteractingChange?: (interacting: boolean) => void;
}

export const EditPanel: Component<EditPanelProps> = (props) => (
  <Show when={props.state}>
    {(state) => (
      <Show keyed when={state().element}>
        {(_element) => (
          <EditPanelBody
            state={state()}
            position={() => props.position}
            onDismiss={props.onDismiss}
            onSubmit={props.onSubmit}
            onInteractingChange={props.onInteractingChange}
          />
        )}
      </Show>
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
  const initialProperties = props.state.properties;

  let searchInputRef: HTMLTextAreaElement | undefined;
  const preview = props.state.preview;

  const [searchQuery, setSearchQuery] = createSignal(props.state.initialSearchQuery ?? "");
  const [inlineNumericSearchQuery, setInlineNumericSearchQuery] = createSignal<string | null>(null);
  const [activeKey, setActiveKey] = createSignal<"left" | "right" | null>(null);
  const tweakStore = createTweakStore({
    initialProperties,
    searchQuery: () => inlineNumericSearchQuery() ?? searchQuery(),
  });
  // Colors are pinned on top but aren't slider-steppable, so the arrow-key
  // cursor lands on the first numeric row instead.
  const firstNumericActiveIndex = (): number => {
    const numericIndex = tweakStore
      .filteredProperties()
      .findIndex((property) => property.kind === "numeric");
    return numericIndex > 0 ? numericIndex : 0;
  };
  const [activeIndex, setActiveIndex] = createSignal(firstNumericActiveIndex());
  const hasPendingTweaks = createMemo(() => tweakStore.hasPendingTweaks());
  const [isCompact, setIsCompact] = createSignal(false);

  let activeKeyTimerId: ReturnType<typeof setTimeout> | undefined;
  let interactingIdleTimerId: ReturnType<typeof setTimeout> | undefined;
  let inlineNumericReplaceTimerId: ReturnType<typeof setTimeout> | undefined;
  let shouldReplaceInlineNumericInput = false;
  const [isTransientInteraction, setIsTransientInteraction] = createSignal(false);
  const isInteracting = createMemo(() => isTransientInteraction() || hasPendingTweaks());
  const [isHeaderHovered, setIsHeaderHovered] = createSignal(false);

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
      setActiveKey((currentKey) => (currentKey === direction ? null : currentKey));
    }, EDIT_PANEL_ACTIVE_KEY_FLASH_MS);
  };

  const effectiveInteracting = createMemo(() => isInteracting() && !isHeaderHovered());

  createEffect(() => {
    const nextInteracting = effectiveInteracting();
    props.onInteractingChange?.(nextInteracting);
  });

  const markAsInteracting = () => {
    setIsTransientInteraction(true);
    clearTimeout(interactingIdleTimerId);
    interactingIdleTimerId = setTimeout(() => {
      setIsTransientInteraction(false);
    }, EDIT_PANEL_ADJUSTING_IDLE_MS);
  };

  const ensureSearchFocused = () => {
    queueMicrotask(() => {
      if (!searchInputRef) return;
      if (getShadowActiveElement(searchInputRef) !== searchInputRef) {
        searchInputRef.focus({ preventScroll: true });
      }
    });
  };

  const keepInlineNumericSearchQuery = () => {
    if (inlineNumericSearchQuery() === null) setInlineNumericSearchQuery(searchQuery());
  };

  const cancelInlineNumericReplacement = () => {
    shouldReplaceInlineNumericInput = false;
    clearTimeout(inlineNumericReplaceTimerId);
  };

  const queueInlineNumericReplacement = () => {
    shouldReplaceInlineNumericInput = false;
    clearTimeout(inlineNumericReplaceTimerId);
    inlineNumericReplaceTimerId = setTimeout(() => {
      shouldReplaceInlineNumericInput = true;
      searchInputRef?.focus({ preventScroll: true });
    }, EDIT_INLINE_NUMERIC_REPLACE_IDLE_MS);
  };

  const replaceInlineNumericPrefix = (nextSearchQuery: string): string => {
    if (!shouldReplaceInlineNumericInput) return nextSearchQuery;
    const currentSearchQuery = searchQuery();
    if (!currentSearchQuery || !nextSearchQuery.startsWith(currentSearchQuery)) {
      cancelInlineNumericReplacement();
      return nextSearchQuery;
    }
    const appendedQuery = nextSearchQuery.slice(currentSearchQuery.length);
    if (!/^[-.\d]/.test(appendedQuery)) return nextSearchQuery;
    cancelInlineNumericReplacement();
    return appendedQuery;
  };

  const expandPanel = () => {
    cancelInlineNumericReplacement();
    setInlineNumericSearchQuery(null);
    setIsCompact(false);
  };

  interface CommitOptions {
    flashDirection?: 1 | -1;
    shouldFocus?: boolean;
    shouldCompact?: boolean;
    isFromKeyRepeat?: boolean;
  }

  const commit = (
    property: EditableProperty,
    nextValue: number | string,
    options: CommitOptions = {},
  ) => {
    tweakStore.applyTweak(property, nextValue);
    preview.apply(property.cssProperties, formatEditableValue(property, nextValue));
    markAsInteracting();
    if (!options.isFromKeyRepeat) discardConfirmation.hide();
    if (options.flashDirection) flashActiveKey(options.flashDirection === 1 ? "right" : "left");
    if (options.shouldFocus) ensureSearchFocused();
    if (options.shouldCompact) setIsCompact(true);
  };

  const isShiftHeld = createShiftTracker();

  const commitTweak = (
    direction: 1 | -1,
    shift: boolean,
    fromRepeat: boolean,
  ): EditableProperty | null => {
    const property = activeProperty();
    if (!property) return null;
    const nextValue = stepProperty(property, direction, shift);
    if (nextValue === null) {
      flashActiveKey(direction === 1 ? "right" : "left");
      return null;
    }
    commit(property, nextValue, {
      flashDirection: direction,
      shouldFocus: true,
      isFromKeyRepeat: fromRepeat,
    });
    return property;
  };

  const stepFromKeyboard = (direction: 1 | -1, shift: boolean, fromRepeat: boolean) => {
    if (commitTweak(direction, shift, fromRepeat)) setIsCompact(true);
  };

  const stepFromPointer = (direction: 1 | -1) => {
    commitTweak(direction, false, false);
  };

  const stepController = createStepController({ step: stepFromKeyboard, isShiftHeld });

  const commitActive = (rawValue: number | string) => {
    const property = activeProperty();
    if (!property) return;
    if (property.kind === "numeric" && typeof rawValue === "number") {
      const clamped = roundEditableNumericValue(clampToRange(rawValue, property.min, property.max));
      if (clamped !== property.value) commit(property, clamped);
      return;
    }
    if (typeof rawValue !== "string") return;
    if (!arePropertyValuesEqual(property, rawValue, property.value)) commit(property, rawValue);
  };

  const activeTailwindLabel = createMemo<string | null>(() => {
    if (!isShiftHeld()) return null;
    const property = activeProperty();
    if (!property || property.kind !== "numeric") return null;
    const cssKey = property.cssProperties[0];
    return cssKey ? findTailwindClass(cssKey, property.value) : null;
  });

  const autoApply = createTailwindAutoApply({
    initialProperties,
    searchQuery,
    isCompact,
    activeProperty,
    commit,
    setIsCompact,
  });

  const isSearchInputHidden = createMemo(
    () => isCompact() && searchQuery() !== "" && autoApply.isInlineNumericEdit(),
  );

  const handleSubmit = () => {
    const pendingEdits = tweakStore.buildPendingEdits();
    const entry = {
      filePath: props.state.filePath ?? "",
      lineNumber: props.state.lineNumber ?? 0,
      edits: pendingEdits,
    };
    props.onSubmit(formatSessionEditsPrompt(pendingEdits.length > 0 ? [entry] : []));
  };

  const discardConfirmation = createDiscardConfirmation();
  const isPendingDismiss = discardConfirmation.isPending;
  let panelSurfaceRef: HTMLDivElement | undefined;

  const playShake = () => {
    if (!panelSurfaceRef) return;
    panelSurfaceRef.classList.remove("animate-shake");
    // Force reflow so re-adding the class restarts the animation.
    void panelSurfaceRef.offsetWidth;
    panelSurfaceRef.classList.add("animate-shake");
  };

  const closePanel = (mode: "preserve" | "discard") => {
    discardConfirmation.hide();
    if (mode === "discard") preview.restore();
    props.onDismiss();
  };

  const attemptDismiss = (source: OverlayDismissSource) => {
    stepController.cancelRepeat();
    if (isPendingDismiss()) {
      closePanel("discard");
      return;
    }
    if (!hasPendingTweaks()) {
      closePanel(preview.hasAppliedStyles() ? "discard" : "preserve");
      return;
    }
    // Always reveal the full panel before anything destructive. A keyboard
    // Escape stops there (so a stray Escape can't nuke pending changes on
    // the collapsed view); an outside click continues to the discard prompt.
    const wasCompact = isCompact();
    expandPanel();
    if (source === "keyboard" && wasCompact) return;
    discardConfirmation.show();
    playShake();
  };

  const navigateActive = (direction: 1 | -1) => {
    const properties = filteredProperties();
    if (properties.length === 0) return;
    setActiveIndex((current) => (current + direction + properties.length) % properties.length);
    expandPanel();
  };

  let colorPickerTriggers: Array<() => void> = [];
  const registerColorPickerTrigger = (trigger: (() => void) | null, owner?: () => void) => {
    if (trigger === null) {
      if (owner === undefined) {
        colorPickerTriggers = [];
        return;
      }
      colorPickerTriggers = colorPickerTriggers.filter(
        (registeredTrigger) => registeredTrigger !== owner,
      );
      return;
    }
    colorPickerTriggers = colorPickerTriggers.filter(
      (registeredTrigger) => registeredTrigger !== trigger,
    );
    colorPickerTriggers.push(trigger);
  };

  const getCurrentColorPickerTrigger = () => {
    return colorPickerTriggers[colorPickerTriggers.length - 1] ?? null;
  };

  const pressArrowOrOpenColorPicker = (key: "ArrowLeft" | "ArrowRight", event: KeyboardEvent) => {
    if (activeProperty()?.kind === "color") {
      if (!event.repeat) getCurrentColorPickerTrigger()?.();
      return;
    }
    stepController.pressArrow(key, event.repeat, event.shiftKey);
  };

  const keyHandlers: Record<string, (event: KeyboardEvent) => void> = {
    ArrowUp: () => navigateActive(-1),
    ArrowDown: () => navigateActive(1),
    ArrowLeft: (event) => pressArrowOrOpenColorPicker("ArrowLeft", event),
    ArrowRight: (event) => pressArrowOrOpenColorPicker("ArrowRight", event),
    Tab: (event) => navigateActive(event.shiftKey ? -1 : 1),
    Enter: () => {
      if (isPendingDismiss()) return;
      const property = activeProperty();
      const colorPickerTrigger = getCurrentColorPickerTrigger();
      // Opening the picker is only a convenience for an untouched color
      // row with nothing else staged. If any edit is pending, Enter must
      // submit it — otherwise the picker interaction dismisses the panel
      // and the pending change is discarded instead of copied.
      const isUntweakedColor =
        property?.kind === "color" && !tweakStore.hasChangedTweakFor(property.key);
      if (isUntweakedColor && colorPickerTrigger && !hasPendingTweaks()) {
        colorPickerTrigger();
        return;
      }
      handleSubmit();
    },
    Escape: () => attemptDismiss("keyboard"),
  };

  const handleSearchKeyDown = (event: KeyboardEvent) => {
    // Chromium reports keyCode 229 on the IME commit tick after isComposing resets.
    if (event.isComposing || event.keyCode === IME_COMPOSING_KEY_CODE) return;
    if (isPendingDismiss()) {
      const target = event.composedPath()[0];
      const isOnDiscardButton =
        target instanceof HTMLElement &&
        target.closest("[data-react-grab-discard-button]") !== null;
      if (isOnDiscardButton && (event.key === "Tab" || event.key === "Enter")) return;
      if (
        event.key === "Tab" ||
        event.key === "ArrowUp" ||
        event.key === "ArrowDown" ||
        event.key === "ArrowLeft" ||
        event.key === "ArrowRight"
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
    }
    const handler = keyHandlers[event.key];
    if (!handler) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    handler(event);
  };

  onMount(() => {
    queueMicrotask(() => {
      searchInputRef?.focus({ preventScroll: true });
      if (searchInputRef) {
        const length = searchInputRef.value.length;
        searchInputRef.setSelectionRange(length, length);
      }
    });
    dropdown.measure();
    const initialQuery = searchQuery();
    if (initialQuery) autoApply.applyTailwindClass(initialQuery);

    const unregisterDismiss = registerOverlayDismiss({
      isOpen: () => true,
      onDismiss: attemptDismiss,
      shouldIgnoreKeyboardEvent: (event) => {
        const target = event.composedPath()[0];
        return (
          isPendingDismiss() &&
          target instanceof HTMLElement &&
          target.closest("[data-react-grab-discard-button]") !== null
        );
      },
      shouldIgnoreRightClick: true,
      shouldIgnoreInputEvents: true,
    });

    const handleWindowKeyDown = (event: KeyboardEvent) => {
      if (isEventFromOverlay(event, "data-react-grab-input")) return;
      handleSearchKeyDown(event);
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
      clearTimeout(activeKeyTimerId);
      clearTimeout(interactingIdleTimerId);
      clearTimeout(inlineNumericReplaceTimerId);
      discardConfirmation.cleanup();
      dropdown.clearAnimationHandles();
      setIsTransientInteraction(false);
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
        role="dialog"
        aria-modal="true"
        aria-label="Style element"
        data-react-grab-ignore-events
        data-react-grab-edit-panel
        data-rg-compact={isCompact() ? "true" : "false"}
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
          "--rg-edit-list-max-h": `${EDIT_PROPERTY_LIST_MAX_HEIGHT_PX}px`,
        }}
        onPointerDown={suppressMenuEvent}
        onMouseDown={suppressMenuEvent}
        onClick={suppressMenuEvent}
        onContextMenu={suppressMenuEvent}
      >
        <div
          ref={panelSurfaceRef}
          class="contain-layout flex flex-col justify-center items-start rounded-[14px] overflow-hidden antialiased w-fit h-fit [font-synthesis:none] [corner-shape:superellipse(1.25)] bg-[var(--rg-panel-bg)]"
          style={{
            "min-width": isCompact() ? undefined : `${EDIT_PANEL_MIN_WIDTH_PX}px`,
            "max-width": `${EDIT_PANEL_MAX_WIDTH_PX}px`,
            transform: `translateX(${stepController.heldDirection() * EDIT_VALUE_BUMP_PX}px)`,
            transition: `transform ${EDIT_VALUE_BUMP_MS}ms ${EDIT_SLIDER_SPRING_EASING}`,
          }}
        >
          <Show
            when={isPendingDismiss()}
            fallback={
              <Show when={!isCompact()}>
                <div
                  class={cn(
                    "contain-layout shrink-0 flex items-center gap-1 pt-1.5 pb-1 h-fit px-2",
                    hasPendingTweaks() ? "w-full self-stretch justify-between" : "w-fit",
                  )}
                  onMouseEnter={() => setIsHeaderHovered(true)}
                  onMouseLeave={() => setIsHeaderHovered(false)}
                >
                  <TagBadge
                    tagName={tagDisplay().tagName}
                    componentName={tagDisplay().componentName}
                    isClickable={false}
                    onClick={() => {}}
                    shrink
                  />
                  <Show when={hasPendingTweaks()}>
                    <button
                      data-react-grab-ignore-events
                      data-react-grab-copy-button
                      type="button"
                      class="contain-layout shrink-0 flex items-center justify-center px-[3px] py-px rounded-sm bg-[var(--rg-surface-hover)] [border-width:0.5px] border-solid border-[var(--rg-border-button)] cursor-pointer transition-all hover:bg-[var(--rg-surface-active)] press-scale h-[17px]"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        handleSubmit();
                      }}
                    >
                      <span class="text-[var(--rg-text-primary)] text-[13px] leading-3.5 font-sans font-medium">
                        Copy
                      </span>
                    </button>
                  </Show>
                </div>
              </Show>
            }
          >
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="rg-discard-prompt-title"
              class="contain-layout shrink-0 flex items-center justify-between gap-2 pt-1.5 pb-1 px-2 w-full self-stretch"
            >
              <span
                id="rg-discard-prompt-title"
                class="text-[var(--rg-text-primary)] text-[13px] leading-4 font-sans font-medium"
              >
                Discard edits?
              </span>
              <div class="flex items-center gap-[5px]">
                <button
                  data-react-grab-ignore-events
                  data-react-grab-discard-button="cancel"
                  type="button"
                  class="contain-layout shrink-0 flex items-center justify-center px-[3px] py-px rounded-sm bg-[var(--rg-surface-hover)] [border-width:0.5px] border-solid border-[var(--rg-border-button)] cursor-pointer transition-all hover:bg-[var(--rg-surface-active)] press-scale h-[17px]"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    discardConfirmation.hide();
                  }}
                >
                  <span class="text-[var(--rg-text-primary)] text-[13px] leading-3.5 font-sans font-medium">
                    No
                  </span>
                </button>
                <button
                  data-react-grab-ignore-events
                  data-react-grab-discard-button="confirm"
                  type="button"
                  class="contain-layout shrink-0 flex items-center justify-center px-[3px] py-px rounded-sm bg-[var(--rg-error-bg)] cursor-pointer transition-all hover:bg-[var(--rg-error-bg-hover)] press-scale h-[17px]"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    closePanel("discard");
                  }}
                >
                  <span class="text-[var(--rg-error-text)] text-[13px] leading-3.5 font-sans font-medium">
                    Yes
                  </span>
                </button>
              </div>
            </div>
          </Show>

          <div
            class={
              isSearchInputHidden()
                ? ""
                : "[font-synthesis:none] contain-layout shrink-0 flex flex-col items-start px-2 py-1.5 w-full self-stretch [border-top-width:0.5px] border-t-solid border-t-[var(--rg-border-subtle)] antialiased"
            }
            style={isSearchInputHidden() ? HIDDEN_FOCUS_PRESERVING_STYLE : undefined}
          >
            <textarea
              ref={(element) => {
                searchInputRef = element;
              }}
              data-react-grab-ignore-events
              data-react-grab-input
              aria-label="Search properties"
              aria-keyshortcuts="Enter Escape ArrowUp ArrowDown ArrowLeft ArrowRight Tab"
              autocapitalize="none"
              autocorrect="off"
              autocomplete="off"
              spellcheck={false}
              tabIndex={isSearchInputHidden() ? -1 : 0}
              class="text-[var(--rg-text-primary)] text-[13px] leading-4 font-medium bg-transparent border-none resize-none w-full p-0 m-0 outline-none"
              style={{
                "caret-color": "var(--rg-text-primary)",
                "field-sizing": "content",
                "min-height": "16px",
                "max-height": "16px",
                "scrollbar-width": "none",
              }}
              value={searchQuery()}
              onInput={(event) => {
                const nextSearchQuery = replaceInlineNumericPrefix(event.currentTarget.value);
                if (nextSearchQuery !== event.currentTarget.value) {
                  event.currentTarget.value = nextSearchQuery;
                }
                if (autoApply.tryApplyNumericValue(nextSearchQuery)) {
                  keepInlineNumericSearchQuery();
                  setSearchQuery(nextSearchQuery);
                  queueInlineNumericReplacement();
                  ensureSearchFocused();
                  return;
                }
                cancelInlineNumericReplacement();
                setSearchQuery(nextSearchQuery);
                if (autoApply.isInlineNumericDraft(nextSearchQuery)) {
                  keepInlineNumericSearchQuery();
                  ensureSearchFocused();
                  return;
                }
                setInlineNumericSearchQuery(null);
                setActiveIndex(nextSearchQuery.trim() === "" ? firstNumericActiveIndex() : 0);
                expandPanel();
                autoApply.applyTailwindClass(nextSearchQuery);
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder={
                isCompact() ? (activeProperty()?.label ?? "Search property") : "Search property"
              }
              rows={1}
            />
          </div>

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
                onCommit={commitActive}
                onColorPickerRegister={registerColorPickerTrigger}
                onEditComplete={ensureSearchFocused}
                onInvalidCommit={playShake}
                onInteract={markAsInteracting}
                isAdjusting={isTransientInteraction}
                activeTailwindLabel={activeTailwindLabel()}
              />
            </div>
          </Show>

          <Show when={isCompact() && activeProperty()}>
            {(compactProperty) => (
              <div
                class="flex items-center justify-center w-full px-3 py-1.5 min-h-[28px]"
                onMouseDown={(event) => event.preventDefault()}
              >
                <ActivePropertyControl
                  property={compactProperty()}
                  activeKey={activeKey()}
                  onStep={stepFromPointer}
                  onCommit={commitActive}
                  onEditComplete={ensureSearchFocused}
                  onInvalidCommit={playShake}
                  onInteract={markAsInteracting}
                  onColorPickerRegister={registerColorPickerTrigger}
                  showLabel={false}
                  tailwindLabel={activeTailwindLabel()}
                  emphasized
                />
              </div>
            )}
          </Show>
        </div>
      </div>
    </Show>
  );
};
