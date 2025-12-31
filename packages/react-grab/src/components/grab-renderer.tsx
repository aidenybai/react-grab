import { Show, For, createMemo, createEffect, createSignal, onCleanup } from "solid-js";
import type { Component } from "solid-js";
import { grab, theme, pointer, targetEl, isActive, isCopying, grabbedBoxes } from "../core/state.js";
import { getOverlays } from "../core/extend.js";
import { createElementBounds } from "../utils/create-element-bounds.js";
import { getTagName } from "../utils/get-tag-name.js";
import { getNearestComponentName } from "../core/context.js";
import { SelectionBox } from "./selection-box.js";
import { Crosshair } from "./crosshair.js";
import { SelectionLabel } from "./selection-label.js";
import { Toolbar } from "./toolbar/index.js";
import { deactivate } from "../core/actions.js";
import type { OverlayBounds } from "../types.js";
import { BOUNDS_RECALC_INTERVAL_MS } from "../constants.js";

export const GrabRenderer: Component = () => {
  const currentTheme = theme;
  const currentPointer = pointer;
  const currentTarget = targetEl;
  const active = isActive;
  const copying = isCopying;
  const boxes = grabbedBoxes;

  const [targetBounds, setTargetBounds] = createSignal<OverlayBounds | null>(null);
  const [componentName, setComponentName] = createSignal<string | undefined>(undefined);

  createEffect(() => {
    const target = currentTarget();
    if (!target) {
      setTargetBounds(null);
      setComponentName(undefined);
      return;
    }

    setTargetBounds(createElementBounds(target));

    void getNearestComponentName(target).then((name) => {
      if (currentTarget() === target) {
        setComponentName(name ?? undefined);
      }
    });

    const intervalId = setInterval(() => {
      if (currentTarget() === target) {
        setTargetBounds(createElementBounds(target));
      }
    }, BOUNDS_RECALC_INTERVAL_MS);

    onCleanup(() => clearInterval(intervalId));
  });

  const tagName = createMemo(() => {
    const target = currentTarget();
    return target ? getTagName(target) : undefined;
  });

  const overlayComponents = createMemo(() => getOverlays());

  const selectionLabelStatus = createMemo(() => {
    if (copying()) return "copying" as const;
    return "idle" as const;
  });

  return (
    <>
      <Show when={active() && targetBounds() && currentTheme().selectionBox.enabled}>
        <SelectionBox
          variant="selection"
          bounds={targetBounds()!}
          visible={true}
          isFading={copying()}
        />
      </Show>

      <Show when={active() && currentPointer() && currentTheme().crosshair.enabled}>
        <Crosshair
          mouseX={currentPointer()!.x}
          mouseY={currentPointer()!.y}
          visible={true}
        />
      </Show>

      <For each={boxes()}>
        {(box) => (
          <SelectionBox
            variant="grabbed"
            bounds={box.bounds}
            createdAt={box.createdAt}
          />
        )}
      </For>

      <Show when={active() && targetBounds() && currentTheme().elementLabel.enabled}>
        <SelectionLabel
          tagName={tagName()}
          componentName={componentName()}
          selectionBounds={targetBounds() ?? undefined}
          mouseX={currentPointer()?.x}
          visible={true}
          status={selectionLabelStatus()}
          hasAgent={false}
          isAgentConnected={false}
          onCancel={deactivate}
        />
      </Show>

      <For each={overlayComponents()}>
        {(OverlayComponent) => <OverlayComponent />}
      </For>

      <Show when={currentTheme().toolbar.enabled}>
        <Toolbar
          isActive={active()}
          onToggle={() => {
            if (active()) {
              deactivate();
            } else {
              const state = grab();
              if (state.state === "idle") {
                void import("../core/actions.js").then(({ activate }) => {
                  activate({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
                });
              }
            }
          }}
        />
      </Show>
    </>
  );
};
