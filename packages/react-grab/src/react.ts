import { useCallback, useEffect, useMemo, useRef } from "react";
// Shim resolves to React's built-in on 18+ and a userland impl on 17, keeping
// the `react-grab/react` entry safe for the package's `react >=17` peer range.
import { useSyncExternalStore } from "use-sync-external-store/shim";
import type {
  DialConfig,
  DialControl,
  DialValue,
  ReactGrabAPI,
  ResolvedDialValues,
} from "./types.js";
import { resolveDialConfig } from "./utils/resolve-dial-config.js";
import { collectDialDefaults, resolveDialValues } from "./utils/resolve-dial-values.js";

declare global {
  interface Window {
    __REACT_GRAB__?: ReactGrabAPI;
  }
}

export interface UseReactGrabOptions {
  id?: string;
  onAction?: (path: string) => void;
}

export interface ReactGrabController<C extends DialConfig> {
  values: ResolvedDialValues<C>;
  setValue: (path: string, value: DialValue) => void;
  setValues: (partial: Record<string, DialValue>) => void;
  resetValues: () => void;
  getValues: () => ResolvedDialValues<C>;
}

let autoIdCounter = 0;

const getApi = (): ReactGrabAPI | null => {
  if (typeof window === "undefined") return null;
  return window.__REACT_GRAB__ ?? null;
};

interface DialsHandle<C extends DialConfig> {
  id: string;
  controls: DialControl[];
  values: ResolvedDialValues<C>;
}

const useDials = <C extends DialConfig>(
  name: string,
  config: C,
  options?: UseReactGrabOptions,
): DialsHandle<C> => {
  const idRef = useRef<string | null>(null);
  if (idRef.current === null) {
    idRef.current = options?.id ?? `${name}-${++autoIdCounter}`;
  }
  const id = idRef.current;

  const signature = useMemo(() => JSON.stringify(config), [config]);
  const controls = useMemo(() => resolveDialConfig(config), [signature]);
  const defaultSnapshot = useMemo(() => collectDialDefaults(controls), [controls]);

  const onActionRef = useRef(options?.onAction);
  onActionRef.current = options?.onAction;
  const nameRef = useRef(name);
  nameRef.current = name;
  const controlsRef = useRef(controls);
  controlsRef.current = controls;

  // Register on mount, unregister on unmount. Keyed on the stable id alone so a
  // name/config change never tears the panel down - the registry merges and
  // preserves existing values only when the panel is still registered.
  useEffect(() => {
    const register = (api: ReactGrabAPI): (() => void) =>
      api.registerDials({
        id,
        name: nameRef.current,
        controls: controlsRef.current,
        onAction: (path) => onActionRef.current?.(path),
      });

    const api = getApi();
    if (api) return register(api);

    // react-grab can finish booting after this component mounts.
    let disposed = false;
    let dispose: (() => void) | undefined;
    const handleInit = () => {
      const readyApi = getApi();
      if (!readyApi || disposed) return;
      dispose = register(readyApi);
      window.removeEventListener("react-grab:init", handleInit);
    };
    window.addEventListener("react-grab:init", handleInit);
    return () => {
      disposed = true;
      window.removeEventListener("react-grab:init", handleInit);
      dispose?.();
    };
  }, [id]);

  // Sync name/controls changes by re-registering (merge-preserving) without
  // unregistering first, so values survive and a dismissed panel stays closed.
  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    getApi()?.registerDials({
      id,
      name,
      controls,
      onAction: (path) => onActionRef.current?.(path),
    });
  }, [id, name, controls]);

  const subscribe = useCallback(
    (onStoreChange: () => void): (() => void) => {
      const api = getApi();
      if (api) return api.subscribeDials(id, onStoreChange);

      // Mounted before react-grab booted: bridge to the live store once it is
      // ready (and notify), otherwise post-init value changes never re-render.
      let unsubscribe: (() => void) | undefined;
      const handleInit = () => {
        const readyApi = getApi();
        if (!readyApi) return;
        window.removeEventListener("react-grab:init", handleInit);
        unsubscribe = readyApi.subscribeDials(id, onStoreChange);
        onStoreChange();
      };
      window.addEventListener("react-grab:init", handleInit);
      return () => {
        window.removeEventListener("react-grab:init", handleInit);
        unsubscribe?.();
      };
    },
    [id],
  );

  const getSnapshot = useCallback(
    (): Record<string, DialValue> => getApi()?.getDialValues(id) ?? defaultSnapshot,
    [id, defaultSnapshot],
  );

  const flatValues = useSyncExternalStore(subscribe, getSnapshot, () => defaultSnapshot);

  const values = useMemo(
    () => resolveDialValues(controls, flatValues) as ResolvedDialValues<C>,
    [controls, flatValues],
  );

  return { id, controls, values };
};

export const useReactGrab = <C extends DialConfig>(
  name: string,
  config: C,
  options?: UseReactGrabOptions,
): ResolvedDialValues<C> => useDials(name, config, options).values;

const flattenPartial = (
  controls: DialControl[],
  partial: Record<string, unknown>,
): Record<string, DialValue> => {
  const flat: Record<string, DialValue> = {};
  for (const control of controls) {
    if (!(control.key in partial)) continue;
    const next = partial[control.key];
    if (control.kind === "folder") {
      if (next && typeof next === "object") {
        Object.assign(flat, flattenPartial(control.children, next as Record<string, unknown>));
      }
    } else if (control.kind !== "action") {
      flat[control.path] = next as DialValue;
    }
  }
  return flat;
};

export const useReactGrabController = <C extends DialConfig>(
  name: string,
  config: C,
  options?: UseReactGrabOptions,
): ReactGrabController<C> => {
  const { id, controls, values } = useDials(name, config, options);

  const setValue = useCallback(
    (path: string, value: DialValue) => getApi()?.updateDialValue(id, path, value),
    [id],
  );
  const setValues = useCallback(
    (partial: Record<string, DialValue>) =>
      getApi()?.updateDialValues(id, flattenPartial(controls, partial)),
    [id, controls],
  );
  const resetValues = useCallback(() => getApi()?.resetDials(id), [id]);
  const getValues = useCallback(
    () =>
      resolveDialValues(
        controls,
        getApi()?.getDialValues(id) ?? collectDialDefaults(controls),
      ) as ResolvedDialValues<C>,
    [id, controls],
  );

  return { values, setValue, setValues, resetValues, getValues };
};
