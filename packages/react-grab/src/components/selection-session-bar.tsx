import { createEffect, createSignal, on, onCleanup, onMount, Show, type Component } from "solid-js";
import {
  SELECTION_SESSION_BAR_ACCENT_COLOR,
  SELECTION_SESSION_BAR_BACKGROUND_COLOR,
  SELECTION_SESSION_BAR_HEIGHT_PX,
  SELECTION_SESSION_ANIMATION_DURATION_MS,
  SELECTION_SESSION_ANIMATION_EASING,
  Z_INDEX_OVERLAY,
} from "../constants.js";
import { nativeCancelAnimationFrame, nativeRequestAnimationFrame } from "../utils/native-raf.js";

interface SelectionSessionBarProps {
  visible: boolean;
  selectedCount: number;
  multiSelectEnabled: boolean;
  onCancel?: () => void;
  onEnableMultiSelect?: () => void;
  onClear?: () => void;
  onCopy?: () => void;
}

export const SelectionSessionBar: Component<SelectionSessionBarProps> = (props) => {
  const hostname = window.location.hostname || "this page";
  const [shouldRender, setShouldRender] = createSignal(props.visible);
  const [isAnimatedIn, setIsAnimatedIn] = createSignal(false);
  let enterAnimationFrameId: number | null = null;
  let exitAnimationTimerId: number | null = null;

  onMount(() => {
    if (props.visible) {
      enterAnimationFrameId = nativeRequestAnimationFrame(() => setIsAnimatedIn(true));
    }
  });

  createEffect(
    on(
      () => props.visible,
      (visible) => {
        if (enterAnimationFrameId !== null) {
          nativeCancelAnimationFrame(enterAnimationFrameId);
          enterAnimationFrameId = null;
        }
        if (exitAnimationTimerId !== null) {
          window.clearTimeout(exitAnimationTimerId);
          exitAnimationTimerId = null;
        }

        if (visible) {
          setShouldRender(true);
          enterAnimationFrameId = nativeRequestAnimationFrame(() => {
            enterAnimationFrameId = null;
            setIsAnimatedIn(true);
          });
          return;
        }

        setIsAnimatedIn(false);
        exitAnimationTimerId = window.setTimeout(() => {
          exitAnimationTimerId = null;
          setShouldRender(false);
        }, SELECTION_SESSION_ANIMATION_DURATION_MS);
      },
      { defer: true },
    ),
  );

  onCleanup(() => {
    if (enterAnimationFrameId !== null) nativeCancelAnimationFrame(enterAnimationFrameId);
    if (exitAnimationTimerId !== null) window.clearTimeout(exitAnimationTimerId);
  });

  return (
    <Show when={shouldRender()}>
      <div
        data-react-grab-selection-session-bar
        class="fixed inset-x-0 top-0 px-2.5 flex items-center text-white font-sans antialiased [font-synthesis:none] [box-shadow:0_1px_0_rgba(255,255,255,0.08),0_2px_10px_rgba(0,0,0,0.16)] pointer-events-none will-change-[transform,opacity]"
        style={{
          height: `${SELECTION_SESSION_BAR_HEIGHT_PX}px`,
          background: SELECTION_SESSION_BAR_BACKGROUND_COLOR,
          opacity: isAnimatedIn() ? 1 : 0,
          transform: isAnimatedIn() ? "translateY(0)" : "translateY(-100%)",
          transition: `transform ${SELECTION_SESSION_ANIMATION_DURATION_MS}ms ${SELECTION_SESSION_ANIMATION_EASING}, opacity ${SELECTION_SESSION_ANIMATION_DURATION_MS}ms ease-out`,
          "z-index": Z_INDEX_OVERLAY,
        }}
      >
        <div class="flex items-center">
          <button
            data-react-grab-ignore-events
            data-react-grab-selection-session-cancel
            aria-label="Cancel selection"
            type="button"
            class="size-7 flex items-center justify-center rounded-md text-[21px] leading-none font-light text-white/65 hover:text-white hover:bg-white/8 pointer-events-auto cursor-pointer interactive-scale"
            onClick={() => props.onCancel?.()}
          >
            ×
          </button>
        </div>

        <div class="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-[13px] font-medium whitespace-nowrap">
          <span class="text-white/95">Selecting</span>
          <span class="text-white/35">·</span>
          <span class="text-white/65 max-sm:hidden">{hostname}</span>
          <Show when={props.multiSelectEnabled}>
            <span class="text-white/35">·</span>
            <span class="text-white/85 tabular-nums">{props.selectedCount} selected</span>
          </Show>
        </div>

        <div class="ml-auto flex items-center gap-1.5">
          <Show
            when={props.multiSelectEnabled}
            fallback={
              <button
                data-react-grab-ignore-events
                data-react-grab-selection-session-enable-multi-select
                type="button"
                class="h-7 px-2.5 rounded-md text-[12px] font-medium text-white/75 bg-white/8 hover:text-white hover:bg-white/12 pointer-events-auto cursor-pointer interactive-scale"
                onClick={() => props.onEnableMultiSelect?.()}
              >
                Multiple
              </button>
            }
          >
            <button
              data-react-grab-ignore-events
              data-react-grab-selection-session-clear
              type="button"
              disabled={props.selectedCount === 0}
              class="h-7 px-2.5 rounded-md text-[12px] font-medium text-white/65 hover:text-white hover:bg-white/8 disabled:opacity-35 disabled:cursor-default pointer-events-auto cursor-pointer interactive-scale"
              onClick={() => props.onClear?.()}
            >
              Clear
            </button>
            <button
              data-react-grab-ignore-events
              data-react-grab-selection-session-copy
              type="button"
              disabled={props.selectedCount === 0}
              class="h-7 min-w-14 px-2.5 rounded-md text-[12px] font-semibold text-white disabled:opacity-40 disabled:cursor-default pointer-events-auto cursor-pointer interactive-scale"
              style={{ background: SELECTION_SESSION_BAR_ACCENT_COLOR }}
              onClick={() => props.onCopy?.()}
            >
              Copy{props.selectedCount > 0 ? ` ${props.selectedCount}` : ""}
            </button>
          </Show>
        </div>
      </div>
    </Show>
  );
};
