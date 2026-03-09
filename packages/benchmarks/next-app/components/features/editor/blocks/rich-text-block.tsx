"use client";
import React, { useState } from "react";

interface RichTextBlockProps {
  initialContent?: string;
  placeholder?: string;
  onSave?: (content: string) => void;
  readOnly?: boolean;
}

const toolbarButtons = [
  { label: "B", style: "fontWeight", value: "bold", title: "Bold" },
  { label: "I", style: "fontStyle", value: "italic", title: "Italic" },
  {
    label: "U",
    style: "textDecoration",
    value: "underline",
    title: "Underline",
  },
] as const;

export const RichTextBlock = ({
  initialContent = "",
  placeholder = "Start typing...",
  onSave,
  readOnly = false,
}: RichTextBlockProps) => {
  const [content, setContent] = useState(initialContent);
  const [activeStyles, setActiveStyles] = useState<Set<string>>(new Set());
  const [isFocused, setIsFocused] = useState(false);

  const toggleStyle = (style: string) => {
    setActiveStyles((prev) => {
      const next = new Set(prev);
      if (next.has(style)) {
        next.delete(style);
      } else {
        next.add(style);
      }
      return next;
    });
  };

  return (
    <div
      data-testid="deep-rich-text-block"
      style={{
        border: `1px solid ${isFocused ? "#2563eb" : "#e5e7eb"}`,
        borderRadius: "8px",
        overflow: "hidden",
        transition: "border-color 150ms ease",
      }}
    >
      {!readOnly && (
        <div
          style={{
            display: "flex",
            gap: "2px",
            padding: "6px 8px",
            borderBottom: "1px solid #e5e7eb",
            background: "#f9fafb",
          }}
        >
          {toolbarButtons.map((btn) => (
            <button
              key={btn.title}
              title={btn.title}
              onClick={() => toggleStyle(btn.style)}
              style={{
                width: "28px",
                height: "28px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "4px",
                border: "none",
                background: activeStyles.has(btn.style)
                  ? "#e5e7eb"
                  : "transparent",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: btn.label === "B" ? 700 : 400,
                fontStyle: btn.label === "I" ? "italic" : "normal",
                textDecoration: btn.label === "U" ? "underline" : "none",
              }}
            >
              {btn.label}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          {onSave && (
            <button
              onClick={() => onSave(content)}
              style={{
                padding: "4px 10px",
                borderRadius: "4px",
                border: "none",
                background: "#2563eb",
                color: "#fff",
                fontSize: "12px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Save
            </button>
          )}
        </div>
      )}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        readOnly={readOnly}
        style={{
          width: "100%",
          minHeight: "120px",
          padding: "12px",
          border: "none",
          outline: "none",
          resize: "vertical",
          fontSize: "14px",
          lineHeight: "1.6",
          fontFamily: "inherit",
          fontWeight: activeStyles.has("fontWeight") ? 700 : 400,
          fontStyle: activeStyles.has("fontStyle") ? "italic" : "normal",
          textDecoration: activeStyles.has("textDecoration")
            ? "underline"
            : "none",
          background: readOnly ? "#f9fafb" : "#fff",
        }}
      />
    </div>
  );
};
