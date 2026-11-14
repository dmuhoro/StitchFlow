# Owner preview status

**Single source of truth for the six owner-preview rows.**
Last updated: 2026-11-13. Update this file in the same PR as any change to a row.

Legend: **PASS** = proven by the cited evidence. **FAIL** = proven broken by the
cited evidence. **NOT RUN** = never executed, or the feature does not exist yet.

> Statuses below are derived from evidence already in the repository (files, CI
> runs, recorded commands). Where this agent did not execute the proving command
> on this branch, the evidence column says so. "NOT RUN" is never upgraded by
> inference.
>
> This branch is cut from `origin/main`, so files that PR #3 introduces are
> cited as code spans rather than links until #3 merges. Everything that exists
> on `main` is a link.

| # | Row | Status | Evidence |
|---|-----|--------|----------|
| 1 | Tenant public page renders branded **without JavaScript**, with a correct share preview | **NOT RUN** | SSR, per-tenant metadata, OG tags, sitemap and robots are not implemented (ADR-008 approved, unimplemented). The current product is a client-rendered SPA, so a no-JS render does not exist to test. [`docs/current-state.md`](current-state.md) lines 137-138; [ADR-008](adr/ADR-008-single-tanstack-start-app.md). |
| 2 | A visitor's fitting request reaches the owner inbox | **NOT RUN** | Blocked by design, not by a test result. Anonymous insert on `appointments` is revoked and the public policy dropped (`supabase/migrations/20261107210000_guard_appointment_booking_status.sql:6-8`, added by PR #3); the visitor booking modal refuses and offers WhatsApp instead ([`src/components/BookingModal.tsx`](../src/components/BookingModal.tsx) at PR #3 head). No guest booking boundary exists, so there is nothing to deliver. |
| 3 | Owner confirms a request into a slot, and a second confirm on the same slot is rejected | **PASS** (local database proof) | Overlap is refused by the GiST exclusion constraint and the RPCs, proven by a 200-attempt / 50-concurrent run: one winner, 199 `slot_unavailable` ([`supabase/tests/booking_engine_test.sql`](../supabase/tests/booking_engine_test.sql), [`scripts/db/booking_concurrency_test.sh`](../scripts/db/booking_concurrency_test.sh)). CI job "Migration chain and RLS" green on PR #3 head `419c623` ([run 43479989326](https://github.com/dmuhoro/StitchFlow/actions/runs/43479989326)). Hosted single confirmation recorded in `docs/evidence/2026-11-10_pilot-gate-reconciliation.md` (PR #3). Not re-run by this agent. |
| 4 | Owner invites a tailor, the tailor redeems, and sees only assigned orders | **PASS** (local browser proof) | Hermetic journey [`e2e/invite-flow.spec.ts`](../e2e/invite-flow.spec.ts) (redemption) and `e2e/role-access.spec.ts` (employee sees only assigned orders) pass in the "Hermetic browser journey" job, which runs the six-journey suite twice against a disposable loopback Supabase stack (`scripts/e2e/hermetic.sh`). Green on `419c623` ([run 43479989326](https://github.com/dmuhoro/StitchFlow/actions/runs/43479989326)). The *co-owner* invitation variant is not implemented — [`docs/audit/2026-11-13-pr3-integration.md`](audit/2026-11-13-pr3-integration.md) §8. Not re-run by this agent. |
| 5 | Marking an order picked up creates a feedback link, and the rating appears in the dashboard | **NOT RUN** | Not implemented. There is no `picked_up` transition, no feedback token, no tokenized public page and no owner feedback view: `grep -rni "picked_up\|feedback_token" src supabase/migrations` returns nothing. This is Phase 2.4. |
| 6 | All of the above on the **PRODUCTION** Supabase project in `supabase` mode, with `verify:build` proving no demo code | **NOT RUN** | Production is the owner's new project and does not exist yet. **Correction, 2026-11-14:** `vercel env pull` for *both* Production and Preview resolves to `qkhfjlxhulekjrfgrdbz` (staging) — a Production deploy would currently use staging. Verified with names only; no value printed. Owner actions: [`docs/owner-blockers.md`](owner-blockers.md) B1 and B17. |

## Phase 0 checklist (truth and hygiene — not one of the six product rows)

| Item | Status | Evidence |
|------|--------|----------|
| **0.1** PR #3 integration report | **DONE** | [`audit/2026-11-13-pr3-integration.md`](audit/2026-11-13-pr3-integration.md) — diffstat by directory, seven new migrations with risk notes, `gh pr checks 3` green on `419c623` |
| **0.2** Secret triage | **DONE — no committed secret** | [`audit/2026-11-13_phase-0-hygiene.md`](audit/2026-11-13_phase-0-hygiene.md) — 6 of 6 flagged matches are placeholders; `.env.test` names inventoried |
| **0.3** Owner registers | **DONE** | this file plus [`owner-blockers.md`](owner-blockers.md) (B1–B17) |
| **0.4** Branch / tag proposals | **DONE — B and C executed by the owner** | hygiene report §0.4; B15 open, B16 closed |
| **0.5** Publication guards | **DONE — rebased onto merged `main` in PR #8 (`13a977e`), pending merge** | 15/15 Node controls + 14/14 bash controls; all three required checks pass on both runs ([push 43569855717](https://github.com/dmuhoro/StitchFlow/actions/runs/43569855717), [PR 43569861206](https://github.com/dmuhoro/StitchFlow/actions/runs/43569861206)) |

Item 0.5 detail: both Vite configs (`vite.pilot.config.ts`, the supported build,
and `vite.config.ts`) call one shared name guard in `scripts/ci/env-guard.mjs`, so
a credential-shaped public-prefixed name is refused before an artifact exists;
`verify-build` re-checks the names independently and scans `dist/` plus every
existing server artifact root for `sbp_` keys, database URIs with an embedded
password, and `service_role` JWTs; `npm run verify:controls` runs both the bash
artifact/demo controls and the Node publication controls, and every guard is
observed rejecting its own failure.

PR #7 head `921a599` passed the same three checks in runs
[43569855621](https://github.com/dmuhoro/StitchFlow/actions/runs/43569855621)
(push) and
[43569861237](https://github.com/dmuhoro/StitchFlow/actions/runs/43569861237)
(pull request). The only change after those runs is this evidence line.

## Observed gaps outside Phase 0 scope (one line each, not fixed here)

- Owner-invitation trigger `check_owner_creation` can never fire: `invitations.role` is constrained to `('employee','client')` (`supabase/migrations/20261106130000_sprint1_invitations.sql:10`) — assigned to Phase 2.2(c).
- `check_owner_creation` is not tenant-scoped (no `atelier_id` predicate, `20261107201000_owner_invitation_permissions.sql:14`) — assigned to Phase 2.2(c).
- The last owner can be deleted: `members_owner_delete` exists (`20261031112000_rls_final.sql:252`) and the guard covers only `UPDATE OF role` — assigned to Phase 2.2(c).
- `.env.pilot` holds live pilot credentials; it was untracked and unignored before PR #3. **Resolved by the merge**: `.gitignore:20` now ignores `.env*`, and the file was never committed.

## What this table deliberately does not claim

- Rows 1 and 5 are **not defects**; they are unbuilt features (Phase 2.1 → 2.4).
- Row 2 is a **deliberate closure**, not a regression: anonymous writes were
  removed because there is no rate limit or bot challenge
  (`docs/current-state.md:147`).
- Row 6 is a **credential/ownership precondition** owed by the repository owner,
  not engineering backlog (Constitution Article VIII.2).

## History

| Date | Change |
|------|--------|
| 2026-11-13 | Initial file. Rows 3 and 4 PASS on local evidence; 1, 2, 5, 6 NOT RUN. |
| 2026-11-14 | Phase 0 checklist added. 0.1–0.4 DONE; 0.5 DONE on PR #8 (15/15 controls, CI run 43565400715) pending merge. |
| 2026-11-14 | Row 6 corrected: Vercel Production **and** Preview both resolve to the staging ref `qkhfjlxhulekjrfgrdbz`. Owner action B17 added. |
| 2026-11-14 | Rebased onto merged `main` (`dea878c`) and re-measured: `v1.0.1` re-pointed and all seven tags reachable, PR #1 closed, `.env.pilot` now ignored. B9/B16 closed, B15 narrowed to six branches. |
