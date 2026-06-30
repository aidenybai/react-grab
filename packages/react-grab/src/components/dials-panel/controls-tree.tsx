import { For, Match, Show, Switch, type Component } from "solid-js";
import type { DialValue } from "../../types.js";
import { cn } from "../../utils/cn.js";
import { createMenuList } from "../../utils/create-menu-list.js";
import { EDIT_LABEL_CLASS } from "../edit-panel/constants.js";
import { IconChevron } from "../icons/icon-chevron.jsx";
import { ActionControl } from "./action-control.js";
import {
  DialActiveControl,
  DialNumberActive,
  DialNumberSummary,
  DialValueSummary,
} from "./dial-control.js";
import { SpringVisualization } from "./spring-visualization.js";
import { readSpring, type DialViewRow } from "./view-rows.js";

interface DialRowsProps {
  rows: DialViewRow[];
  activeIndex: number;
  activeKey: "left" | "right" | null;
  getValue: (panelId: string, path: string) => DialValue;
  onToggleFolder: (navIndex: number) => void;
  onActivate: (navIndex: number) => void;
  onCommit: (panelId: string, path: string, value: DialValue) => void;
  onTriggerAction: (panelId: string, path: string) => void;
  onInteract: () => void;
}

const INDENT_PER_DEPTH_PX = 10;

