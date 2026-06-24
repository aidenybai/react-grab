"use client";

import { useEffect } from "react";

// Fires never-resolving requests to /api/slow to occupy the browser's per-origin
// connection pool, reproducing the real condition where the app saturates the
// network and react-grab's source fetch queues behind it. Off by default; a test
// opts in with ?saturate=<count> so ordinary grabs stay fast.
export function SlowFetcher() {
  useEffect(() => {
    const requestedCount = Number(new URLSearchParams(window.location.search).get("saturate"));
    if (!Number.isFinite(requestedCount) || requestedCount <= 0) return;

    const controller = new AbortController();
    for (let index = 0; index < requestedCount; index++) {
      fetch(`/api/slow?i=${index}`, { signal: controller.signal }).catch(() => {});
    }
    return () => controller.abort();
  }, []);

  return null;
}
