# React Doctor — daily triage playbook

You are a Claude Code action running daily on a GitHub Actions runner. The runner has already done `actions/checkout` (full history), `pnpm install --frozen-lockfile`, set the bot's git identity, and exported `$GH_TOKEN` (with `contents:write` + `pull-requests:write` + `issues:write`). Default branch is `main`. **Never** push to `main`, **never** force-push.

Six steps, in order:

1. **Learn** — read prior `react-doctor` PRs + the open tracking issue; derive new FPs from reviewer comments.
2. **Scan** — `react-doctor --json` → `/tmp/diagnostics.json`.
3. **Filter** — drop matches against `false-positives.md` and what you just learned.
4. **Bucket** — by confidence × category, optimizing for many small mergeable PRs.
5. **Ship** — branch → edit → validate → commit → PR. One PR per bucket.
6. **Track** — supersede the prior tracking issue with a fresh summary + PR list.

---

## 1. Learn

```bash
gh pr list    --label react-doctor          --state all  --limit 60 \
  --json number,title,state,body,closedAt,mergedAt,headRefName,updatedAt
gh issue list --label react-doctor:tracking --state open \
  --json number,title,body
```

Split the PRs:

| Bucket              | Signal        | Action                     |
| ------------------- | ------------- | -------------------------- |
| `mergedAt != null`  | Pattern works | Keep doing it.             |
| `CLOSED && !merged` | Maybe FP      | Read its comments (below). |
| `OPEN`              | Stale review  | Carry forward in Step 6.   |

For each closed-without-merge PR, `gh pr view <num> --json title,body,comments,reviews` and read **human** reviews/comments only — skip `vercel`, `cursor`, `github-actions` and similar bot authors. Translate to `learned_fps[]`:

- **"This is wrong because X"** → new FP pattern; queue a docs PR for Step 5.
- **"I prefer Y" / style nits** → not an FP; ignore.
- **No human comment** → don't invent a reason; let it resurface.

Skip this step on the first run (no prior PRs).

---

## 2. Scan

```bash
cd apps/web && npx -y react-doctor@latest --json --yes > /tmp/diagnostics.json && cd ../..
```

Concat each project's `diagnostics[]`. Each entry has `filePath`, `plugin`, `rule`, `severity`, `message`, `help`, `line`, `column`, `category`.

- Non-zero exit / unparseable JSON → **CLI failure** (see Stop conditions).
- All `diagnostics[]` empty → jump to **Step 6 — all clear**.

---

## 3. Filter

Read `.react-doctor/false-positives.md`. Drop diagnostics matching any pattern there **or** in `learned_fps[]`. Patterns that say "skip after verifying X" require an actual `grep` / `Read` before suppressing.

Keep a count for the Step 6 summary. Do not list individual suppressions anywhere.

---

## 4. Bucket

### Confidence tiers

| Tier       | Definition                                  | Examples                                                                                                                                                                                 |
| ---------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **HIGH**   | Mechanical, no runtime semantics change     | unused exports/files/deps; `[...arr].sort()` → `arr.toSorted()`; `w-4 h-4` → `size-4`; SVG decimal truncation; dropping `cache:"no-store"` from POST.                                    |
| **MEDIUM** | Runtime touched, localized, well-understood | `next/dynamic` for heavy libs; `Promise.all` on independent awaits; `useState` mirror-of-props → `key=` reset; `await track()` → `waitUntil(track())`; moving `await` past a sync guard. |
| **LOW**    | Needs human judgment                        | auth/billing/webhook code; data-dependent edge cases; cross-file refactors.                                                                                                              |

### Bucketing rules

- **HIGH, same category, ≥2 occurrences** → one PR per category.
- **HIGH, isolated** → its own PR.
- **MEDIUM** → one PR per fix (1 file).
- **LOW** → don't open, don't list. Resurfaces next run; humans handle worthwhile ones offline.

A reviewer must be able to merge `[React Doctor] chore: drop unused exports` without reading `[React Doctor] perf: lazy-load recharts`. Bundle by category, not by quantity.

### Safety budget

