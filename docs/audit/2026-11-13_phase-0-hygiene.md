# Phase 0 — secret triage and repository hygiene proposals

**Date:** 2026-11-13 (report), 2026-11-14 (finalised)
**Author:** DeepSeek V4.1 Flash Free (agent)
**Scope:** Phase 0 items 0.2 and 0.4. No value of any candidate secret appears in
this file; only shapes, lengths, hosts and classification.

---

## 0.2 — Secret triage

### Scan reproduced

The pattern scan was re-run against both trees so the result is not taken from a
terminal transcript:

```bash
git grep -c -I -E 'postgres(ql)?://[^[:space:]"]+:[^[:space:]"@]+@' \
  <ref> -- docs scripts supabase src
```

| Tree | Files with a hit |
|------|------------------|
| `origin/main` (`5b359fc`) | none |
| `sprint-3/booking-staff-slice` (`419c623`) | 5 files, 6 lines |

All hits arrive with PR #3. `sbp_`-prefixed token scan = **0 matches** in both
trees (`.git grep -c -I -E 'sbp_[A-Za-z0-9]{20,}'`). JWT-shaped literal scan
(`eyJ…eyJ…`) = **0 matches** in both trees.

**Post-merge re-check (2026-11-14).** PR #3 is merged, so those same six
placeholder lines are now on `main`. The classification does not change: every
one is a loopback host, an `.invalid` host, a `<…>` template, or literal
`USER`/`PASSWORD`/`HOST`/`DATABASE` field names. No new hit appeared.

### Line-by-line classification

Each candidate was parsed structurally — scheme, username, password **length**
(never value), host, port, database — to decide placeholder versus real.

| # | File:line | Observed shape | Classification |
|---|-----------|----------------|----------------|
| 1 | `docs/evidence/2026-11-10_hosted-rehearsal-precondition.md:73` | Not a parseable URI. Contains literal `<` and `>` delimiters and the word `password`. | **placeholder** — an instructional template inside a fenced example. |
| 2 | `docs/evidence/2026-11-13_source-db-setup-probe.md:36` | `postgresql://postgres:<3 chars>@127.0.0.1:5432/postgres` (trailing literal `\n` in the text, i.e. not a real string) | **placeholder** — loopback host, doc example of the probe's success case. |
| 3 | `docs/evidence/2026-11-13_source-db-setup-probe.md:44` | `postgresql://postgres:<3 chars>@nonexistent.invalid:5432/postgres` | **placeholder** — `.invalid` is reserved by RFC 2606 and can never resolve; doc example of the failure case. |
| 4 | `scripts/ci/negative-controls.sh:194` | `postgresql://probe:<5 chars>@nonexistent.invalid:5432/postgres` | **placeholder** — negative-control fixture for an unresolvable host. A credential that cannot exist. |
| 5 | `scripts/ops/set-source-db.sh:64` | `postgresql://USER:<8 chars>@HOST:5432/DATABASE` | **placeholder** — literal uppercase field names in a usage message. |
| 6 | `scripts/ops/source-db.mjs:98` | Not a parseable URI. Contains literal `<…>` delimiters. | **placeholder** — remedy string telling the operator which Dashboard URI to copy. |

**Verdict: 6 of 6 are placeholders. Nothing real was found. No stop-the-line
condition.**

### Why the two `CHECK-THIS` lines from the heuristic are still placeholders

The heuristic flagged `scripts/ci/negative-controls.sh:194` and
`scripts/ops/set-source-db.sh:64` because their shape passed the regex but they
carried none of the usual placeholder markers. Reading the host is decisive:

- `nonexistent.invalid` is a reserved non-resolving TLD (RFC 2606). A real
  credential cannot be attached to it.
- `HOST` / `USER` / `PASSWORD` / `DATABASE` are literal field names, not values.

### `.env.test` — names only

Tracked by `.gitignore` exception (`.gitignore:26`, `!.env.test`). It is the
hermetic browser-test environment and the file states it holds no secret.

| Property | Observed |
|----------|----------|
| Variables declared | 23 |
| `VITE_SUPABASE_URL` | `http://127.0.0.1:54521` — loopback, disposable stack |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | 46 chars, contains the marker `local`; overwritten at run time by the gitignored `.env.test.local` |
| Remaining variables | seed UUIDs, seed emails, order codes, booking labels — none credential-shaped |

The only `VITE_*` names are the three permitted ones (`VITE_DATA_MODE`,
`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`). No `VITE_*` name in any
tracked file matches `SECRET|TOKEN|PASSWORD|SERVICE|DB_URL|DATABASE|PRIVATE|ACCESS`.

### Credential-shaped assignments elsewhere in tracked scripts

`git grep` for `*SECRET*`, `*SERVICE_ROLE*`, `*DB_PASS*`, `*PASSWORD*`,
`*ACCESS_TOKEN*`, `*PRIVATE_KEY*` assignments returned only disposable local
values or runtime lookups:

| File:line | Shape | Classification |
|-----------|-------|----------------|
| `scripts/verify-db.sh:18` | `stitchflow_local_only` | local Docker Postgres password |
| `scripts/db/booking_concurrency_test.sh:18` | same default, overridable | local |
| `scripts/ops/backup-restore-rehearsal.sh:39` | `stitchflow_restore_local_only` | local |
| `scripts/ci/negative-controls.sh:151` | `not-a-real-credential` | negative-control fixture |
| `scripts/e2e/hermetic.sh:195` | `SUPABASE_LOCAL_SERVICE_ROLE_KEY="$SERVICE_KEY"` | runtime-derived from `supabase status` for the disposable stack; not a literal |

