import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  GLASS_CARD_COUNT,
  TOAST_LIFETIME_MS,
  TOAST_MAX_VISIBLE,
  TOAST_SPAWN_INTERVAL_MS,
} from "./constants";
import { createSeededRandom } from "./synthetic-data";

interface ToastEntry {
  id: number;
  message: string;
}

const TOAST_MESSAGES = [
  "Build finished",
  "3 tests failed",
  "Deploy promoted to production",
  "New comment on PR #482",
  "Cache invalidated",
  "Sync complete",
];

// Portal + paint-cost interference:
//
// - toasts spawn into a document.body portal on an interval and expire a few
//   seconds later, so DOM appears and disappears underneath the pointer while
//   a selection may be pointing at it (the sonner/notification-stack pattern).
// - toasts and the static cards use backdrop-filter over a busy gradient, so
//   every overlay draw composites against expensive blur layers.
export const ToastStormSection = () => {
  const [activeToasts, setActiveToasts] = useState<ToastEntry[]>([]);

  const glassCards = useMemo(() => {
    const random = createSeededRandom(0x91a5);
    return Array.from({ length: GLASS_CARD_COUNT }, (_, cardIndex) => ({
      id: cardIndex,
      title: `Glass card ${cardIndex}`,
      value: `${Math.floor(random() * 900) + 100} ops/s`,
    }));
  }, []);

  useEffect(() => {
    const random = createSeededRandom(0x70a5);
    let nextToastId = 0;
    const expiryHandles = new Set<ReturnType<typeof setTimeout>>();
    const spawnHandle = setInterval(() => {
      const toastId = nextToastId++;
      setActiveToasts((previousToasts) => {
        const nextToasts = [
          ...previousToasts,
          { id: toastId, message: TOAST_MESSAGES[Math.floor(random() * TOAST_MESSAGES.length)] },
        ];
        return nextToasts.slice(-TOAST_MAX_VISIBLE);
      });
      const expiryHandle = setTimeout(() => {
        expiryHandles.delete(expiryHandle);
        setActiveToasts((previousToasts) => previousToasts.filter((toast) => toast.id !== toastId));
      }, TOAST_LIFETIME_MS);
      expiryHandles.add(expiryHandle);
    }, TOAST_SPAWN_INTERVAL_MS);
    return () => {
      clearInterval(spawnHandle);
      for (const expiryHandle of expiryHandles) clearTimeout(expiryHandle);
    };
  }, []);

  return (
    <section data-testid="heavy-toast-section" className="flex flex-col gap-3 p-4">
      <h2 className="text-lg font-bold">
        Toast Storm + Glass (portals every {TOAST_SPAWN_INTERVAL_MS}ms, backdrop-filter)
      </h2>
      <div
        className="grid grid-cols-4 gap-4 rounded-lg p-6"
        data-testid="glass-card-grid"
        style={{
          background: "linear-gradient(120deg, #6366f1 0%, #ec4899 35%, #f59e0b 70%, #10b981 100%)",
        }}
      >
        {glassCards.map((card) => (
          <div
            key={card.id}
            data-glass-card={card.id}
            data-testid={`glass-card-${card.id}`}
            className="rounded-lg border border-white/30 bg-white/20 p-4 text-white shadow-lg"
            style={{ backdropFilter: "blur(10px)" }}
          >
            <span className="block text-sm font-semibold">{card.title}</span>
            <span className="font-mono text-lg tabular-nums">{card.value}</span>
          </div>
        ))}
      </div>
      {createPortal(
        <div
          data-testid="toast-stack"
          className="pointer-events-none fixed bottom-4 right-4 z-30 flex flex-col gap-2"
        >
          {activeToasts.map((toast) => (
            <div
              key={toast.id}
              data-toast={toast.id}
              data-testid={`toast-${toast.id}`}
              className="pointer-events-auto w-64 rounded-lg border border-white/40 bg-white/70 px-3 py-2 text-xs shadow-lg"
              style={{ backdropFilter: "blur(8px)" }}
            >
              <span className="font-medium">{toast.message}</span>
              <span className="block font-mono text-[10px] text-gray-500">toast #{toast.id}</span>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </section>
  );
};
