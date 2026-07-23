interface DebugContext {
  debug?: boolean;
  options?: { debug?: boolean };
}

export const debugWarn = (ctx: unknown, msg: string, err?: unknown): void => {
  const ctxObject = ctx && typeof ctx === "object" ? (ctx as DebugContext) : null;
  const opts = ctxObject ? (ctxObject.options ?? ctxObject) : null;
  if (opts && opts.debug) {
    if (err !== undefined) {
      console.warn("[snapshot]", msg, err);
    } else {
      console.warn("[snapshot]", msg);
    }
  }
};
