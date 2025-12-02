import {
  Show,
  For,
  createSignal,
  onCleanup,
  onMount,
} from "solid-js";
import type { Component } from "solid-js";
import type { ReactGrabRendererProps, AgentSession } from "../types.js";
import { SelectionBox } from "./selection-box.js";
import { Crosshair } from "./crosshair.js";
import { Spinner } from "./spinner.js";
import { SelectionCursor } from "./selection-cursor.js";
import { SelectionLabel } from "./selection-label.js";

const AGENT_PROGRESS_DURATION_MS = 30000;
const VIEWPORT_MARGIN_PX = 16;

const truncateStatus = (status: string, maxLength = 30): string => {
  if (status.length <= maxLength) return status;
  return `${status.slice(0, maxLength)}…`;
};

const AgentLabel: Component<{
  session: AgentSession;
  zIndex?: number;
}> = (props) => {
  let labelRef: HTMLDivElement | undefined;
  const [progress, setProgress] = createSignal(0);
  const [measuredWidth, setMeasuredWidth] = createSignal(0);
  const [measuredHeight, setMeasuredHeight] = createSignal(0);

  const measureLabel = () => {
    if (labelRef) {
      const rect = labelRef.getBoundingClientRect();
      setMeasuredWidth(rect.width);
      setMeasuredHeight(rect.height);
    }
  };

  onMount(() => {
    measureLabel();
  });

  const animateProgress = () => {
    const elapsed = Date.now() - props.session.createdAt;
    const normalizedTime = elapsed / AGENT_PROGRESS_DURATION_MS;
    const easedProgress = 1 - Math.exp(-normalizedTime);
    setProgress(Math.min(easedProgress, 0.95));
    measureLabel();
    animationId = requestAnimationFrame(animateProgress);
  };

  let animationId = requestAnimationFrame(animateProgress);

  onCleanup(() => {
    if (animationId) cancelAnimationFrame(animationId);
  });

  const displayStatus = () =>
    truncateStatus(props.session.lastStatus || "Please wait…");

  const computedPosition = () => {
    const bounds = props.session.selectionBounds;
    const labelWidth = measuredWidth();
    const labelHeight = measuredHeight();

    if (bounds && labelWidth > 0 && labelHeight > 0) {
      const selectionCenterX = bounds.x + bounds.width / 2;
      const selectionBottom = bounds.y + bounds.height;

      let positionLeft = selectionCenterX - labelWidth / 2;
      let positionTop = selectionBottom + 8;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (positionLeft + labelWidth > viewportWidth - VIEWPORT_MARGIN_PX) {
        positionLeft = viewportWidth - labelWidth - VIEWPORT_MARGIN_PX;
      }
      if (positionLeft < VIEWPORT_MARGIN_PX) {
        positionLeft = VIEWPORT_MARGIN_PX;
      }

      const fitsBelow =
        positionTop + labelHeight <= viewportHeight - VIEWPORT_MARGIN_PX;
      if (!fitsBelow) {
        positionTop = bounds.y - labelHeight - 8;
      }

      return { left: positionLeft, top: positionTop };
    }

    return { left: props.session.position.x, top: props.session.position.y };
  };

  return (
    <div
      ref={labelRef}
      class="fixed rounded text-[11px] font-medium font-sans pointer-events-none overflow-hidden bg-grab-pink-light text-grab-pink border border-grab-pink-border"
      style={{
        top: `${computedPosition().top}px`,
        left: `${computedPosition().left}px`,
        "z-index": props.zIndex?.toString() ?? "2147483647",
        "max-width":
          "calc(100vw - (16px + env(safe-area-inset-left) + env(safe-area-inset-right)))",
      }}
    >
      <Show when={progress() !== undefined}>
        <div
          class="absolute top-0 left-0 bottom-0 bg-grab-pink/20 rounded-[3px] transition-[width] duration-100 ease-out pointer-events-none"
          style={{
            width: `${Math.min(100, Math.max(0, progress() * 100))}%`,
          }}
        />
      </Show>
      <div class="relative py-0.5 px-1.5 flex flex-col">
        <div class="flex items-center text-ellipsis whitespace-nowrap">
          <Spinner />
          <span class="tabular-nums align-middle">{displayStatus()}</span>
        </div>
      </div>
    </div>
  );
};

export const ReactGrabRenderer: Component<ReactGrabRendererProps> = (props) => {
  return (
    <>
      <Show when={props.selectionVisible && props.selectionBounds}>
        <SelectionBox
          variant="selection"
          bounds={props.selectionBounds!}
          visible={props.selectionVisible}
          filePath={props.selectionFilePath}
          lineNumber={props.selectionLineNumber}
          isInputExpanded={props.isInputExpanded}
          isFading={props.selectionLabelStatus === "fading"}
        />
      </Show>

      <Show
        when={
          props.crosshairVisible === true &&
          props.mouseX !== undefined &&
          props.mouseY !== undefined
        }
      >
        <Crosshair
          mouseX={props.mouseX!}
          mouseY={props.mouseY!}
          visible={true}
        />
      </Show>

      <Show when={props.dragVisible && props.dragBounds}>
        <SelectionBox
          variant="drag"
          bounds={props.dragBounds!}
          visible={props.dragVisible}
        />
      </Show>

      <For each={props.grabbedBoxes ?? []}>
        {(box) => (
          <SelectionBox
            variant="grabbed"
            bounds={box.bounds}
            createdAt={box.createdAt}
          />
        )}
      </For>

      <For
        each={
          props.agentSessions ? Array.from(props.agentSessions.values()) : []
        }
      >
        {(session) => (
          <>
            <Show when={session.selectionBounds}>
              <SelectionBox
                variant="processing"
                bounds={session.selectionBounds!}
                visible={true}
              />
            </Show>
            <AgentLabel session={session} zIndex={props.labelZIndex} />
          </>
        )}
      </For>

      <Show when={props.selectionLabelVisible && props.selectionBounds}>
        <SelectionLabel
          tagName={props.selectionTagName}
          selectionBounds={props.selectionBounds}
          visible={props.selectionLabelVisible}
          isInputExpanded={props.isInputExpanded}
          inputValue={props.inputValue}
          hasAgent={props.hasAgent}
          status={props.selectionLabelStatus}
          onInputChange={props.onInputChange}
          onSubmit={props.onInputSubmit}
          onCancel={props.onInputCancel}
          onToggleExpand={props.onToggleExpand}
        />
      </Show>

      <For each={props.labelInstances ?? []}>
        {(instance) => (
          <SelectionLabel
            tagName={instance.tagName}
            selectionBounds={instance.bounds}
            visible={true}
            status={instance.status}
          />
        )}
      </For>

      <Show
        when={
          props.nativeSelectionCursorVisible &&
          props.nativeSelectionCursorX !== undefined &&
          props.nativeSelectionCursorY !== undefined
        }
      >
        <SelectionCursor
          x={props.nativeSelectionCursorX!}
          y={props.nativeSelectionCursorY!}
          tagName={props.nativeSelectionTagName}
          componentName={props.nativeSelectionComponentName}
          elementBounds={props.nativeSelectionBounds}
          visible={props.nativeSelectionCursorVisible}
          onClick={props.onNativeSelectionCopy}
          onEnter={props.onNativeSelectionEnter}
        />
      </Show>
    </>
  );
};
