# PR #3 integration report

**Date:** 2026-11-13
**Auditor:** DeepSeek V4.1 Flash Free (agent)
**Scope:** read-only review of `dmuhoro/StitchFlow` PR
[#3 — "Sprint 3.5 booking staff slice"](https://github.com/dmuhoro/StitchFlow/pull/3).
**Branch:** `docs/phase-0-truth`, branched from `origin/main` at
`5b359fc` (`Merge pull request #2`).

This report does **not** merge, push to, or modify PR #3. Per the owner's
decision, PR #3 merges first with a merge commit; PR #1 is superseded and
TanStack Start (ADR-008) is redone later on merged `main`.

---

## 1. Head and shape

| Fact | Value | How observed |
|------|-------|--------------|
| Base | `origin/main` @ `5b359fc` | `git merge-base origin/main HEAD` |
| Head commit | `419c62331a5623bf6b217f38722fe7c4e090afd2` (`419c623`) | `gh pr view 3 --json headRefOid` |
| Commits | 40 | `git rev-list --count origin/main..sprint-3/booking-staff-slice` |
| Files changed | 129 | `gh pr view 3 --json changedFiles` |
| Lines | +11,959 / −507 | `gh pr view 3 --json additions,deletions` |
| Merge state | `MERGEABLE` / `CLEAN`, not a draft | `gh pr view 3 --json mergeable,mergeStateStatus,isDraft` |

## 2. Diffstat by directory

Measured with
`git diff --numstat origin/main...sprint-3/booking-staff-slice`, grouped by the
first path segment.

| Directory | Files | Added | Deleted |
|-----------|------:|------:|--------:|
| `supabase/` | 13 | +2,332 | −40 |
| `scripts/` | 20 | +3,445 | −8 |
| `docs/` | 36 | +2,845 | −134 |
| `src/` | 22 | +1,510 | −170 |
| `(root)` | 16 | +1,023 | −41 |
| `e2e/` | 5 | +307 | −12 |
| `sprints/` | 6 | +233 | −0 |
| `.ai/` | 9 | +154 | −98 |
| `.github/` | 1 | +108 | −3 |
| `tests/` | 1 | +2 | −1 |

The volume is concentrated in `supabase/` + `scripts/`, i.e. database proof and
operator tooling, not in the browser bundle.

## 3. Every migration new since `main`

Seven migrations are added. **None of them backfills or rewrites existing row
data.** All are forward-only additions.

| Migration | Destructive? | Policy / grant change? | Backfill? | Risk note |
|-----------|--------------|------------------------|-----------|-----------|
| `20261107130000_booking_staff_slice.sql` | Partly — `drop function if exists public.hold_slot(<12 args>)` | Yes — revokes/grant on 6 functions | No | Replaces the 12-arg `hold_slot` with a 13-arg signature (new arg last, defaults `null`, so positional callers still bind). Adds `bookings.appointment_id`, a composite tenant FK, a partial unique index (one live booking per request), and `get_availability` / `expire_stale_holds`. `expire_stale_holds()` is granted to `service_role` only. Dropping the old overload means a *stale* client calling 12 positional args still resolves to the new function via defaults; a client passing named args from the old signature would fail loudly, not silently. |
| `20261107200000_add_audit_log.sql` | No | No | No | Adds `insert_audit_log` + `log_member_change` and an `AFTER INSERT/UPDATE/DELETE` trigger on `public.members`. Reuses the Sprint-1 `audit_log` table. Trigger fires for every membership change including the onboarding insert, so audit volume grows with membership churn. |
| `20261107201000_owner_invitation_permissions.sql` | No | No | No | Adds `check_owner_creation` (BEFORE INSERT on `invitations`) and `prevent_last_owner_demotion` (BEFORE UPDATE OF role on `members`). **Two defects found — see §8.** |
| `20261107202000_add_source_to_appointments.sql` | No | No | No | Adds `appointments.source text`, then `varchar(255)`. This already satisfies Phase 2.2(d); the phase item is delivered early by this PR and must not be re-implemented. |
| `20261107210000_guard_appointment_booking_status.sql` | Partly — `drop policy appointments_public_insert`, `revoke insert ... from anon` | Yes — removes the anonymous write path on `appointments` | No | This is the deliberate closing of anonymous appointment inserts until a rate-limited guest boundary exists. It changes live product behaviour: the visitor request form stops persisting. Also adds the status guard, the booking→appointment status sync trigger, and `create_booking_resource`. |
| `20261107220000_restrict_client_appointment_insert.sql` | No — replaces one policy | Yes — narrows `appointments_client_insert_own` | No | A client may insert only `status = 'pending'` with `assigned_tailor_id is null`, for their own member row in their own atelier. This closes the insert-side bypass of the update-only status guard. |
| `20261108173000_audit_order_financials.sql` | No — replaces one policy | Yes — narrows `audit_log_member_read`; revokes execute on the trigger fn | No | `order_financials` audit rows become owner-only; all other audit rows stay member-readable in-tenant. Financial before/after snapshots are captured on every order-financial write. |

Cross-cutting risk: the two policy replacements in
`20261107220000` and `20261108173000` **reduce** access. A client that relied on
inserting a non-`pending` appointment, or staff relying on reading financial
audit rows, now receives a policy denial. That is the intended direction (fail
closed), but it is a behaviour change that must be smoked in the pilot.

## 4. `supabase/` outside migrations

| File | Change | Note |
|------|--------|------|
| `supabase/seed.sql` | +131 | Adds deterministic booking fixtures. Seed stays in `seed.sql`, not a migration (ADR-003 respected). |
| `supabase/tests/booking_staff_slice_test.sql` | +766 (new) | New staff-slice RPC/policy proof. |
| `supabase/tests/booking_engine_test.sql` | +49/−? | Extended concurrency proof. |
| `supabase/tests/rls_isolation_test.sql` | +157 | Extended isolation scenarios (now 14). |
| `supabase/tests/hosted_rls_e2e.sql` | +27 | Hosted role proof extended. |
| `supabase/README.md` | +19 | Gate documentation. |

## 5. `src/lib/`

| File | Change | Note |
|------|--------|------|
| `atelier-repository.ts` | +282/−110 | All writes tenant-scoped; fails closed without a resolved atelier. Touches the tenant boundary — `docs/db-contracts.md` is updated in the same PR. |
| `atelier-booking-repository.ts` | +152 (new) | Thin typed wrapper over `hold_slot` / `confirm_booking` / `cancel_booking` / `get_availability`. |
| `atelier-write-boundary.ts` | +10 (new) | Write-boundary guard shared by repositories. |
| `atelier-repository.test.ts` | +187 (new) | 3 tests. |
| `telemetry.ts` / `telemetry-vercel.ts` | +123 / +42 (new) | Redacted, allowlisted event seam. No PII keys possible by construction. |
| `telemetry.test.ts` | +153 (new) | 13 tests, incl. inherited-key rejection. |
| `error-recovery.ts` / `error-recovery.test.ts` | +39 / +31 (new) | Mode-aware crash copy; 5 tests. |

## 6. Build, deploy and CI

| File | Change | Note |
|------|--------|------|
| `vite.config.ts` | modified | Base config retained. |
| `vite.pilot.config.ts` | **new** | Pilot build config. Loads the active mode's env and throws at config time when a `VITE_*` **name** is credential-shaped. Name-based on purpose. |
| `vercel.json` | **new** | Vercel static pilot hosting (ADR-012). |
| `netlify.toml` | modified | Netlify remains configured. |
| `.github/workflows/ci.yml` | +108/−3 | Triggers widened from `main` only to `['**']` for push and PR, plus `workflow_dispatch`. Adds a `check:node` step, `test:unit`, two demo-artifact negative proofs, one project-ref drift proof, and a third `e2e` job running the hermetic browser suite twice. |
| `package.json` | modified | Adds `check:node`, `test:unit`, `test:e2e:hermetic`, `verify:controls`, `rehearse:restore`, `ops:set-source-db`, `preflight`, and the ops scripts. |
| `.nvmrc` | modified | Declares major 22 (was 20, end-of-life). |

## 7. CI on the head commit

`gh pr checks 3` against `419c623`:

| Check | Result |
|-------|--------|
| Types, docs and bundle | pass (×2 — push and PR runs) |
| Migration chain and RLS | pass (×2) |
| Hermetic browser journey | pass (×2) |
| Vercel | pass (deployment completed) |
| Vercel Preview Comments | pass |

Runs observed: `43479989326` and `43479997782` (one per event), both fully green.

## 8. Defects observed in PR #3 (outside Phase 0 scope — reported, not fixed)

These are one-liners per the operating contract. They belong to Phase 2.2(c),
which explicitly asks for the last-owner invariant, so they are inputs to that
item rather than Phase 0 work.

1. **`check_owner_creation` is unreachable.** `public.invitations.role` carries
   `CHECK (role IN ('employee','client'))`
   (`supabase/migrations/20261106130000_sprint1_invitations.sql:10`), so an
   `owner` invitation cannot be inserted and the trigger
   (`20261107201000_owner_invitation_permissions.sql:24-27`) can never fire.
   Owner-role (co-owner) invitations are therefore **not implemented**, despite
   the migration's name.
2. **`check_owner_creation` is not tenant-scoped.** It selects
   `role` from `public.members WHERE id = performer AND active = true` with no
   `atelier_id` predicate
   (`20261107201000_owner_invitation_permissions.sql:14`). It does not compare
   the performer's atelier with `NEW.atelier_id`.
3. **The last owner can be deleted.** `members_owner_delete`
   (`20261031112000_rls_final.sql:252`) permits an owner to `DELETE` members,
   and `prevent_last_owner_demotion` fires only `BEFORE UPDATE OF role`
   (`20261107201000_owner_invitation_permissions.sql:51-56`). "The last owner
   can never be removed" is not true today.

None of the three is exploitable cross-tenant in the current schema (RLS on
`invitations` requires ownership of `NEW.atelier_id`), but the claimed
invariant is not provided by the code.

## 9. What proves demo mode is unaffected

Demo mode is the default (`VITE_DATA_MODE` → `demo`, ADR-005). PR #3 must not
make the demo path lie, and must not let demo code reach production.

| Proof | What it asserts | Where |
|-------|-----------------|-------|
| Negative control "demo artifact, no deploy context" | a demo build still builds and passes the gate with no deploy context | `scripts/ci/negative-controls.sh` (PR#3 adds the file, +250 lines) |
| Negative control "demo artifact in a production deploy context" | the same demo artifact is **rejected** when `CONTEXT=production` | same file; also run in `ci.yml` as "Prove the production gate rejects a demo-mode artifact" |
| Negative control "Vercel production rejects a demo-mode artifact" | `VERCEL_ENV=production` also rejects | `ci.yml` step "Prove Vercel production rejects a demo-mode artifact" |
| Negative control "protected browser flow against a demo-mode artifact" | the authenticated journey fails against a demo build instead of silently passing | `scripts/ci/negative-controls.sh` step 3 |
| `error-recovery.test.ts` (5 tests) | production crash copy offers no demo reset and never says "demo"; demo mode keeps the reset | `src/lib/error-recovery.test.ts` |
| `atelier-repository.test.ts` (3 tests) | a write with no resolved atelier is refused rather than degrading | `src/lib/atelier-repository.test.ts` |
| `telemetry.test.ts` (13 tests) | no PII can be attached; a throwing sink cannot escape | `src/lib/telemetry.test.ts` |
| Hermetic browser job (×2 runs) | six journeys run against a disposable loopback Supabase stack built in `supabase` mode, not demo | `ci.yml` job `e2e`, `scripts/e2e/hermetic.sh` |
| `npm run verify:build` | the production artifact contains no demo PIN/identity/copy | `scripts/ci/verify-build.mjs` |

Counts above were read from the PR head (`git show
sprint-3/booking-staff-slice:<file>`), not run on this branch — this branch is
`origin/main` and does not contain those files. CI green on `419c623` is the
run-level proof.

## 10. Integration risks for the merge

1. **`fix/secret-guard` overlap.** PR #3 already adds a credential-name guard in
   `vite.pilot.config.ts` and `scripts/ci/verify-build.mjs`. The Phase 0.5
   branch adds an overlapping guard to the same file. It must be rebased onto
   merged `main` and the two guards reconciled into one check, not left as two.
2. **`appointments` anonymous writes are closed.** Any pilot flow that still
   expects the public request form to persist will now be refused. The form is
   disabled in the same PR (`src/components/BookingModal.tsx`), so the failure is
   at the UI, not a silent database denial.
3. **Thirty-four unbounded reads** and pagination are Phase 3 work; this PR does
   not change that.
4. **`docs/current-state.md` already describes PR #3's behaviour** on the PR
   branch. After merge, `main`'s current-state becomes true; until merge, `main`
   understates the tree. No action needed — noted so the diff is not read as a
   pre-merge claim.

## 11. Verdict

The diff is additive and forward-only, its policy changes narrow access rather
than widen it, and its CI is green on the head commit. Three real defects in the
owner-invitation migration are recorded in §8 and assigned to Phase 2.2(c).

**Recommendation:** the report finds nothing that blocks the owner's merge
decision. This agent did not merge, tag, or push to `main`.
