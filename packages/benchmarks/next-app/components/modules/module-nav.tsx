"use client";
import React, { useState } from "react";
import styles from "./module-nav.module.css";

const items = ["Overview", "Metrics", "Logs", "Alerts"];

export function ModuleNav({
  "data-testid": testId,
}: {
  "data-testid"?: string;
}) {
  const [active, setActive] = useState("Overview");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <div data-testid={testId}>
      <nav className={styles.nav}>
        {items.map((item) => (
          <button
            key={item}
            onClick={() => setActive(item)}
            data-testid={active === item ? "module-nav-active" : undefined}
            className={active === item ? styles.navItemActive : styles.navItem}
          >
            {item}
          </button>
        ))}
        <div className={styles.dropdown}>
          <button
            className={styles.navItem}
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            More ▾
          </button>
          {dropdownOpen && (
            <div className={styles.dropdownMenu}>
              <button
                className={styles.dropdownItem}
                data-testid="module-nav-dropdown-item"
              >
                Settings
              </button>
              <button className={styles.dropdownItem}>Export</button>
              <button className={styles.dropdownItem}>Help</button>
            </div>
          )}
        </div>
      </nav>
    </div>
  );
}
