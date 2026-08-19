import { omit, type Component, type Element } from "solid-js";
import type { JSX } from "@solidjs/web";
import { cn } from "../../utils/cn.js";
import { createVariants } from "../../utils/create-variants.js";

const surfaceVariants = createVariants(
  "contain-layout antialiased [font-synthesis:none] bg-[var(--rg-panel-bg)]",
  {
    variants: {
      shape: {
        panel: "rounded-[14px] [corner-shape:superellipse(1.25)]",
        pill: "rounded-full",
      },
    },
    defaultVariants: { shape: "panel" },
  },
);

interface SurfaceProps extends JSX.HTMLAttributes<HTMLDivElement> {
  shape?: "panel" | "pill";
  children?: Element;
}

export const Surface: Component<SurfaceProps> = (props) => {
  const rest = omit(props, "shape", "class");
  return <div class={cn(surfaceVariants({ shape: props.shape }), props.class)} {...rest} />;
};
