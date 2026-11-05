# Database Contracts Brief

> Condensed from `docs/db-contracts.md`. The canonical file carries the full table-by-table contract.

## Tenancy

Every tenant table carries `atelier_id uuid not null references public.ateliers(id) on delete cascade`
except `order_progress_notes`, which derives tenancy from `orders`.

## Tables

| Table | Key | Tenant column | Read | Write |
|-------|-----|---------------|------|-------|
| `ateliers` | `id` | self | anon: public columns; member: own | owner |
| `members` | `id` = auth uid | `atelier_id` | self, staff, patron→staff | owner; self-update |
| `lookbook_items` | `id` | `atelier_id` | public published; staff all | staff insert/update; owner delete |
| `orders` | `id` | `atelier_id` | owner; assigned employee; own patron | owner; assigned employee update |
| `order_financials` | `order_id` | `atelier_id` | owner; own patron | owner |
| `order_progress_notes` | `id` | via `order_id` | owner; assigned employee; own patron | owner; assigned employee |
| `measurements` | `id` | `atelier_id` | owner; assigned employee; own patron | owner; assigned employee |
| `appointments` | `id` | `atelier_id` | owner; assigned employee; own patron | anon pending insert; own patron insert; owner/assigned employee **update only** — no staff `INSERT` policy |
| `feedback` | `id` | `atelier_id` | owner; own patron | own patron insert; owner update |

## Invariants

1. A patron can read `order_financials` only for an order where `orders.client_id = auth.uid()`.
2. An employee can read `members` in their atelier so names resolve; a patron sees only owner and
   employee rows, never other patrons.
3. `atelier_id`, `client_id`, and `assigned_tailor_id` cannot be reassigned across tenants; triggers
   raise on tenant reassignment.
4. A member cannot change their own `role` or `active`; only an owner can. Enforced by
   `guard_member_mutation`.
5. Anonymous inserts into `appointments` must be `status = 'pending'` and `client_id is null`.
6. `active = false` revokes access on the next query, not at the next login.
7. Country and city are nullable only until onboarding completes; a live atelier must set both.

## Writers

| Table | Application writer |
|-------|--------------------|
| `orders`, `order_financials`, `order_progress_notes` | `persistOrder`, `persistOrderStatus`, `persistTailorAssignment` |
| `measurements` | `persistMeasurement` |
| `appointments` | `persistAppointment`, `persistAppointmentStatus` |
| `feedback` | `persistFeedback`, `persistFeedbackStatus` |
| `lookbook_items` | `persistLookbookItem` |
| `ateliers`, `members` | `createAtelierForCurrentUser` (two client inserts, not atomic), `persistAtelierSettings` |

Anonymous fitting requests are written by `persistAppointment` with `client_id = null`, `status =
'pending'`, and the guest's name/phone. A member booking carries their auth uid.

`create_atelier_for_current_user(...)` is **not** in the current schema: created in
`20261031110000_baseline_reconciliation.sql`, dropped at `20261031111500_direct_uid_rls.sql:160`.
Do not document or call it as if it exists.

## Coupling risks

- `loadAtelierSnapshot` reads `order_financials` in the same batch as orders. For a patron, RLS returns
  only their own rows; the mapper must not assume a balance exists for every order.
- `appointments.client_id` is nullable for anonymous requests; mappers must not dereference it.
- `feedback.order_id` is `on delete set null`; a deleted order leaves historical feedback.
- The client `Order` type interchanges `id` and `order_code`. Any new writer must be explicit about
  which one it holds.

## Verification

`npm run verify:db` applies the whole chain to an empty database and runs the 12-scenario
`supabase/tests/rls_isolation_test.sql`. A contract change without a scenario is unproven.

The suite proves gates 1–7. It does **not** prove booking concurrency: `appointments` has no
exclusion constraint, resource, hold or idempotency key, and overlapping rows are accepted. Gate 8
is FAIL and belongs to Sprint 3 / ADR-009. See `docs/audit/2026-11-05_sprint-0-audit.md`.