**0.2 conclusion:** no committed secret. The previously exposed production
database password and personal access token are tracked as owner actions
(`docs/owner-blockers.md` B2 CLOSED, B3 OPEN), not as repository content.

### Working-tree finding: `.env.pilot` was unignored on `main` — **RESOLVED**

Discovered while staging the Phase 0 docs. This is a **real credential file**,
not a placeholder, so it is called out explicitly:

| Fact | Observed |
|------|----------|
| Path | `.env.pilot` (repository root) |
| Size | 1,968 bytes |
| Tracked? | **no** — `git ls-files --error-unmatch .env.pilot` fails |
| Ever committed? | **no** — `git log --all -- .env.pilot` returns 0 commits |
| Contents (names only) | `SUPABASE_PILOT_URL`, `SUPABASE_PILOT_PUBLISHABLE_KEY`, and 11 `STITCHFLOW_E2E_*_PASSWORD` / `*_EMAIL` / invite pairs — live pilot sign-in credentials |

No value was read out of the file; only variable names, lengths and shapes. It
has never entered git history, so **no rotation is implied by a leak**. The risk
was accidental commit: `git add -A` would have staged it.

**Resolved by merging PR #3 (2026-11-14).** `.gitignore` now carries `.vercel`
and `.env*` with `.env.example` and `.env.test` re-included; verified with
`git check-ignore -v .env.pilot` → `.gitignore:20:.env*`. Owner action B9 is
closed by the merge. No STOP condition was triggered: nothing real was ever
committed.

---

## 0.4 — Hygiene proposals (owner executes; B and C have since been executed)

### A. Stale branches

Re-measured on 2026-11-14 **after** the owner merged PR #3 and closed PR #1
(`git rev-list --count origin/main..<branch>`, `git merge-base --is-ancestor <branch> origin/main`).

| Branch | Ahead | Merged into `main`? | Where | Status |
|--------|------:|---------------------|-------|--------|
| `features/tanstack-start` | 0 | yes | local only | **to delete** |
| `recovery/baseline` | 0 | yes | local only | **to delete** |
| `backup/pre-launch-readiness` | 0 | yes | local only | **to delete** |
| `sprint-3/booking-engine-db` | 0 | yes (PR #2) | local + `origin` | **to delete local and remote** |
| `sprint-3/booking-staff-slice` | 0 | yes (PR #3, merged) | local + `origin` | **to delete local and remote** |
| `sprint-2/start-foundation` | 3 | **no** — PR #1 closed as superseded | local + `origin` | **delete local and remote** |

Six branches remain to delete. PR #1 is already closed by the owner, and
`sprint-3/booking-staff-slice` is merged, so neither blocks deletion any more.
`git ls-remote --heads origin` now shows only `main` and
`sprint-2/start-foundation` (plus the two Phase 0 branches still awaiting merge).

Exact owner commands, for the record (not run by this agent):

```bash
git branch -d features/tanstack-start recovery/baseline backup/pre-launch-readiness \
                 sprint-3/booking-engine-db sprint-3/booking-staff-slice
git push origin --delete sprint-3/booking-engine-db sprint-3/booking-staff-slice sprint-2/start-foundation
```

### B. `v1.0.1` tag re-point — **DONE by the owner (2026-11-14)**

Original finding, kept for the record:

| Fact | Observed at the time |
|------|----------|
| Tag type | annotated (`git cat-file -t v1.0.1` → `tag`) |
| Original target | `612531d` — "docs(sprints): add sprint-00a record and update sprint-01 status", 2026-11-05 |
| Reachable from `main`? | **no** (`git merge-base --is-ancestor v1.0.1 origin/main` → false) |
| Reachable from any branch? | **no** — `git branch -a --contains 612531d` returned only the tag itself |

Owner action taken: the tag was deleted and re-created on `3b3212f`, then pushed.

| Verification, 2026-11-14 | Observed |
|---|---|
| Tag object | `tag` (annotated) |
| Target | `3b3212f` — 2026-11-05 |
| On `main`? | **yes** — `git merge-base --is-ancestor v1.0.1 origin/main` succeeds |
| Old object removed | `git tag -d` reported `was 646718e`; remote deletion reported `[deleted] v1.0.1` |

`3b3212f` is the pre-rebase docs commit whose content re-landed on `main`, so the
tag now marks a reachable point. It is not `63b48c7`; the release *version*
commit remains untagged. That is a cosmetic imprecision, not a dangling ref, and
is recorded as an observation rather than a new action.

### C. Tags reachable from `main` — **VERIFIED after the merge**

| Tag | Commit | On `main` now? |
|-----|--------|----------------|
| `v1.0.0` | `79835c5` | yes |
| `v1.0.1` | `3b3212f` | yes (re-pointed) |
| `v1.1.0` | `56214a7` | yes |
| `v1.2.0` | `0e2ba23` | yes |
| `v1.3.0` | `e6b2df7` | **yes** |
| `v1.4.0-rc.1` | `8bb76e6` | **yes** |
| `v1.4.0-rc.2` | `2d55e0a` | **yes** |

All seven tags are now ancestors of `origin/main` (`git tag -l` + per-tag
`merge-base --is-ancestor`). No re-tagging was required by the merge; PR #3's
line became part of `main`'s history.

Note: `v1.4.0-rc.1` and `v1.4.0-rc.2` remain **pre-release** tags. A final
`v1.4.0` is a release decision for the owner, not proposed here.
