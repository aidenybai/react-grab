"use client";
import React, { useState } from "react";
import styles from "./module-accordion.module.css";

interface AccordionItem {
  id: string;
  title: string;
  content: React.ReactNode;
}

export function ModuleAccordion({
  items,
  "data-testid": testId,
}: {
  items: AccordionItem[];
  "data-testid"?: string;
}) {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id || null);

  return (
    <div className={styles.accordion} data-testid={testId}>
      {items.map((item) => (
        <div key={item.id} className={styles.item}>
          <button
            className={styles.trigger}
            onClick={() => setOpenId(openId === item.id ? null : item.id)}
          >
            {item.title}
            <span
              className={openId === item.id ? styles.arrowOpen : styles.arrow}
            >
              ▼
            </span>
          </button>
          {openId === item.id && (
            <div
              className={styles.content}
              data-testid={
                item.id === items[0]?.id
                  ? "module-accordion-content"
                  : undefined
              }
            >
              {item.content}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
