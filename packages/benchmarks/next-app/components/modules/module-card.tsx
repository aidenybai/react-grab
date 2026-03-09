"use client";
import React from "react";
import styles from "./module-card.module.css";

export function ModuleCard({
  title,
  children,
  footer,
  "data-testid": testId,
}: {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  "data-testid"?: string;
}) {
  return (
    <div className={styles.card} data-testid={testId}>
      <h3 className={styles.title}>{title}</h3>
      <div className={styles.body}>{children}</div>
      {footer && <div className={styles.footer}>{footer}</div>}
    </div>
  );
}
