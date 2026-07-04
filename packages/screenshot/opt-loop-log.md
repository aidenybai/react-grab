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

### Iteration 4 — class-stable margins/paddings/insets out of the per-element lane (KEPT)

Technique: a property only needs a per-element read if some author declaration can
make it vary within a memo class; margins/paddings/insets whose every author
declaration is an absolute length are proven class-stable and leave the lane.
Metrics: 70-stress warm 73.8 -> 66ms range. Fidelity subset green. (commit 85ba63f6)

### Iteration 5 — derive or gate lane reads: inline/block-size, transform/perspective origins (KEPT)

Technique: inline-size/block-size are derived from width/height + writing mode
instead of read; transform-origin/perspective-origin reads gate on a transform
being present.
Metrics: 70-stress warm improvement ~3ms. Fidelity green. (commit 8c2251a1)

### Iteration 6 — class-stable transforms + display-gated grid-template reads (KEPT)

Technique: transform leaves the per-element lane when every author transform
declaration is keyword/length-only; grid-template-rows/columns read only when the
resolved display is grid.
Metrics: small warm win on 70-stress. Fidelity green. (commit 3d4f3db0)

### Iteration 7 — gate per-element inset reads on class-pinned static position (KEPT)

Technique: top/right/bottom/left reads skip entirely when the memo class pins
position: static.
Metrics: cut ~5.8k inset reads/run on 70-stress. Fidelity green. (commit f66d911d)

### Iteration 8 — insertion-order registry printing (KEPT)

Technique: toCssText printed each rule by sorting its property names; rules are
already built in deterministic insertion order, so the per-rule sort is skipped.
Metrics: serialize phase shaved ~1ms on 70-stress. Fidelity green. (commit 96c25cbf)

### Iteration 9 — memo-key variant cache for seed class reuse (KEPT)

Technique: elements sharing a memo key and identical per-element lane values (the
variant key) reuse the seed's generated class outright instead of re-diffing.
Metrics: 70-stress warm ~55 -> ~48ms. Fidelity green. (commit 7e9acfa0)

### Iteration 10 — share emitted style maps across memo-key variants (KEPT)

Technique: variant-identical elements point at one shared emitted style map
instead of cloning it per element.
Metrics: allocation churn down, small warm win. Fidelity green. (commit 9445ee7f)

### Iteration 11 — skip slot flattening scan outside shadow trees (KEPT)

Technique: the composed-children scan for <slot> assignment only runs inside
shadow trees where slots can exist.
Metrics: visit self-time down ~1ms. Fidelity green. (commit a53e4a8b)

### Iteration 12 — (folded into 11/13 commit series; no separate change kept)

Attempted micro-variants of the visit fast path that measured neutral; folded
into the surrounding commits.

### Iteration 13 — trim author-only properties from the always-snapshot set (KEPT)

Technique: properties only settable by author CSS (shadows, filters, blend modes)
leave the always-read set; they are read only when some author rule mentions them.
Metrics: 70-stress warm ~48 -> ~43ms, gpv down ~4k/run. Fidelity green.
(commit 0efeb6d2)

### Iteration 14 — style-relevant attribute filtering in memo descriptors (KEPT)

