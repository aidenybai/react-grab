import {
  createContext,
  useContext,
  useReducer,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";

// e2e fixture that drives react-grab's freeze dispatcher patching for hooks
// beyond plain useState: useReducer, useTransition, useSyncExternalStore, and
// context dependencies. freeze-hooks.spec.ts freezes the page, bumps each
// counter, and asserts the displayed value holds while frozen and resumes
// afterwards. (The transition/context counters still update via useState
// internally; the point is to exercise those dispatcher/queue paths.)
interface CounterAction {
  by: number;
}

const counterReducer = (count: number, action: CounterAction): number => count + action.by;

const ReducerCounter = () => {
  const [count, dispatch] = useReducer(counterReducer, 0);
  return (
    <div className="flex items-center gap-2" data-testid="reducer-counter">
      <span data-testid="reducer-count">{count}</span>
      <button
        type="button"
        className="border px-2 py-1 rounded"
        onClick={() => dispatch({ by: 1 })}
        data-testid="reducer-increment"
      >
        Reducer +1
      </button>
    </div>
  );
};

const TransitionCounter = () => {
  const [count, setCount] = useState(0);
  const [, startTransition] = useTransition();
  return (
    <div className="flex items-center gap-2" data-testid="transition-counter">
      <span data-testid="transition-count">{count}</span>
      <button
        type="button"
        className="border px-2 py-1 rounded"
        onClick={() => startTransition(() => setCount((previous) => previous + 1))}
        data-testid="transition-increment"
      >
        Transition +1
      </button>
    </div>
  );
};

let externalStoreValue = 0;
const externalStoreListeners = new Set<() => void>();
const externalStore = {
  subscribe: (listener: () => void) => {
    externalStoreListeners.add(listener);
    return () => {
      externalStoreListeners.delete(listener);
    };
  },
  getSnapshot: () => externalStoreValue,
  increment: () => {
    externalStoreValue += 1;
    for (const listener of externalStoreListeners) listener();
  },
};

const ExternalStoreCounter = () => {
  const value = useSyncExternalStore(externalStore.subscribe, externalStore.getSnapshot);
  return (
    <div className="flex items-center gap-2" data-testid="store-counter">
      <span data-testid="store-count">{value}</span>
      <button
        type="button"
        className="border px-2 py-1 rounded"
        onClick={() => externalStore.increment()}
        data-testid="store-increment"
      >
        Store +1
      </button>
    </div>
  );
};

const CountContext = createContext(0);

const ContextConsumer = () => {
  const value = useContext(CountContext);
  return <span data-testid="context-count">{value}</span>;
};

const ContextCounter = () => {
  const [value, setValue] = useState(0);
  return (
    <CountContext.Provider value={value}>
      <div className="flex items-center gap-2" data-testid="context-counter">
        <ContextConsumer />
        <button
          type="button"
          className="border px-2 py-1 rounded"
          onClick={() => setValue((previous) => previous + 1)}
          data-testid="context-increment"
        >
          Context +1
        </button>
      </div>
    </CountContext.Provider>
  );
};

export const FreezeHookHarness = () => {
  return (
    <section className="border rounded-lg p-4" data-testid="freeze-hooks-section">
      <h2 className="text-lg font-bold mb-4">Freeze Hook Harness</h2>
      <div className="space-y-3">
        <ReducerCounter />
        <TransitionCounter />
        <ExternalStoreCounter />
        <ContextCounter />
      </div>
    </section>
  );
};
