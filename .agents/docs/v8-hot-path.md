# V8 Hot-Path Rules

Read this when touching code that runs every frame, every pointer move, or otherwise sits on a measured hot path: element detection, bounds calculation, animation freezing, the overlay render loop. If you are not in a hot path, skip this.

- MUST: Keep indirect call sites monomorphic. Do not pass different callbacks to a shared recursor/iterator that gets hot. Split into one specialized helper per callback, or inline the loop.
- MUST: Mutate object fields in place instead of replacing the field with a fresh object literal. `obj.target.x = ...` not `obj.target = { x, y, ... }`. Allocating per-frame literals churns the GC and cycles hidden classes.
- MUST: Keep numeric helpers in a single number-type "lane". A function that early-returns a Smi (`return 8`) and otherwise returns a double (`labelWidth * 0.2`) will deopt every consumer with `not a Smi`. Pick one (e.g. `Math.round` the double).
- SHOULD: Prefer closed-form arithmetic over loops that subtract/add a constant until a delta is in range (e.g. angle normalization with `Math.round(delta / 360)`, not `while delta > 180`).
