import { createSignal } from "solid-js";
import type { Component } from "solid-js";
import type { ElementListItemProps } from "../../types.js";
import { cn } from "../../utils/cn.js";
import { IconClose } from "../icons/icon-close.jsx";
import { IconOpen } from "../icons/icon-open.jsx";

export const ElementListItem: Component<ElementListItemProps> = (props) => {
  const [isHovered, setIsHovered] = createSignal(false);

  const displayName = () => {
    const { element } = props;
    const componentName = element.componentName;
    const tagName = element.tagName;

    if (componentName) {
      return `${componentName}.${tagName}`;
    }
    return tagName;
  };

  const locationDisplay = () => {
    const { filePath, lineNumber } = props.element;
    if (!filePath) return null;

    // Extract just the filename from the path
    const parts = filePath.split("/");
    const fileName = parts[parts.length - 1];

    if (lineNumber) {
      return `${fileName}:${lineNumber}`;
    }
    return fileName;
  };

  const handleRemove = (e: MouseEvent) => {
    e.stopPropagation();
    props.onRemove();
  };

  return (
    <div
      class={cn(
        "flex items-center justify-between gap-2 px-2 py-1.5 rounded transition-colors cursor-pointer group",
        isHovered() && "bg-black/5",
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={props.onClick}
    >
      <div class="flex items-center gap-1.5 min-w-0 flex-1">
        {/* Component/Tag name badge */}
        <span class="flex items-center gap-0.5 shrink-0">
          <span class="text-[12px] leading-tight font-semibold text-gray-900">
            {displayName()}
          </span>
        </span>

        {/* Arrow separator */}
        <Show when={locationDisplay()}>
          {(location) => (
            <>
              <span class="text-[11px] text-gray-400 shrink-0">&rarr;</span>
              {/* File path */}
              <span class="text-[11px] text-gray-500 truncate min-w-0">
                {location()}
              </span>
            </>
          )}
        </Show>

        {/* Open file icon (shows on hover when clickable) */}
        {props.element.filePath && (
          <IconOpen
            size={10}
            class={cn(
              "text-gray-400 transition-all duration-100 shrink-0",
              isHovered() ? "opacity-100" : "opacity-0",
            )}
          />
        )}
      </div>

      {/* Remove button */}
      <button
        type="button"
        class={cn(
          "p-0.5 rounded transition-all duration-100 shrink-0",
          "hover:bg-red-100 hover:text-red-600",
          isHovered() ? "opacity-100" : "opacity-0",
        )}
        onClick={handleRemove}
        aria-label="Remove element from selection"
      >
        <IconClose size={10} class="text-current" />
      </button>
    </div>
  );
};