Technique: the memo descriptor keyed every attribute, so elements differing only by
id/data-\*/aria-\* never shared a snapshot. The CSS scan now collects attribute names
appearing in [attr] selectors (plus id when any #-selector exists); descriptors keep
only those, a curated presentational-hint set, and class/lang. Shadow hosts keep all
attributes (:host([...]) rules live in incrementally scanned shadow sheets).
Metrics: 70-stress warm 43.4 -> 40.4ms, 60-kitchen-sink 7.6 -> 7.0ms. Unit 77/77,
chromium fidelity 412/412 green.

### Iteration 15 — margin shorthand group read in the per-element lane (REVERTED)

Technique: replace the margin-top + margin-left lane getPropertyValue calls with a
single getPropertyValue("margin") shorthand read split into the four longhands.
Metrics: 70-stress warm 39.9 -> 44.3ms — Blink's shorthand serialization resolves all
four longhands plus the combine logic, costing more than the two direct longhand
reads it replaced. Reverted.

### Iteration 16 — memo-keyed baseline lookup (KEPT, neutral)

Technique: getBaseline built a string cache key (tag|pseudo|font-size) per element;
those inputs are pinned by the memo key, so buildClassNameMap now resolves baselines
through a number-keyed per-memo-class map.
Metrics: 70-stress warm ~40ms (within noise). Unit 77/77, chromium fidelity 412/412.

### Iteration 17 — nested memo-key interning (KEPT, neutral)

Technique: memo keys were interned through one long `${parentKey}>${descriptor}`
string per element, paying a concat + full string hash each visit; interning now
nests a number-keyed map of parent key -> descriptor map.
Metrics: 70-stress warm ~39-40ms (within noise). Unit 77/77, chromium fidelity
412/412 green. GPV floor measured at 18.7k calls/run (~13.8ms) on 70-stress:
lane 7k, insets 1.5k, ~110 memo-miss seeds x ~90 props ~10k.

### Iteration 18 — prefetch external resources before the read pass (KEPT)

Technique: image/svg-image/@font-face URL fetches previously started only after
snapshot + clone completed; a fire-and-forget prefetch now warms the resource
cache at capture start so network latency overlaps the CPU phases.
Metrics: localhost fixture assets resolve in ~6ms so the harness delta sits inside
cold-run noise; the win scales with real network latency. Unit 77/77, chromium
fidelity 412/412 green.

### Iteration 19 — cheap invalid-XML detection + attribute-name validity cache (KEPT)

Technique: the invalid-XML detection regex carried lookarounds that are slow to
test per string; clean strings (the overwhelming case) now exit through a plain
character-class test plus native String.isWellFormed. Attribute-name XML validity
is memoized by name (names repeat heavily: class/style/id/data-\*).
Metrics: 70-stress warm ~39.8ms (small win inside noise band; strip+sanitize were
~3ms/run in the profile). Unit 77/77, chromium fidelity 412/412 green.

### Iteration 20 — decoded-SVG-image cache + baked-backdrop bake cache (KEPT)

Technique: (a) decoded SVG images are immutable, so a small FIFO keyed by the SVG
data URL lets repeat rasterizations of identical markup skip the decode; (b) the
backdrop bake is fully determined by the underlay markup + each pane's device rect
and filter, so an unchanged tree reuses the previous bake (pane PNG list) instead
of re-rendering the blur and re-encoding pane PNGs each capture.
Metrics: hard-stress-combo warm 10 -> 4.7ms (backdropMs 7.4 -> 2.3); other fixtures
neutral. Unit 77/77, chromium fidelity 412/412 green.

### Iteration 21 — selector-scoped lane instability (per-memo-class skip masks) (KEPT)

Technique: a lane property whose instability comes only from memo-safe,
pseudo-free rule selectors (e.g. `.badge { margin-left: auto }`) only varies
inside memo classes matching those selectors. The registry now records the
selector list per conditionally-unstable property; at memo-seed time the seed's
match result builds a laneSkipMask stored on the memo entry, and hits skip the
per-element getPropertyValue for masked properties (inheriting the seed's value
through the prototype). Any non-rule instability source (inline styles, pseudo
selectors, transitions, animations) keeps the property unconditionally unstable.
Metrics: 70-stress getPropertyValue 18,747 -> 15,838/run (-2.9k margin reads);
warm ~40-43ms (small win inside the noise band). Unit 77/77, chromium fidelity
412/412 green.

### Iteration 22 — skip size lane reads for non-replaced inline boxes (KEPT)

Technique: applySizeFreezingPolicy deletes width/height/inline-size/block-size
for non-replaced display:inline boxes, so their per-element lane reads on memo
hits are pure waste. New PER_ELEMENT_LANE_SIZE action skips the width/height
getPropertyValue when the class-pinned display is inline and the element is
non-replaced (guarded off when display itself is in the per-element lane).
Pseudo-element lane reads always qualify as non-replaced.
Metrics: 70-stress getPropertyValue 15,838 -> 15,562/run; warm 38.1ms median.
Unit 77/77, chromium fidelity 412/412 green.

### Iteration 23 — deviation-only variant keys (KEPT)

Technique: variant keys concatenated every per-element lane value (~90 string
appends per element across base/::before/::after). Memo-hit maps delegate to
the seed through their prototype, so only own properties whose value shadows
the seed's can distinguish variants; the key now encodes just those indexed
deviations (empty for the common seed-identical hit).
Metrics: buildMs ~14.8 -> ~13.5ms on 70-stress (small, within noise band, kept
as structurally cheaper: near-empty keys, no per-prop value concat). Unit
77/77, chromium fidelity 412/412 green.

### Iteration 24 — drop the sorted registry signature (KEPT)

Technique: instrumentation showed the sorted "source of truth" signature never
collapsed a single duplicate on 70-stress (347 register calls, 240 fast-path
misses, 0 sorted-signature hits) while paying a full key sort + second string
build per miss. The insertion-order signature is now the class identity;
order-divergent equal maps (never observed) would merely emit a redundant rule
with identical declarations — zero fidelity impact.
Metrics: 70-stress warm 37.6ms median; registry self time roughly halved.
Unit 77/77, chromium fidelity 412/412 green.

### Iteration 25 — reuse register-time declaration blocks in toCssText (KEPT)

Technique: register already builds every rule's declaration blocks for the
insertion-order signature; toCssText rebuilt all ~212KB of them from the style
maps a second time. Rules now carry the register-time blocks (cachedBlocks)
and toCssText concatenates them directly; inlineExternalResources nulls the
cache on rules whose url() values it rewrites so those rebuild fresh.
Metrics: neutral-to-slightly-positive (70-stress warm 37.7ms, kitchen-sink
6.4ms); removes a full second pass over rule maps. Unit 77/77, chromium
fidelity 412/412 green.
