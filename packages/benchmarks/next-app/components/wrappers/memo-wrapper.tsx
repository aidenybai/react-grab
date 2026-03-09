"use client";
import React, { memo } from "react";

const MemoInner = memo(function MemoInner({
  children,
  "data-testid": testId,
}: {
  children: React.ReactNode;
  "data-testid"?: string;
}) {
  return <div data-testid={testId}>{children}</div>;
});

export function MemoWrapper({
  children,
  "data-testid": testId,
}: {
  children: React.ReactNode;
  "data-testid"?: string;
}) {
  return <MemoInner data-testid={testId}>{children}</MemoInner>;
}
