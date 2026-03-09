"use client";
import React from "react";

interface ToolbarAction {
  icon: string;
  label: string;
  onClick: () => void;
  active?: boolean;
}

interface EditorToolbarProps {
  actions: ToolbarAction[];
  onUndo?: () => void;
  onRedo?: () => void;
}

export const EditorToolbar = ({
  actions,
  onUndo,
  onRedo,
}: EditorToolbarProps) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: "4px",
      padding: "8px 12px",
      borderBottom: "1px solid #e5e7eb",
      background: "#fafafa",
    }}
  >
    {onUndo && (
      <button
        onClick={onUndo}
        style={{
          padding: "4px 8px",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          fontSize: "13px",
        }}
      >
        Undo
      </button>
    )}
    {onRedo && (
      <button
        onClick={onRedo}
        style={{
          padding: "4px 8px",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          fontSize: "13px",
        }}
      >
        Redo
      </button>
    )}
    <div
      style={{
        width: "1px",
        height: "20px",
        background: "#e5e7eb",
        margin: "0 4px",
      }}
    />
    {actions.map((action) => (
      <button
        key={action.label}
        onClick={action.onClick}
        title={action.label}
        style={{
          padding: "4px 8px",
          borderRadius: "4px",
          border: "none",
          background: action.active ? "#e5e7eb" : "transparent",
          cursor: "pointer",
          fontSize: "14px",
        }}
      >
        {action.icon}
      </button>
    ))}
  </div>
);
