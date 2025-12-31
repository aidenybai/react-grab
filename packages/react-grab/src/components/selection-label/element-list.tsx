import { For, Show } from "solid-js";
import type { Component } from "solid-js";
import type { ElementListProps } from "../../types.js";
import { cn } from "../../utils/cn.js";
import { IconChevron } from "../icons/icon-chevron.jsx";
import { ElementListItem } from "./element-list-item.jsx";

export const ElementList: Component<ElementListProps> = (props) => {
  const elementCount = () => props.elements.length;

  return (
    <div class="flex flex-col">
      {/* Header - always visible */}
      <button
        type="button"
        class={cn(
          "flex items-center gap-1.5 px-2 py-1.5 rounded transition-colors",
          "hover:bg-black/5 cursor-pointer",
          props.isExpanded && "bg-black/[0.03]",
        )}
        onClick={props.onToggle}
        aria-expanded={props.isExpanded}
        aria-controls="element-list-content"
      >
        <IconChevron
          size={12}
          class={cn(
            "text-gray-500 transition-transform duration-200",
            props.isExpanded ? "rotate-0" : "rotate-180",
          )}
        />
        <span class="text-[13px] font-medium text-gray-700">
          {elementCount()} {elementCount() === 1 ? "element" : "elements"}
        </span>
      </button>

      {/* Expandable content */}
      <div
        id="element-list-content"
        class={cn(
          "overflow-hidden transition-all duration-200 ease-out",
          props.isExpanded ? "max-h-[200px]" : "max-h-0",
        )}
      >
        <div
          class={cn(
            "flex flex-col py-1 overflow-y-auto",
            "scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent",
            props.isExpanded && "max-h-[180px]",
          )}
        >
          <For each={props.elements}>
            {(element) => (
              <ElementListItem
                element={element}
                onClick={() => props.onElementClick(element)}
                onRemove={() => props.onElementRemove(element)}
              />
            )}
          </For>
        </div>
      </div>

      {/* Separator line when expanded */}
      <Show when={props.isExpanded && props.elements.length > 0}>
        <div class="h-px bg-gray-200 mx-2" />
      </Show>
    </div>
  );
};
