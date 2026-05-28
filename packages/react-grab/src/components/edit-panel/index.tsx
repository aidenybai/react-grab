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
  registerForceDiscard?: (discard: (() => void) | null) => void;
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
  const [isCompact, setIsCompact] = createSignal(false);

  let activeKeyTimerId: ReturnType<typeof setTimeout> | undefined;
  let interactingIdleTimerId: ReturnType<typeof setTimeout> | undefined;
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

  let lastBroadcastedInteracting: boolean | null = null;
  const broadcastInteracting = () => {
    const nextInteracting = isInteracting() && !isHeaderHovered();
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
    fromRepeat?: boolean;
  }

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
    stepController.cancelRepeat();
    setIsPendingDismiss(true);
    clearTimeout(pendingDismissTimerId);
    pendingDismissTimerId = setTimeout(() => {
      setIsPendingDismiss(false);
    }, EDIT_DISCARD_PROMPT_IDLE_MS);
    if (shake) playShake();
  };

  const attemptDismiss = () => {
    stepController.cancelRepeat();
    if (isPendingDismiss()) {
      closePanel("discard");
      return;
    }
    if (!hasPendingTweaks()) {
      closePanel(preview.hasAppliedStyles() ? "discard" : "preserve");
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
      if (isPendingDismiss()) return;
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
    const seed = searchQuery();
    if (seed) autoApply.applyTailwindClass(seed);

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
      setIsTransientInteraction(false);
      broadcastInteracting();
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
                  onMouseEnter={() => {
                    setIsHeaderHovered(true);
                    broadcastInteracting();
                  }}
                  onMouseLeave={() => {
                    setIsHeaderHovered(false);
                    broadcastInteracting();
                  }}
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
                const next = event.currentTarget.value;
                setSearchQuery(next);
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
