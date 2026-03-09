"use client";
import React from "react";
import styled from "styled-components";

const DynamicBox = styled.div<{ $type: string }>`
  padding: 16px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: ${({ $type }) => {
    switch ($type) {
      case "info":
        return "#dbeafe";
      case "success":
        return "#dcfce7";
      case "warning":
        return "#fef9c3";
      case "error":
        return "#fecaca";
      default:
        return "var(--muted)";
    }
  }};
`;

function InfoRenderer() {
  return <div>ℹ Info content rendered dynamically</div>;
}

function SuccessRenderer() {
  return <div>✓ Success content rendered dynamically</div>;
}

function WarningRenderer() {
  return <div>⚠ Warning content rendered dynamically</div>;
}

function ErrorRenderer() {
  return <div>✕ Error content rendered dynamically</div>;
}

const renderers: Record<string, React.ComponentType> = {
  info: InfoRenderer,
  success: SuccessRenderer,
  warning: WarningRenderer,
  error: ErrorRenderer,
};

export function DynamicRenderer({
  type,
  "data-testid": testId,
}: {
  type: string;
  "data-testid"?: string;
}) {
  const Renderer = renderers[type] || renderers.info;
  return (
    <DynamicBox $type={type} data-testid={testId}>
      <Renderer />
    </DynamicBox>
  );
}