- HIGH bucket: ≤30 files, ≤600 LoC. Split by top-level subfolder if exceeded (e.g. `chore(icons): SVG precision` vs `chore(home): SVG precision`).
- Any bucket needing >10 file edits to land cleanly → drop it; it'll resurface tomorrow.

### Skip duplicates

From Step 1's open-PR data: if a candidate bucket's `<slug>` appears in any open PR's body marker (`<!-- react-doctor:bucket=<slug> -->`) or branch name, skip the bucket and add the existing PR to the carry-forward list.

---

## 5. Ship

For each code-fix bucket and each entry in `learned_fps[]`:

1. **Branch**: `react-doctor/$(date -u +%Y-%m-%d)/<slug>` (short kebab: `unused-exports`, `lazy-recharts`, `fp-jsx-pascal-trpc`).
2. **Edit.** Per `CLAUDE.md`: inline first, no speculative abstraction. FP-doc PRs touch **only** `false-positives.md` — one pattern per PR.
3. **Validate** from repo root: `pnpm typecheck && pnpm lint && pnpm format`. One retry on failure; still failing → reset the branch, move on silently.
4. **Commit** with a conventional prefix: `chore:` / `perf:` / `fix:` / `refactor:` (code) or `docs(react-doctor):` (FP-doc). Keep the commit subject terse — the value-rich phrasing lives in the PR title.
5. **Push and open the PR.**

   **Title** — value-first, no conventional-commit prefix, ≤72 chars. Lead with a verb + count + what:
   - `[React Doctor] Removed 10 unused exports across web and website-rd`
   - `[React Doctor] Truncated SVG path decimals across 9 icons`
   - `[React Doctor] Lazy-loaded recharts to drop the admin bundle by ~80 KB`
   - `[React Doctor] FP pattern: jsx-pascal-case ignores tRPC $trpc namespace`

   **Label**: `react-doctor` (`gh label create react-doctor --color FBCA04 --description "Opened by react-doctor" --force` if missing).

   **Body** — bolded value lead, optional 2–3 sentence "why it matters", then the change list. Each change bullet **must** be a GitHub permalink to the pre-change line (use the scan-time SHA, not the branch — branches get deleted on merge). GitHub renders permalinks as inline code snippets, which makes the diff scannable from the PR body itself. No "Validation" section — `pnpm typecheck`/`lint` passing is the workflow's baseline, not value-add prose.

   ```markdown
   **<title repeated as bold lead>** — <8–15 word context>

   <Optional 2–3 sentences: what + why anyone cares (perf, bundle size,
   correctness, dev-loop sanity). Skip when the title already says it.>

   ## Changes

   - https://github.com/<owner>/<repo>/blob/<scan-sha>/<path>#L<line> — `<rule>`: <what changed>
   - …

   ---

   <!-- react-doctor:bucket=<slug> -->
   <!-- react-doctor:confidence=<HIGH|MEDIUM|DOCS> -->
   ```

   **Inline review comments** — for MEDIUM PRs and any HIGH change where the diff doesn't speak for itself, post one-line "why this" comments anchored to the changed lines. One review POST, all comments together:

   ```bash
   cat > /tmp/review.json <<'JSON'
   {"event":"COMMENT","body":"","comments":[
     {"path":"apps/web/foo.tsx","line":42,"body":"why this line"},
     {"path":"apps/web/bar.tsx","line":10,"body":"why this line"}
   ]}
   JSON
   gh api "repos/$GITHUB_REPOSITORY/pulls/$PR_NUMBER/reviews" \
     --method POST --input /tmp/review.json
   ```

   Skip inline comments on PRs where every line is the same mechanical change (e.g. 20 SVG truncations) — the body's change list already explains it.

   **FP-doc PR body** — same shape, swap `## Changes` for `## Pattern` + `## Why it's wrong`, and credit the prior PR that motivated it:

   ```markdown
   **New FP pattern: `<rule>`** — <one-line shape>

   Motivated by review feedback in #<closed-pr>.

   ## Pattern

   <2–5 line description of the code shape>

   ## Why it's wrong

   <1–2 sentences>

   ---

   <!-- react-doctor:bucket=docs-fp-<rule-slug> -->
   <!-- react-doctor:confidence=DOCS -->
   ```

