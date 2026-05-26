import { createMemo, createSignal, onCleanup, onMount, Show, type Component } from "solid-js";
import {
  DROPDOWN_EDGE_TRANSFORM_ORIGIN,
  EDIT_DISCARD_PROMPT_IDLE_MS,
  EDIT_PANEL_ACTIVE_KEY_FLASH_MS,
  EDIT_PANEL_ADJUSTING_IDLE_MS,
  EDIT_PANEL_MAX_WIDTH_PX,
  EDIT_PANEL_MIN_WIDTH_PX,
  EDIT_PROPERTY_LIST_MAX_HEIGHT_PX,
  EDIT_SLIDER_SPRING_EASING,
  EDIT_VALUE_BUMP_MS,
  EDIT_VALUE_BUMP_PX,
  IME_COMPOSING_KEY_CODE,
  Z_INDEX_OVERLAY,
} from "../../constants.js";
import type { DropdownAnchor, EditableProperty, EditPanelState } from "../../types.js";
import { clampToRange } from "../../utils/clamp-to-range.js";
import { cn } from "../../utils/cn.js";
import { createAnchoredDropdown } from "../../utils/create-anchored-dropdown.js";
import { findTailwindClass } from "../../utils/find-tailwind-class.js";
import { cleanNumericValue, formatEditableValue } from "../../utils/format-css-value.js";
import { formatSessionEditsPrompt } from "../../utils/format-edit-prompt.js";
import { getTagDisplay } from "../../utils/get-tag-display.js";
import { registerOverlayDismiss } from "../../utils/register-overlay-dismiss.js";
import { suppressMenuEvent } from "../../utils/suppress-menu-event.js";
import { TagBadge } from "../selection-label/tag-badge.js";
import { ActivePropertyControl } from "./active-property-control.js";
import { HIDDEN_FOCUS_PRESERVING_STYLE } from "./constants.js";
import { createPreviewStyles } from "./preview-styles.js";
import { PropertyList } from "./property-list.js";
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
  // Wired from `editMode.registerForceDiscard` — the panel calls this
  // on mount with a closure that reverts in-progress preview styles,
  // and nulls it on unmount. `reset()` (deactivate path) invokes the
  // current closure before clearing state.
  registerForceDiscard?: (discard: (() => void) | null) => void;
  onInteractingChange?: (interacting: boolean) => void;
}

