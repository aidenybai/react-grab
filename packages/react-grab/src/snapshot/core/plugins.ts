import type {
  SnapshotPlugin,
  SnapshotPluginUse,
  SnapshotPluginFactory,
  SnapshotCaptureContext,
} from "../types.js";

type SnapshotHookFn = (
  context: SnapshotCaptureContext | null | undefined,
  payload?: unknown,
) => unknown | Promise<unknown>;

const __plugins: SnapshotPlugin[] = [];

export const normalizePlugin = (spec: unknown): SnapshotPlugin | null => {
  if (!spec) return null;
  if (Array.isArray(spec)) {
    const [factory, options] = spec as [SnapshotPluginFactory | SnapshotPlugin, unknown];
    return typeof factory === "function" ? factory(options) : factory;
  }
  if (typeof spec === "object" && "plugin" in spec) {
    const { plugin, options } = spec as {
      plugin: SnapshotPluginFactory | SnapshotPlugin;
      options?: unknown;
    };
    return typeof plugin === "function" ? plugin(options) : plugin;
  }
  if (typeof spec === "function") return (spec as SnapshotPluginFactory)();
  return spec as SnapshotPlugin;
};

export const registerPlugins = (...defs: unknown[]): void => {
  const flat = defs.flat();
  for (const d of flat) {
    const inst = normalizePlugin(d);
    if (!inst) continue;
    if (!__plugins.some((p) => p && p.name && inst.name && p.name === inst.name)) {
      __plugins.push(inst);
    }
  }
};

const getContextPlugins = (
  context: SnapshotCaptureContext | null | undefined,
): readonly SnapshotPlugin[] => {
  return context && Array.isArray(context.plugins)
    ? (context.plugins as SnapshotPlugin[])
    : __plugins;
};

export const runHook = async (
  name: string,
  context: SnapshotCaptureContext | null | undefined,
  payload?: unknown,
): Promise<unknown> => {
  let acc = payload;
  const list = getContextPlugins(context);
  for (const p of list) {
    const candidate = p as unknown as Record<string, unknown>;
    const fn =
      p && typeof candidate[name] === "function" ? (candidate[name] as SnapshotHookFn) : null;
    if (!fn) continue;
    const out = await fn(context, acc);
    if (typeof out !== "undefined") acc = out;
  }
  return acc;
};

export const runAll = async (
  name: string,
  context: SnapshotCaptureContext | null | undefined,
  payload?: unknown,
): Promise<unknown[]> => {
  const outs: unknown[] = [];
  const list = getContextPlugins(context);
  for (const p of list) {
    const candidate = p as unknown as Record<string, unknown>;
    const fn =
      p && typeof candidate[name] === "function" ? (candidate[name] as SnapshotHookFn) : null;
    if (!fn) continue;
    const out = await fn(context, payload);
    if (typeof out !== "undefined") outs.push(out);
  }
  return outs;
};

const mergePlugins = (localDefs: unknown[] | undefined): ReadonlyArray<SnapshotPlugin> => {
  const out: SnapshotPlugin[] = [];

  if (Array.isArray(localDefs)) {
    for (const d of localDefs) {
      const inst = normalizePlugin(d);
      if (!inst || !inst.name) continue;
      const i = out.findIndex((x) => x && x.name === inst.name);
      if (i >= 0) out.splice(i, 1);
      out.push(inst);
    }
  }

  for (const g of __plugins) {
    if (g && g.name && !out.some((x) => x.name === g.name)) {
      out.push(g);
    }
  }

  return Object.freeze(out);
};

export const attachSessionPlugins = (
  context: SnapshotCaptureContext,
  localDefs: unknown[] | undefined,
  force: boolean = false,
): SnapshotCaptureContext => {
  if (!context || (context.plugins && !force)) return context;
  context.plugins = mergePlugins(localDefs) as SnapshotPluginUse[];
  return context;
};

export const getGlobalPlugins = (): SnapshotPlugin[] => {
  return __plugins.slice();
};
