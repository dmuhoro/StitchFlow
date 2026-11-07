# ADR-009 — Booking concurrency: database exclusion constraints plus expiring holds

**Status:** Proposed — awaiting owner approval
**Date:** 2026-11-05

> **Implementation note (2026-11-07).** The database layer described below has been implemented on
> `sprint-3/booking-engine-db` in `supabase/migrations/20261107120000_booking_engine.sql`, with
> proof in `supabase/tests/booking_engine_test.sql` and
> `scripts/db/booking_concurrency_test.sh`. This note records what shipped; it does **not** approve
> this ADR, which remains **Proposed** pending owner sign-off. Deliberate differences from the text
> below:
>
> - The delivery brief names the hold RPC `hold_slot` and the conflict token `slot_unavailable`,
>   where this ADR says `book_slot` and `SLOT_TAKEN`. The shipped names win until the ADR is
>   ratified.
> - `capacity > 1` and `booking_slots` (§3) are **not** implemented. `booking_resources.capacity`
>   is constrained to `1` so the schema cannot advertise capacity it does not enforce.
> - A scheduled expiry sweeper (§6) is **not** implemented. Expiry runs inside the hold, confirm,
>   and reschedule transactions.
> - The guest edge-function boundary and retirement of `appointments_public_insert` (§8) are **not**
>   implemented. Anonymous callers are denied execute on every booking RPC, and the legacy
>   `appointments` table is untouched. It remains a second, unguarded booking store.
> - Reschedule (§7) moves the existing row atomically; it does not create a replacement hold.
>
> Frontend wiring, guest booking, capacity, the sweeper, and the legacy-store migration remain open.

## Context

`appointments` currently accepts any number of rows at the same `slot_datetime`. There is no
resource model, no duration, no working-hours rule, no blackout date, no hold, and no idempotency
key. Verification gate 8 in `supabase/README.md` fails: two overlapping pending requests are
accepted for the same atelier and tailor. Client-side checks cannot fix this; two browsers race
between the check and the insert.

The atelier sells time from named resources: a master cutter, a fitter, a fitting room, and
occasionally a group workshop. Double-booking a cutter destroys trust and wastes fabric. The
database must make an overlap impossible, not merely unlikely.

## Decision

1. **Resources are first-class.** Add `booking_resources` with `atelier_id`, `kind`
   (`cutter`, `fitter`, `fitting_room`, `workshop`), display name, `capacity` (default 1), timezone,
   and active flag. A resource belongs to exactly one tenant.
2. **One reservation table, time ranges, no overlap.** Add `bookings` with:
   - `atelier_id`, `resource_id`, `during tstzrange NOT NULL`,
   - `status` in `held`, `confirmed`, `cancelled`, `expired`,
   - `client_id` (nullable for a guest), guest name/phone/email snapshots,
   - `service_type`, `cultural_occasion`, notes,
   - `idempotency_key`, `hold_token_hash`, `expires_at`,
   - `created_at`, `updated_at`.

   Exclusive resources (`capacity = 1`) carry a GiST exclusion constraint:

   ```sql
   alter table public.bookings
     add constraint bookings_no_overlap
     exclude using gist (
       resource_id with =,
       during with &&
     ) where (status in ('held', 'confirmed'));
   ```

   `btree_gist` is required. The constraint is the final authority: no RPC, edge function, staff
   screen, or future client can insert an overlapping live booking.
3. **Capacity greater than one.** A group workshop may admit more than one booking in a range. Those
   resources use explicit `booking_slots` rows with `capacity` and `booked_count`; admission is an
   atomic `update ... set booked_count = booked_count + 1 where booked_count < capacity returning`.
   Exclusive resources keep the exclusion constraint. A resource never uses both mechanisms for the
   same range.
4. **Hold, then confirm.** `book_slot(...)` is a Postgres function that:
   1. validates tenant, resource, service, working hours, blackout dates, and lead time;
   2. takes a transaction-scoped advisory lock keyed by `resource_id`;
   3. expires stale holds for that resource;
   4. returns the existing booking when `(atelier_id, idempotency_key)` already exists;
   5. inserts a `held` row with a random token (only its hash is stored) and a short expiry
      (default 10 minutes);
   6. returns `{ booking_id, hold_token, expires_at }`.

   An overlap raises SQLSTATE `23P01`; the function maps it to a typed `SLOT_TAKEN` error. The
   exclusion constraint is still the authority if the advisory lock is ever removed.
5. **Confirmation.** `confirm_booking(hold_token)` updates `held` to `confirmed` only when
   `expires_at > now()`, in one transaction. Replaying the same token returns the same booking. An
   expired hold cannot be confirmed and must be re-booked.
6. **Expiry.** A scheduled job (pg_cron or the edge runtime) marks expired holds as `expired` at
   least once per minute. `book_slot` also expires stale holds for the target resource before
   inserting, so a dead hold never blocks a live customer indefinitely.
7. **Reschedule and cancel.** Reschedule creates a replacement hold and updates the confirmed row in
   one transaction; the old range is released only when the new hold succeeds. Cancel moves the row
   to `cancelled`, which removes it from the exclusion predicate. Every transition is audited.
8. **Guest booking boundary.** Anonymous clients no longer insert into a booking table directly.
   The current `appointments_public_insert` policy is retired. Guests call an edge function that:
   - applies per-IP, per-phone, and per-tenant rate limits;
   - verifies a bot challenge (Turnstile or equivalent);
   - normalises and validates the phone number;
   - calls `book_slot` with the publishable/anon role or a server-side service role that is never
     sent to the browser.

   The function returns a typed rejection with a reason; no silent drop.
9. **Working hours and blackouts.** `resource_availability_rules` stores weekday windows in the
   tenant timezone. `blackout_dates` stores closed ranges. The RPC validates both; the UI is a
   convenience, not the guard.
10. **Concurrency proof.** A database test launches at least 200 parallel attempts against one
    exclusive slot. Exactly one hold or confirmed booking may exist; every other attempt receives
    `SLOT_TAKEN`. CI runs this as a required gate before Sprint 3 closes.

## Consequences

- Gate 8 closes only when the migration, the RPC, the exclusion constraint, and the 200-parallel
  test all exist and pass.
- `appointments` becomes a compatibility view or is migrated into `bookings`; the client repository
  must move to the RPC. This is a forward-only migration with a backfill of existing rows.
- Guest booking needs an edge runtime, rate-limit storage, and a bot challenge. These are server
  costs, not client code.
- Expired holds consume a row until the sweeper runs; the sweeper is operational work with an alert
  if it stops.
- Staff screens must show holds distinctly from confirmed work so a cutter is not sent to a
  customer who never confirmed.

## Alternatives considered

- **Check-then-insert in the client or a server function.** Rejected: the race is the defect.
- **Advisory locks only.** Rejected: a forgotten unlock or a new writer bypasses them. The exclusion
  constraint is durable and declarative.
- **Serializable transactions with retry.** Correct but operationally expensive and easy to
  misconfigure; exclusion constraints express the invariant directly.
- **A unique row per fixed 30-minute slot.** Rejected: it cannot model variable durations, buffers,
  or cultural fitting sessions that run long.
- **One booking per resource with no holds.** Rejected: payment and confirmation take time; without
  holds, two customers can pay for the same slot.

## Sprint 1 boundary

Owner onboarding and invitation acceptance do not create appointment rows and therefore do not
change the booking invariant in this ADR. The current invite proof is
[`supabase/tests/hosted_rls_e2e.sql`](../../supabase/tests/hosted_rls_e2e.sql); booking concurrency
remains a Sprint 3 deliverable and is not claimed complete by the onboarding release.
