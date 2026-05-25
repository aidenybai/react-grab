# Known React Doctor false-positive patterns

This file is the institutional memory the bot uses to skip diagnostics that
have already been triaged as false positives. **Edit this file freely** — the
bot reads it each run and treats every pattern below as "do not fix".

If a triage reveals a new FP pattern, append it here with: the rule id, the
shape of the code that triggers it, and a one-line reason. Be specific enough
that future runs can recognize the same pattern, not just the same file.

---

## `react-doctor:async-defer-await` — cancellable animation/choreography

```ts
await wait(N);
if (isCancelledRef.current) return;
// ...continue
```

When the awaited expression is a **timing primitive** (`wait`/`sleep`/
`delay`/`setTimeout`-wrapper-as-Promise) followed by a cancellation guard
that reads a ref or signal mutated externally, the await **is** the
mechanism by which time passes for cancellation to be observed.
Moving the await past the guard would check the cancellation flag
_before_ waiting, skipping the entire purpose of the pattern. The rule's
suggestion ("doesn't use the awaited value") fires because the guard
predicate is statically the same before and after the await — but
semantically, the await is the delay, not a value-producing operation.

**Recognize by:** the awaited expression is a `wait(...)` / `sleep(...)` /
`delay(...)` style helper, and the next statement is `if
(isCancelledRef.current) return;` or similar `mountedRef`/`isMountedRef`
check. Treat as FP across all files matching this shape.