export const DialRows: Component<DialRowsProps> = (props) => {
  const navCount = () =>
    props.rows.reduce((max, row) => ("navIndex" in row ? Math.max(max, row.navIndex) : max), -1) +
    1;

  const menu = createMenuList({
    activeIndex: () => props.activeIndex,
    itemCount: navCount,
    onHoverIndex: (index) => props.onActivate(index),
  });

  const indentStyle = (depth: number) => ({ "padding-left": `${depth * INDENT_PER_DEPTH_PX}px` });

  return (
    <div
      ref={menu.containerRef}
      role="menu"
      aria-orientation="vertical"
      class="relative flex flex-col min-h-0 overflow-y-auto overflow-x-hidden no-scrollbar"
      onPointerMove={menu.handleListPointerMove}
    >
      <div
        ref={menu.highlightRef}
        aria-hidden="true"
        class="pointer-events-none absolute opacity-0 rounded-[6px] transition-[top,left,width,height,opacity] duration-75 ease-out bg-[var(--rg-surface-hover)]"
      />
      <For each={props.rows}>
        {(row) => (
          <Switch>
            <Match when={row.type === "title" && row}>
              {(titleRow) => (
                <Show
                  when={titleRow().collapsible}
                  fallback={
                    <div
                      class={cn(
                        "flex items-center w-full pl-1.5 pr-2 py-1",
                        titleRow().showDivider &&
                          "mt-1 [border-top-width:0.5px] border-solid border-[var(--rg-border-subtle)] pt-2",
                      )}
                    >
                      <span class="text-[var(--rg-text-primary)] text-[13px] leading-4 font-semibold truncate min-w-0">
                        {titleRow().name}
                      </span>
                    </div>
                  }
                >
                  <button
                    type="button"
                    data-react-grab-ignore-events
                    ref={(element) => menu.registerItem(titleRow().navIndex, element)}
                    aria-expanded={!titleRow().collapsed}
                    tabindex={-1}
                    class={cn(
                      "relative z-1 contain-layout flex items-center gap-1 w-full pl-1.5 pr-2 py-1 cursor-pointer border-none bg-transparent text-left",
                      titleRow().showDivider &&
                        "mt-1 [border-top-width:0.5px] border-solid border-[var(--rg-border-subtle)] pt-2",
                    )}
                    {...menu.rowHoverHandlers(titleRow().navIndex)}
                    onPointerDown={(event) => event.stopPropagation()}
                    onMouseDown={menu.handleRowMouseDown}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      props.onToggleFolder(titleRow().navIndex);
                    }}
                  >
                    <IconChevron
                      size={14}
                      class={cn(
                        "text-[var(--rg-text-secondary)] transition-transform duration-150 ease-drawer -ml-0.5 shrink-0",
                        titleRow().collapsed ? "rotate-0" : "rotate-90",
                      )}
                    />
                    <span class="text-[var(--rg-text-primary)] text-[13px] leading-4 font-semibold truncate min-w-0">
                      {titleRow().name}
                    </span>
                  </button>
                </Show>
              )}
            </Match>

            <Match when={row.type === "folder" && row}>
              {(folderRow) => (
                <button
                  type="button"
                  data-react-grab-ignore-events
                  ref={(element) => menu.registerItem(folderRow().navIndex, element)}
                  aria-expanded={!folderRow().collapsed}
                  tabindex={-1}
                  class="relative z-1 contain-layout flex items-center gap-1 w-full h-[24px] pr-2 cursor-pointer border-none bg-transparent text-left"
                  style={{
                    "padding-left": `${4 + folderRow().depth * INDENT_PER_DEPTH_PX}px`,
                  }}
                  {...menu.rowHoverHandlers(folderRow().navIndex)}
                  onPointerDown={(event) => event.stopPropagation()}
                  onMouseDown={menu.handleRowMouseDown}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    props.onToggleFolder(folderRow().navIndex);
                  }}
                >
                  <IconChevron
                    size={14}
                    class={cn(
                      "text-[var(--rg-text-secondary)] transition-transform duration-150 ease-drawer -ml-0.5 shrink-0",
                      folderRow().collapsed ? "rotate-0" : "rotate-90",
                    )}
                  />
                  <span
                    class={`${EDIT_LABEL_CLASS} text-[var(--rg-text-primary)] font-semibold truncate min-w-0`}
                  >
                    {folderRow().label}
                  </span>
                </button>
              )}
            </Match>

            <Match when={row.type === "spring-viz" && row}>
              {(vizRow) => (
                <div class="w-full px-2" style={indentStyle(vizRow().depth)}>
                  <SpringVisualization
                    value={readSpring(props.getValue(vizRow().panelId, vizRow().springPath))}
                  />
                </div>
              )}
            </Match>

            <Match when={row.type === "spring-field" && row}>
              {(fieldRow) => {
                const spring = () =>
                  readSpring(props.getValue(fieldRow().panelId, fieldRow().springPath));
                const isActive = () => props.activeIndex === fieldRow().navIndex;
                const unit = () => (fieldRow().field === "visualDuration" ? "s" : "");
                return (
                  <button
                    type="button"
                    data-react-grab-ignore-events
                    ref={(element) => menu.registerItem(fieldRow().navIndex, element)}
                    tabindex={-1}
                    class="relative z-1 contain-layout block w-full h-[24px] px-0 py-0 cursor-pointer border-none bg-transparent text-left"
                    style={indentStyle(fieldRow().depth)}
                    {...menu.rowHoverHandlers(fieldRow().navIndex)}
                    onPointerDown={(event) => event.stopPropagation()}
                    onMouseDown={menu.handleRowMouseDown}
                    onClick={(event) => {
                      event.stopPropagation();
                      props.onActivate(fieldRow().navIndex);
                    }}
                  >
                    <Show
                      when={isActive()}
                      fallback={
                        <div class="flex items-center justify-between w-full h-[24px] px-2 gap-2">
                          <span
                            class={`${EDIT_LABEL_CLASS} text-[var(--rg-text-primary)] truncate min-w-0`}
                          >
                            {fieldRow().label}
                          </span>
                          <DialNumberSummary value={spring()[fieldRow().field]} unit={unit()} />
                        </div>
                      }
                    >
                      <div class="flex items-center w-full h-[24px]">
                        <DialNumberActive
                          label={fieldRow().label}
                          value={spring()[fieldRow().field]}
                          min={fieldRow().min}
                          max={fieldRow().max}
                          step={fieldRow().step}
                          unit={unit()}
                          activeKey={props.activeKey}
                          onCommit={(value) =>
                            props.onCommit(fieldRow().panelId, fieldRow().springPath, {
                              ...spring(),
                              [fieldRow().field]: value,
                            })
                          }
                          onInteract={props.onInteract}
                        />
                      </div>
                    </Show>
                  </button>
                );
              }}
            </Match>

            <Match when={row.type === "leaf" && row}>
              {(leafRow) => {
                const control = () => leafRow().control;
                const value = () => props.getValue(leafRow().panelId, control().path);
                const isActive = () => props.activeIndex === leafRow().navIndex;
                const isAction = () => control().kind === "action";
                return (
                  <button
                    type="button"
                    data-react-grab-ignore-events
                    ref={(element) => menu.registerItem(leafRow().navIndex, element)}
                    aria-current={isActive() ? "true" : undefined}
                    tabindex={-1}
                    class="relative z-1 contain-layout block w-full h-[24px] px-0 py-0 cursor-pointer border-none bg-transparent text-left"
                    style={indentStyle(leafRow().depth)}
                    {...menu.rowHoverHandlers(leafRow().navIndex)}
                    onPointerDown={(event) => event.stopPropagation()}
                    onMouseDown={menu.handleRowMouseDown}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (isAction()) {
                        props.onTriggerAction(leafRow().panelId, control().path);
                        return;
                      }
                      props.onActivate(leafRow().navIndex);
                    }}
                  >
                    <Show
                      when={isAction()}
                      fallback={
                        <Show
                          when={isActive()}
                          fallback={
                            <div class="flex items-center justify-between w-full h-[24px] px-2 gap-2">
                              <span
                                class={`${EDIT_LABEL_CLASS} text-[var(--rg-text-primary)] truncate min-w-0`}
                              >
                                {control().label}
                              </span>
                              <DialValueSummary control={control()} value={value()} />
                            </div>
                          }
                        >
                          <div class="flex items-center w-full h-[24px]">
                            <DialActiveControl
                              control={control()}
                              value={value()}
                              activeKey={props.activeKey}
                              onCommit={(path, nextValue) =>
                                props.onCommit(leafRow().panelId, path, nextValue)
                              }
                              onTriggerAction={(path) =>
                                props.onTriggerAction(leafRow().panelId, path)
                              }
                              onInteract={props.onInteract}
                            />
                          </div>
                        </Show>
                      }
                    >
                      <div class="flex items-center w-full h-[24px]">
                        <ActionControl
                          label={control().label}
                          onTrigger={() => props.onTriggerAction(leafRow().panelId, control().path)}
                        />
                      </div>
                    </Show>
                  </button>
                );
              }}
            </Match>
          </Switch>
        )}
      </For>
    </div>
  );
};
