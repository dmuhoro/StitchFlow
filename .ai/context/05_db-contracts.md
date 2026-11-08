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
| `appointments` | `id` | `atelier_id` | owner; assigned employee; own patron | anon denied; client may insert own pending request only; owner/assigned employee update with booking-status guard |
| `booking_resources` | `id` | `atelier_id` | member read active; owner all | owner |
| `resource_availability_rules` | `id` | `atelier_id` | member read | owner |
| `blackout_dates` | `id` | `atelier_id` | member read | owner |
| `bookings` | `id` | `atelier_id` | staff all; patron own | **RPC only** — no direct write policy; linked request status sync |
| `idempotency_keys` | `(atelier_id, scope, key)` | `atelier_id` | none | **RPC only** — RLS with no policies |
| `feedback` | `id` | `atelier_id` | owner; own patron | own patron insert; owner update |

## Invariants

1. A patron can read `order_financials` only for an order where `orders.client_id = auth.uid()`.
2. An employee can read `members` in their atelier so names resolve; a patron sees only owner and
   employee rows, never other patrons.
3. `atelier_id`, `client_id`, and `assigned_tailor_id` cannot be reassigned across tenants; triggers
   raise on tenant reassignment.
4. A member cannot change their own `role` or `active`; only an owner can. Enforced by
   `guard_member_mutation`.
5. Anonymous users cannot insert appointments until the rate-limited guest edge boundary ships.
6. `active = false` revokes access on the next query, not at the next login.
7. Country and city are nullable only until onboarding completes; a live atelier must set both.
8. `bookings_no_overlap` is `EXCLUDE USING gist (resource_id WITH =, during WITH &&) WHERE status IN
   ('held', 'confirmed')`. Two live reservations for one resource cannot overlap; the database is the
   authority.
9. A booking mutation that does not go through `hold_slot`, `confirm_booking`, `cancel_booking`, or
   `reschedule_booking` is not supported. `bookings` has no direct write policy.
10. `booking_resources.capacity` is constrained to `1`; group capacity needs `booking_slots`, which
    does not exist yet. A resource with no availability rule is not bookable (fail closed).

## Writers

| Table | Application writer |
|-------|--------------------|
| `orders`, `order_financials`, `order_progress_notes` | `persistOrder`, `persistOrderStatus`, `persistTailorAssignment` |
| `measurements` | `persistMeasurement` |
| `appointments` | `persistAppointment` for authenticated requests; booking triggers synchronize protected confirmation/cancellation |
| `bookings` | `hold_slot`, `confirm_booking`, `cancel_booking`, `reschedule_booking` (RPCs; no direct client write) |
| `feedback` | `persistFeedback`, `persistFeedbackStatus` |
| `lookbook_items` | `persistLookbookItem` |
| `ateliers`, `members` | `createAtelierForCurrentUser` (two client inserts, not atomic), `persistAtelierSettings` |

The public fitting form is disabled in Supabase mode. A member can submit a pending fitting request;
the owner confirms it only by reserving a protected resource slot.

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

`npm run verify:db` applies the whole chain to an empty database and runs the 14-scenario
`supabase/tests/rls_isolation_test.sql`, the 15-scenario hosted E2E suite, the booking RPC suite
(B1–B23), and a 200-attempt / 50-concurrent exclusion proof from
`scripts/db/booking_concurrency_test.sh`. A contract change without a scenario is unproven.

`appointments` remains a request inbox without resource/overlap semantics. Anonymous writes are
disabled; client inserts are limited to own-tenant pending requests without staff assignment, and
only clients can use that insert policy. Migration guards require linked protected bookings for
confirmed/completed status.
