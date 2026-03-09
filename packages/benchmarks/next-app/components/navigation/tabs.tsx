"use client";

import React, { useState } from "react";

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number;
  disabled?: boolean;
  content?: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  onChange?: (tabId: string) => void;
  variant?: "underline" | "pills" | "enclosed";
  fullWidth?: boolean;
}

export function Tabs({
  tabs,
  defaultTab,
  onChange,
  variant = "underline",
  fullWidth = false,
}: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const handleChange = (tabId: string) => {
    setActiveTab(tabId);
    onChange?.(tabId);
  };

  const activeContent = tabs.find((t) => t.id === activeTab)?.content;

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: variant === "pills" ? 4 : 0,
          borderBottom:
            variant === "underline"
              ? "1px solid #E5E7EB"
              : variant === "enclosed"
                ? "1px solid #E5E7EB"
                : "none",
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && handleChange(tab.id)}
            disabled={tab.disabled}
            style={{
              flex: fullWidth ? 1 : undefined,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: variant === "pills" ? "6px 14px" : "10px 16px",
              border: "none",
              fontSize: 14,
              fontWeight: activeTab === tab.id ? 500 : 400,
              cursor: tab.disabled ? "not-allowed" : "pointer",
              opacity: tab.disabled ? 0.5 : 1,
              transition: "all 150ms ease",
              ...(variant === "underline"
                ? {
                    background: "none",
                    color: activeTab === tab.id ? "#111827" : "#6B7280",
                    borderBottom:
                      activeTab === tab.id
                        ? "2px solid #3B82F6"
                        : "2px solid transparent",
                    marginBottom: -1,
                  }
                : variant === "pills"
                  ? {
                      backgroundColor:
                        activeTab === tab.id ? "#111827" : "transparent",
                      color: activeTab === tab.id ? "#FFFFFF" : "#6B7280",
                      borderRadius: 6,
                    }
                  : {
                      background: activeTab === tab.id ? "#FFFFFF" : "#F9FAFB",
                      color: activeTab === tab.id ? "#111827" : "#6B7280",
                      borderRadius: "6px 6px 0 0",
                      border:
                        activeTab === tab.id
                          ? "1px solid #E5E7EB"
                          : "1px solid transparent",
                      borderBottom:
                        activeTab === tab.id ? "1px solid #FFFFFF" : "none",
                      marginBottom: -1,
                    }),
            }}
          >
            {tab.icon}
            {tab.label}
            {tab.badge !== undefined && (
              <span
                style={{
                  fontSize: 11,
                  backgroundColor:
                    activeTab === tab.id ? "rgba(255,255,255,0.2)" : "#E5E7EB",
                  padding: "1px 6px",
                  borderRadius: 10,
                  fontWeight: 600,
                }}
              >
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>
      {activeContent && <div style={{ paddingTop: 16 }}>{activeContent}</div>}
    </div>
  );
}
