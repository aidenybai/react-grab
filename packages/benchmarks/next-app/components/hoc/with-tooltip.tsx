"use client";
import React, { forwardRef, memo, ComponentType } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";

export function withTooltip<P extends object>(
  WrappedComponent: ComponentType<P>,
  tooltipContent?: string,
) {
  const Inner = memo(
    forwardRef<HTMLDivElement, P>((props, ref) => (
      <Tooltip.Provider>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <div ref={ref} style={{ display: "contents" }}>
              <WrappedComponent
                {...(props as P & React.JSX.IntrinsicAttributes)}
              />
            </div>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content sideOffset={5}>
              {tooltipContent || "Tooltip"}
              <Tooltip.Arrow />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
    )),
  );
  Inner.displayName = `withTooltip(${WrappedComponent.displayName || WrappedComponent.name || "Component"})`;
  return Inner as unknown as ComponentType<P>;
}
