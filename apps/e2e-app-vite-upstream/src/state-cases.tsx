import { useState } from "react";

const INITIAL_REORDER_ITEMS: ReorderItem[] = [
  { id: "first", label: "First reorder item" },
  { id: "target", label: "Reorder target" },
  { id: "last", label: "Last reorder item" },
];

export const KeyCases = () => (
  <section>
    <h2>Keys</h2>
    <div className="target-row">
      {[
        <button data-testid="single-key-target" key="only" type="button">
          Single keyed target
        </button>,
      ]}
    </div>
    <div className="target-row">
      {[
        <button data-testid="list-key-target-first" key="first" type="button">
          First keyed target
        </button>,
        <button data-testid="list-key-target-second" key="second" type="button">
          Second keyed target
        </button>,
      ]}
    </div>
    <div className="target-row">
      {[
        <button data-testid="numeric-key-sibling" key={101} type="button">
          Numeric sibling
        </button>,
        <button data-testid="numeric-key-target" key={202} type="button">
          Numeric keyed target
        </button>,
      ]}
    </div>
    <div className="target-row">
      {[
        <button data-testid="punctuated-key-sibling" key="item:one/✓" type="button">
          Punctuated sibling
        </button>,
        <button data-testid="punctuated-key-target" key="item:two/✓" type="button">
          Punctuated keyed target
        </button>,
      ]}
    </div>
    <div className="target-row">
      {[
        <button key="nested-first" type="button">
          Nested keyed sibling
        </button>,
        <button data-testid="nested-key-target" key="nested-second" type="button">
          Nested keyed target
        </button>,
      ]}
    </div>
  </section>
);

export const ReorderCase = () => {
  const [reorderItems, setReorderItems] = useState(INITIAL_REORDER_ITEMS);

  return (
    <section>
      <h2>Stable keyed reorder</h2>
      <div className="target-row">
        {reorderItems.map((reorderItem) => (
          <button
            data-testid={reorderItem.id === "target" ? "reorder-key-target" : undefined}
            key={reorderItem.id}
            type="button"
          >
            {reorderItem.label}
          </button>
        ))}
      </div>
      <button
        data-testid="reorder-list-button"
        onClick={() => setReorderItems((currentItems) => [...currentItems].reverse())}
        type="button"
      >
        Reverse keyed list
      </button>
    </section>
  );
};

export const ClientStateCases = () => {
  const [counter, setCounter] = useState(0);
  const [remountKey, setRemountKey] = useState(0);

  return (
    <section>
      <h2>Client state</h2>
      <div className="target-row">
        <output data-testid="hydration-counter">{counter}</output>
        <button
          data-testid="hydration-counter-button"
          onClick={() => setCounter((currentCounter) => currentCounter + 1)}
          type="button"
        >
          Increment shared counter
        </button>
      </div>
      <div className="target-row">
        <p data-testid="keyed-remount-target" key={remountKey}>
          Keyed mount {remountKey}
        </p>
        <button
          data-testid="keyed-remount-trigger"
          onClick={() => setRemountKey((currentKey) => currentKey + 1)}
          type="button"
        >
          Remount keyed target
        </button>
      </div>
    </section>
  );
};