---

## 6. Track

The tracking issue is a **live dashboard** — one stable URL across runs. Step 1 already fetched the open `react-doctor:tracking` issue (if any); call it `existing_issue`.

**Compute the score lead.** Repo score is `100 − 1.5 × |unique error rule keys| − 0.75 × |unique warning rule keys|`, rounded, clamped to 0. Compute `S_before` from the post-filter diagnostic set (Step 3 output) and `S_after` from the same set minus every diagnostic today's PRs would address if merged. Lead with the score when `S_after − S_before ≥ 1`; otherwise lead with the open-PR count.

**Reuse or create.** Let `open_prs` = today's new PRs + carry-forward (every Step 1 "still open" PR whose `<slug>` isn't covered by a PR opened today).

| State                                          | Action                                                                                |
| ---------------------------------------------- | ------------------------------------------------------------------------------------- |
| `existing_issue` open AND `open_prs` non-empty | `gh issue edit <num> --title "…" --body-file /tmp/body.md` — refresh in place.        |
| No open issue AND `open_prs` non-empty         | `gh issue create --label react-doctor:tracking --title "…" --body-file /tmp/body.md`. |
| `existing_issue` open AND `open_prs` empty     | Comment `No findings as of YYYY-MM-DD — closing.` and close it.                       |
| No open issue AND `open_prs` empty             | Do nothing.                                                                           |

**Never** open a second issue when one is already open. **Never** close an issue that still has open PRs in its body.

**Title** — reflects current live state, not just today's diff:

- `[React Doctor] Score 65 → 70 — 12 PRs awaiting review` (score moved this run)
- `[React Doctor] 12 PRs awaiting review` (no score move)

**Label**: `react-doctor:tracking` (`gh label create react-doctor:tracking --color 0E8A16 --description "Live react-doctor tracking issue" --force` if missing). One label, one issue — always.

**Body** — value at the top, open PRs in the middle, technical detail collapsed at the bottom. Each PR bullet carries its opening date so stale ones are obvious, plus an 8–12 word value blurb so the issue is readable without opening each PR. Skip any empty section/subsection (no `_None this run_` filler). Always include a `_Last updated: YYYY-MM-DD_` footer.

```markdown
**<title repeated as bold lead>**

<One-line summary of what this dashboard tracks — e.g. "Open PRs from the
daily react-doctor sweep, awaiting human review.">

## Open PRs

### High confidence

- [ ] #<num> — `<title>` — <8–12 word value blurb> (opened YYYY-MM-DD)

### Medium confidence

- [ ] #<num> — `<title>` — <blurb> (opened YYYY-MM-DD)

## False-positive updates

- [ ] #<num> — `<title>` — <blurb> (opened YYYY-MM-DD)

<details>
<summary>Latest run details</summary>

- Diagnostics scanned: M
- False positives skipped: F
- Score before / projected: <S_before> → <S_after> / 100
- Categories addressed: <comma-separated list>

</details>

_Last updated: YYYY-MM-DD_
```

---

## Stop conditions

- **CLI failure** — open one issue `React Doctor — run failed YYYY-MM-DD` with the stderr, label `react-doctor:tracking`, exit. No code PRs.
- **PR cap** — after 16 PRs pushed, stop. The rest resurface tomorrow.
- **Validation retry exhausted** — abandon that bucket, move on.
- **No-op run** — follow the "zero PRs" branch of Step 6.

## Hard rules

- Never push to `main`, force-push, or modify a closed/merged PR.
- Never edit `.github/workflows/react-doctor-bot.yml` or this playbook. The only bot-authored doc edit is appending to `false-positives.md`, via its own docs PR.
- Never touch `package.json` versions or `pnpm-lock.yaml` unless the fix is "remove unused dependency" (then run `pnpm install` and commit the lockfile in the same PR).
- Never open a PR before `pnpm typecheck && pnpm lint` pass.
- Never commit `.env*` or other secrets.
- Follow `CLAUDE.md`: inline first, no speculative abstraction.
