"use client";

import { useState } from "react";

const INITIAL_REORDER_ITEMS: ReorderItem[] = [
  { id: "stable-target", label: "Stable reordered target" },
  { id: "keyed-sibling", label: "Keyed reorder sibling" },
];

export const ReorderFixture = () => {
  const [items, setItems] = useState(INITIAL_REORDER_ITEMS);

  return (
    <section>
      <button
        data-testid="reorder-list-button"
        onClick={() => setItems((currentItems) => [...currentItems].reverse())}
        type="button"
      >
        Reorder keyed list
      </button>
      <div>
        {items.map((item) => (
          <button
            data-testid={item.id === "stable-target" ? "reorder-key-target" : undefined}
            key={item.id}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
    </section>
  );
};
