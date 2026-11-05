# Sprint 1 — Forward-Only Migration Reconciliation Plan

Status: Proposed and approved by owner, 2026-11-05. ADR-008 and ADR-011 approved.
This document describes the next migrations. No existing migration is edited. All deltas land as new,
idempotent `supabase/migrations/` files and are exercised by `npm run verify:db` equivalents.

## 1. Tenant domains and redirect rows

- `tenant_domains`: `id`, `atelier_id` (FK), `domain` unique normalised lowercase, `is_primary`,
  `verification_token`, `verified_at`, `ssl_status`, timestamps.
- `atelier_slug_redirects`: `old_slug`, `atelier_id`, `created_at`.
- Tenant resolution order remains server-side: verified custom domain → platform subdomain → reserved
  slug path → 404. No client-side fallback.

## 2. Supabase Auth identity and membership bootstrap

- Extend `atelier_users` to carry the Auth user (`user_id` already exists) and onboarding state if
  needed; add `invitations` table for employee and client invite tokens with expiry.
- Owner onboarding bootstraps atelier + owner membership through a single transaction or RPC, never
  through separate client writes.

## 3. Audit log plus triggers

- `audit_log`: `id`, `atelier_id`, `actor_user_id`, `table_name`, `record_id`, `action`,
  `before`, `after`, `created_at`.
- Triggers on `orders`, measurement cards, and `payments` write one row per insert/update/delete.

## 4. Booking concurrency (Sprint 3 design in place now as prep)

- Resource rows and availability table remain future (Sprint 3), but Sprint 1 introduces no
  overlapping-hold claim.
- No Sprint 1 migration may add bookable capacity without an exclusion constraint and RLS test.

## 5. Payments ledger (append-only)

- `payments` stays append-only. Introduce quote/deposit/invoices only when Sprint 4 begins.
- Any balance is derived, never stored.

## 6. RLS policy delta

- Every new table above must carry enable RLS + tenant scoping before its migration can merge.
- Client read-only columns and published lookbook content stay restricted as in current policies.

## Exit

Sprint 1 migrations must pass `supabase/tests/rls_isolation_test.sql` extended scenarios and include
the new two-tenant cross-read assertions required by Sprint 1.
"