import type { HostBounds } from "react-grab/targets";
import { NATIVE_MEASURE_TIMEOUT_MS } from "../constants";
import type { NativeHostHandle } from "../types";

export const measureNativeHandle = (
  handle: NativeHostHandle | null,
): Promise<HostBounds | null> => {
  if (!handle) return Promise.resolve(null);

  return new Promise((resolve) => {
    let didSettle = false;
    const settle = (bounds: HostBounds | null) => {
      if (didSettle) return;
      didSettle = true;
      clearTimeout(timeoutId);
      resolve(bounds);
    };
    const timeoutId = setTimeout(() => settle(null), NATIVE_MEASURE_TIMEOUT_MS);

    try {
      handle.measureInWindow((x, y, width, height) => {
        settle(width > 0 && height > 0 ? { x, y, width, height } : null);
      });
    } catch {
      settle(null);
    }
  });
};
