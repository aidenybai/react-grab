import type React from "react";
import { cn } from "../../utils/cn";

interface TagBadgeProps {
  tagName: string;
  componentName?: string;
  shrink?: boolean;
}

export const TagBadge: React.FC<TagBadgeProps> = ({
  tagName,
  componentName,
  shrink,
}) => {
  return (
    <div
      className={cn(
        "flex items-center gap-1 max-w-[280px] overflow-hidden",
        shrink && "shrink-0",
      )}
    >
      <span className="text-[13px] leading-4 h-fit font-medium overflow-hidden text-ellipsis whitespace-nowrap min-w-0">
        {componentName ? (
          <>
            <span className="text-black">{componentName}</span>
            <span className="text-black/50">.{tagName}</span>
          </>
        ) : (
          <span className="text-black">{tagName}</span>
        )}
      </span>
    </div>
  );
};
