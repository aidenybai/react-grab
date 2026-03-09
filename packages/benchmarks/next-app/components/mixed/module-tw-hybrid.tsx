"use client";
import React from "react";
import styles from "./module-tw-hybrid.module.css";

const items = [
  { label: "Authentication", desc: "Login and signup flows", icon: "🔐" },
  { label: "Dashboard", desc: "Main analytics view", icon: "📊" },
  { label: "Settings", desc: "User preferences", icon: "⚙️" },
  { label: "Billing", desc: "Payment management", icon: "💳" },
];

export function ModuleTwHybrid({
  "data-testid": testId,
}: {
  "data-testid"?: string;
}) {
  return (
    <div className={styles.container} data-testid={testId}>
      <div className={`${styles.header} p-4 bg-[var(--muted)]`}>
        <h3 className={`${styles.headerTitle} text-base`}>
          CSS Modules + Tailwind
        </h3>
        <p className="text-xs text-[var(--muted-foreground)] mt-1">
          Combined styling approaches
        </p>
      </div>
      <div className="divide-y divide-[var(--border)]">
        {items.map((item, i) => (
          <div
            key={item.label}
            className={`${styles.listItem} flex items-center gap-3 p-3`}
            data-testid={i === 0 ? "module-tw-hybrid-item" : undefined}
          >
            <span className="text-xl">{item.icon}</span>
            <div>
              <div className="text-sm font-medium text-[var(--foreground)]">
                {item.label}
              </div>
              <div className="text-xs text-[var(--muted-foreground)]">
                {item.desc}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
