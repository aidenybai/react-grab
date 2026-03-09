"use client";
import React, { forwardRef, memo } from "react";

const ForwardRefInner = memo(
  forwardRef<
    HTMLDivElement,
    { children: React.ReactNode; "data-testid"?: string }
  >(function ForwardRefInner({ children, "data-testid": testId }, ref) {
    return (
      <div ref={ref} data-testid={testId}>
        {children}
      </div>
    );
  }),
);

export function ForwardRefWrapper({
  children,
  "data-testid": testId,
}: {
  children: React.ReactNode;
  "data-testid"?: string;
}) {
  return <ForwardRefInner data-testid={testId}>{children}</ForwardRefInner>;
}
