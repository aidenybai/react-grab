# Auto-research optimization loop log (local, not committed)

## Technique reference (mined from millionco/brain)

From awesome-performance-patches, addyosmani-performance, 3perf, v8 notes:

1. Cache expensive RegExp results; hoist RegExps out of hot loops
2. Replace String.split with indexOf+substring; avoid regex where manual parse works
3. Monomorphism: consistent object shapes / init order (hidden classes); avoid delete
4. Typed arrays / parallel arrays over Maps for large datasets; Set→Array when small
5. Bit flags over N booleans / string manipulation
6. Avoid Promise creation in hot paths; avoid spread; pre-allocated arrays over Object.entries
7. for loops over .map/.forEach; cache .length; early-exit math
8. Lookup arrays for parsing (fast hex color parse — color-bits post)
9. TextEncoder: 1 call with large string beats N calls with small strings
10. Batch DOM reads then writes (layout thrashing); event delegation
11. String interning / dedup; beware sliced-string retention
12. Lazy evaluation, lazy getters; skip work entirely (caching results — pnpm)
13. content-visibility for render cost; fewer compositor layers
14. FSM over regex for text parsing
15. Keep numeric funcs in one number lane (Smi vs double deopt) — AGENTS.md V8 rules
16. Monomorphic indirect call sites — split shared recursors per callback

## Iterations

Baseline (chromium, pixelRatio 1, median of 9 / cold = first):
(to be filled by harness)

## Iterations

### Iteration 1 — activeElement memo-key poisoning fix (KEPT)
Technique: profiling attribution (brain: measure before optimizing) + hidden-state audit.
Finding: `element !== activeElement` in the memoKey condition gave `document.body`
(the default activeElement) NO_MEMO_KEY, which cascaded to every descendant —
style memoization was effectively disabled on every page (70-stress: 1 memo key,
254k getPropertyValue calls). Fix: compute the key for the active element (so
children still memoize) but exclude only that element from cache read/seed and
from the diff cache.
Metrics (70-stress, chromium, pixelRatio 1): warm 191 -> 90ms, cold 402 -> 247ms;
gpv 254k -> 47k; memo keys 1 -> 72. All 412 chromium fidelity/region tests green.

### Iteration 2 — pseudo-diff cache per memo key (KEPT)
Technique: extend the base-diff memo reuse (iter-round earlier) to ::before/::after diffs.
Memo-hit elements re-ran the full ~139-prop pseudo diff per element; now the diff is
cached per memo key and hits only re-apply the per-element lane + size freezing, falling
back to a full diff when pseudo presence or content differs from the cache seed.
Metrics: 70-stress warm 90.3 -> 80.4ms. Pseudo/marker/stress fidelity subset green (17).

### Iteration 3 — slot-free child fast path + gated scroll reads (KEPT)
Technique: avoid per-node array allocation and layout-flushing reads (brain: don't pay
for the general case on the common path).
a) getComposedChildNodes returns the live childNodes list directly unless a slot child
   exists (slots only assign inside shadow trees), skipping an array copy per element.
b) element.scrollLeft/scrollTop (layout-flushing) are only read when the element can
   actually hold a scroll offset (html/body, or overflow-x/y not visible).
Metrics: 70-stress warm 80.4 -> 73.8ms. Scroll/shadow/slot/sticky fidelity subset green (39).