// Key on `state.element` identity — NOT on the state object itself.
// `editMode.trigger`'s async `getNearestComponentName(element).then(...)`
// produces a fresh state object via `{ ...current, componentName }`.
// Keying on the object would tear down the panel body mid-edit and
// lose in-flight tweaks + preview baseline. The body still rebuilds
// when the user opens the panel against a different element.
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
            registerForceDiscard={props.registerForceDiscard}
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
  registerForceDiscard?: (discard: (() => void) | null) => void;
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
  const hasPendingTweaks = createMemo(() => tweakStore.hasPendingTweaks());
  // Compact mode shows just the value stepper. Driven by user actions
  // (commit / step → compact; navigate / search → expanded), not derived
  // from search content.
  const [isCompact, setIsCompact] = createSignal(false);

  let activeKeyTimerId: ReturnType<typeof setTimeout> | undefined;
  let interactingIdleTimerId: ReturnType<typeof setTimeout> | undefined;
  // Transient pulse: composed via OR with hasPendingTweaks so the
  // page-level overlay stays hidden for the whole edit session without
  // this timer encoding latch logic.
  const [isTransientInteraction, setIsTransientInteraction] = createSignal(false);
  const isInteracting = createMemo(() => isTransientInteraction() || hasPendingTweaks());

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

  // Single source: every write to interacting state goes through here
  // (or the cleanup path). Avoids a createEffect-as-event-bus that
  // would re-fire `(false)` during unmount on top of the explicit
  // cleanup call.
  let lastBroadcastedInteracting: boolean | null = null;
  const broadcastInteracting = () => {
    const nextInteracting = isInteracting();
    if (nextInteracting === lastBroadcastedInteracting) return;
    lastBroadcastedInteracting = nextInteracting;
    props.onInteractingChange?.(nextInteracting);
  };

  const markAsInteracting = () => {
    setIsTransientInteraction(true);
    broadcastInteracting();
    clearTimeout(interactingIdleTimerId);
    interactingIdleTimerId = setTimeout(() => {
      setIsTransientInteraction(false);
      broadcastInteracting();
    }, EDIT_PANEL_ADJUSTING_IDLE_MS);
  };

  const ensureSearchFocused = () => {
    queueMicrotask(() => {
      if (!searchInputRef) return;
      // The panel mounts inside a Shadow DOM. `ownerDocument.activeElement`
      // returns the shadow HOST (overlay container), never our textarea
      // inside the shadow root — so a naive `!==` check is always true
      // and `.focus()` fires on every commit (focus event spam + IME
      // cursor reset). Read via getRootNode() + shadowRoot.activeElement.
      const rootNode = searchInputRef.getRootNode();
      const focusedElement =
        rootNode instanceof ShadowRoot
          ? (rootNode.activeElement as HTMLElement | null)
          : (searchInputRef.ownerDocument.activeElement as HTMLElement | null);
      if (focusedElement !== searchInputRef) {
        searchInputRef.focus({ preventScroll: true });
      }
    });
  };

  interface CommitOptions {
    flash?: 1 | -1;
    focus?: boolean;
    compact?: boolean;
    // True when the commit was triggered by a held-key auto-repeat
    // tick. Skips UI-state side-effects (clearing the discard prompt)
    // that would otherwise fire 60×/sec while a key is held.
    fromRepeat?: boolean;
  }

  // Canonical write path for every committed tweak. The store owns
  // kind-tagged storage, preview owns inline styles, markAsInteracting
  // owns the overlay-hide pulse. Options just gate optional side-effects.
  const commit = (
    property: EditableProperty,
    nextValue: number | string,
    options: CommitOptions = {},
  ) => {
    tweakStore.applyTweak(property, nextValue);
    preview.apply(property.cssProperties, formatEditableValue(property, nextValue));
    markAsInteracting();
    if (!options.fromRepeat) setIsPendingDismiss(false);
    if (options.flash) flashActiveKey(options.flash === 1 ? "right" : "left");
    if (options.focus) ensureSearchFocused();
    if (options.compact) setIsCompact(true);
  };

  const isShiftHeld = createShiftTracker();

  const commitTweak = (
    direction: 1 | -1,
    shift: boolean,
    fromRepeat: boolean,
  ): EditableProperty | null => {
    const property = activeProperty();
    if (!property) return null;
    const next = stepProperty(property, direction, shift);
    if (next === null) {
      flashActiveKey(direction === 1 ? "right" : "left");
      return null;
    }
    commit(property, next, { flash: direction, focus: true, fromRepeat });
    return property;
  };

  const stepFromKeyboard = (direction: 1 | -1, shift: boolean, fromRepeat: boolean) => {
    if (commitTweak(direction, shift, fromRepeat)) setIsCompact(true);
  };

  const stepFromPointer = (direction: 1 | -1) => {
    commitTweak(direction, false, false);
  };

  const stepController = createStepController({ step: stepFromKeyboard, isShiftHeld });

  // Single commit path the ActivePropertyControl dispatches into. The
  // child component already gates on kind via its <Switch>, so each
  // caller passes the right value type (number for the slider; hex
  // string for the picker; option string for the cycle control).
  const commitActive = (rawValue: number | string) => {
    const property = activeProperty();
    if (!property) return;
    if (property.kind === "numeric") {
      if (typeof rawValue !== "number") return;
      const next = cleanNumericValue(clampToRange(rawValue, property.min, property.max));
      if (next === property.value) return;
      commit(property, next);
      return;
    }
    if (property.kind === "color") {
      if (typeof rawValue !== "string") return;
      if (rawValue.toLowerCase() === property.value.toLowerCase()) return;
      commit(property, rawValue);
      return;
    }
    if (typeof rawValue !== "string") return;
    if (rawValue === property.value) return;
    commit(property, rawValue);
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

  // Search textarea hides in compact mode when there's nothing in it
  // to show — empty query, or pure-number streaming through to the
  // active numeric row (Slot already mirrors the digits).
  const isSearchInputHidden = createMemo(
    () => isCompact() && (searchQuery() === "" || autoApply.isInlineNumericEdit()),
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

  // Two-step dismiss when there are pending tweaks: first attempt
  // shakes + shows the discard prompt; second Escape confirms "Yes".
  const [isPendingDismiss, setIsPendingDismiss] = createSignal(false);
  let panelSurfaceRef: HTMLDivElement | undefined;
  let pendingDismissTimerId: ReturnType<typeof setTimeout> | undefined;

  const playShake = () => {
    if (!panelSurfaceRef) return;
    panelSurfaceRef.classList.remove("animate-shake");
    // Force reflow so re-adding the class restarts the animation.
    void panelSurfaceRef.offsetWidth;
    panelSurfaceRef.classList.add("animate-shake");
  };

  // Two paths out: `preserve` keeps the inline-style preview on the
  // element; `discard` reverts and is reachable through the explicit
  // "Yes" confirm button or a second Escape while the prompt is visible.
  const closePanel = (mode: "preserve" | "discard") => {
    clearTimeout(pendingDismissTimerId);
    if (mode === "discard") preview.restore();
    props.onDismiss();
  };

  const hidePendingDismissPrompt = () => {
    clearTimeout(pendingDismissTimerId);
    setIsPendingDismiss(false);
  };

  const showPendingDismissPrompt = (shake: boolean) => {
    setIsPendingDismiss(true);
    clearTimeout(pendingDismissTimerId);
    pendingDismissTimerId = setTimeout(() => {
      setIsPendingDismiss(false);
    }, EDIT_DISCARD_PROMPT_IDLE_MS);
    if (shake) playShake();
  };

  const attemptDismiss = () => {
    if (!hasPendingTweaks()) {
      closePanel("preserve");
      return;
    }
    showPendingDismissPrompt(!isPendingDismiss());
  };

  const navigateActive = (direction: 1 | -1) => {
    const properties = filteredProperties();
    if (properties.length === 0) return;
    setActiveIndex((current) => (current + direction + properties.length) % properties.length);
    setIsCompact(false);
  };

  let colorPickerTrigger: (() => void) | null = null;
  // Identity-guard the unregister: a stale ColorPicker unmount (e.g.
  // sibling row navigation where the new row's mount runs before the
  // previous row's cleanup) must NOT clobber a freshly-registered
  // trigger. Compare against `owner` to scope the null write.
  const registerColorPickerTrigger = (trigger: (() => void) | null, owner?: () => void) => {
    if (trigger === null) {
      if (owner !== undefined && colorPickerTrigger !== owner) return;
      colorPickerTrigger = null;
      return;
    }
    colorPickerTrigger = trigger;
  };

  const keyHandlers: Record<string, (event: KeyboardEvent) => void> = {
    ArrowUp: () => navigateActive(-1),
    ArrowDown: () => navigateActive(1),
    ArrowLeft: (event) => stepController.pressArrow("ArrowLeft", event.repeat, event.shiftKey),
    ArrowRight: (event) => stepController.pressArrow("ArrowRight", event.repeat, event.shiftKey),
    Tab: (event) => navigateActive(event.shiftKey ? -1 : 1),
    Enter: () => {
      // Discard prompt up: ignore Enter so the user has to explicitly
      // pick No or Yes. Otherwise the focused search textarea forwards
      // Enter into handleSubmit and we'd copy the pending edits while
      // the prompt is still asking whether to keep them.
      if (isPendingDismiss()) return;
      // Colour rows: first Enter opens the native picker; subsequent
      // Enters submit like every other kind.
      const property = activeProperty();
      const isUntweakedColor = property?.kind === "color" && !tweakStore.hasTweakFor(property.key);
      if (isUntweakedColor && colorPickerTrigger) {
        colorPickerTrigger();
        return;
      }
      handleSubmit();
    },
    Escape: () => {
      if (isPendingDismiss()) {
        closePanel("discard");
        return;
      }
      attemptDismiss();
    },
  };

  const handleSearchKeyDown = (event: KeyboardEvent) => {
    // `isComposing` is false on the IME-commit `Enter` tick that
    // confirms a candidate; Chromium reports `keyCode === 229` on
    // that tick. Check both to avoid submitting pending edits when
    // the user was actually picking a Hiragana/Hangul candidate.
    if (event.isComposing || event.keyCode === IME_COMPOSING_KEY_CODE) return;
    // Discard-prompt keyboard routing:
    //   • Tab / Enter on a focused discard button pass through so
    //     native button focus movement + activation work.
    //   • Arrow / Tab list-navigation + value-step handlers are
    //     blocked entirely while the prompt is up — changing a tweak
    //     mid-prompt is incoherent with "do you want to discard your
    //     edits?".
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

  // activeIndex clamp is handled at the read boundary in
  // `activeProperty()` (Math.min/Math.max) — every write path that can
  // shrink the list (search input onInput) already resets to 0, so no
  // repair effect is needed.

  onMount(() => {
    queueMicrotask(() => {
      searchInputRef?.focus({ preventScroll: true });
      // Append-to-seed flow: next keystroke extends the query rather
      // than overwriting it.
      if (searchInputRef) {
        const length = searchInputRef.value.length;
        searchInputRef.setSelectionRange(length, length);
      }
    });
    dropdown.measure();
    const seed = searchQuery();
    if (seed) autoApply.applyTailwindClass(seed);

    // Force-discard hook: when the renderer deactivates mid-edit
    // (toolbar toggled off, page navigation, etc.), `editMode.reset`
    // calls this BEFORE clearing state — gives us a chance to revert
    // in-progress preview styles instead of stranding them on the DOM.
    props.registerForceDiscard?.(() => preview.restore());
    onCleanup(() => props.registerForceDiscard?.(null));

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
      // Inline editors (search textarea / click-to-type) own their own
      // Escape; the panel still gets Escape via its window handler.
      shouldIgnoreInputEvents: true,
    });

    // Window-level keydown — compact mode hides the textarea 0×0 and
    // some browsers blur it. Page editable targets keep their own
    // semantics. composedPath()[0] sees through the Shadow DOM
    // retargeting.
    const isPageEditableTarget = (target: EventTarget | undefined): boolean => {
      if (!(target instanceof HTMLElement)) return false;
      if (target instanceof HTMLInputElement) return true;
      if (target instanceof HTMLTextAreaElement) return true;
      if (target.isContentEditable) return true;
      return false;
    };
    const handleWindowKeyDown = (event: KeyboardEvent) => {
      if (isPageEditableTarget(event.composedPath()[0])) return;
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
      clearTimeout(pendingDismissTimerId);
      dropdown.clearAnimationHandles();
      // Bridge stops firing on unmount — tell the parent the overlay
      // can return. broadcastInteracting dedups, so this is safe even
      // when the panel was already idle at unmount time.
      setIsTransientInteraction(false);
      broadcastInteracting();
      // All dismissals preserve tweaks — inline styles stay applied.
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
        aria-label="Edit element styles"
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
          {/* Top row: TagBadge in normal mode, discard-confirm UI when
              there's a pending dismiss. Discard takes over the whole
              row so the prompt lives where the user's eye already is
              (the element title). */}
          <Show
            when={isPendingDismiss()}
            fallback={
              <Show when={!isCompact()}>
                <div
                  class={cn(
                    "contain-layout shrink-0 flex items-center gap-1 pt-1.5 pb-1 h-fit px-2",
                    hasPendingTweaks() ? "w-full self-stretch justify-between" : "w-fit",
                  )}
                >
                  <TagBadge
                    tagName={tagDisplay().tagName}
                    componentName={tagDisplay().componentName}
                    isClickable={false}
                    onClick={() => {}}
                    shrink
                    forceShowIcon={false}
                  />
                  <Show when={hasPendingTweaks()}>
                    <button
                      data-react-grab-ignore-events
                      data-react-grab-copy-button
                      type="button"
                      class="contain-layout shrink-0 flex items-center justify-center px-[5px] py-px rounded-sm bg-[var(--rg-submit-bg)] [border-width:0.5px] border-solid border-[var(--rg-border-button)] cursor-pointer transition-all press-scale h-[17px]"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        handleSubmit();
                      }}
                    >
                      <span class="text-[var(--rg-submit-fg)] text-[13px] leading-3.5 font-sans font-medium">
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
                    hidePendingDismissPrompt();
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

          {/* Search input. Always mounted (owns focus). Hidden when
              compact AND empty — typing into it would re-show it via
              setIsCompact(false) in onInput. When compact but the user
              already typed something, keeps showing so they can see
              what they typed. */}
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
                "caret-color": searchQuery() === "" ? "transparent" : "var(--rg-text-primary)",
                "field-sizing": "content",
                "min-height": "16px",
                "max-height": "16px",
                "scrollbar-width": "none",
              }}
              value={searchQuery()}
              onInput={(event) => {
                const next = event.currentTarget.value;
                setSearchQuery(next);
                // Pure-number typing in compact + numeric active stays
                // compact and short-circuits the search flow so the
                // active row identity isn't reshuffled mid-keystroke.
                if (autoApply.tryApplyNumericValue(next)) return;
                setActiveIndex(0);
                setIsCompact(false);
                autoApply.applyTailwindClass(next);
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

          {/* Compact-mode dropdown — the same control that owns the
              active row in the list, just emphasized + without the
              inner label. ColorPicker registers its trigger only via
              the list instance (canonical registrant) so omit the
              register prop here. */}
          <Show when={isCompact() && activeProperty()}>
            {(activeProp) => (
              <div
                class="flex items-center justify-center w-full px-3 py-1.5 min-h-[28px]"
                onMouseDown={(event) => event.preventDefault()}
              >
                <ActivePropertyControl
                  property={activeProp()}
                  activeKey={activeKey()}
                  onStep={stepFromPointer}
                  onCommit={commitActive}
                  onEditComplete={ensureSearchFocused}
                  onInvalidCommit={playShake}
                  onInteract={markAsInteracting}
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
