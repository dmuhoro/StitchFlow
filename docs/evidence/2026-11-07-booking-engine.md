# 2026-11-07 — Sprint 3 booking-engine database layer

**Branch:** `sprint-3/booking-engine-db` (branched from `main` at
`098328d91dcaeaebc52dd0d5775d75772d0dcb5e`)
**Environment:** Linux, Node `v22.22.1` (`.nvmrc` = `20`), Docker `29.1.3`, disposable
`postgres:16`.
**Purpose:** prove the new booking store prevents overlap under real concurrency, enforces tenant
isolation through RPCs, expires stale holds, and replays idempotent requests without duplicating a
booking.

## Scope

This layer adds the schema and RPCs only:

- `20261107120000_booking_engine.sql`: `btree_gist`, `booking_resources`,
  `resource_availability_rules`, `blackout_dates`, `bookings`, `idempotency_keys`, the
  `bookings_no_overlap` GiST exclusion constraint, four public RPCs, and two internal helpers.
- `supabase/tests/booking_engine_test.sql`: scenarios B1–B23.
- `scripts/db/booking_concurrency_test.sh`: 200 attempts / 50 concurrent.
- `scripts/verify-db.sh`: runs the booking suite and concurrency proof, then asserts 16 public
  tables all have RLS.

**Not in scope:** frontend wiring, any change to `appointments`, guest rate limiting, capacity
greater than one, and a scheduled expiry sweeper.

## Commands and observed results

### `npm run lint`

Exit `0`.

```
> stitchflow@1.1.0 lint
> tsc --noEmit
```

### `npm run verify:db`

Exit `0` (disposable `postgres:16` container).

```
NOTICE:  PASS [1] owner order isolation: own=3, leaked=0
...
NOTICE:  PASS [12] tenant-id mutation guards: blocked=3
==> supabase/tests/hosted_rls_e2e.sql
NOTICE:  PASS [E2E-1] owner onboarding is atomic and refuses a second atelier
...
NOTICE:  PASS [E2E-15] order tenant reassignment blocked
==> supabase/tests/booking_engine_test.sql
NOTICE:  PASS [B1] client hold: booking=..., status=held
NOTICE:  PASS [B2] no availability rule refuses the hold
NOTICE:  PASS [B3] blackout refuses the hold
NOTICE:  PASS [B4] cross-tenant hold refused
NOTICE:  PASS [B5] client role limits: another patron and guest both refused
NOTICE:  PASS [B7] staff hold for a tenant patron
NOTICE:  PASS [B8] anonymous RPC execute denied: 4 of 4
NOTICE:  PASS [B9] anonymous table perimeter closed
NOTICE:  PASS [B10] patron table scope and write denial
NOTICE:  PASS [B11] cross-tenant confirm/cancel/reschedule denied
NOTICE:  PASS [B12] owner staff scope, direct booking writes denied
NOTICE:  PASS [B13] confirm: wrong token refused, valid token confirmed, replay stable
NOTICE:  PASS [B16] cancel idempotent; cancelled range released
NOTICE:  PASS [B17] expired hold refused and swept inside the hold transaction
NOTICE:  PASS [B18] reschedule moves atomically and replays idempotently
NOTICE:  PASS [B19] reschedule conflict refused and original range preserved
NOTICE:  PASS [B20] hold idempotency replay and mismatch conflict
NOTICE:  PASS [B21] patron-to-patron cancel/reschedule denied
NOTICE:  PASS [B22] staff can cancel a tenant booking
NOTICE:  PASS [B23] exclusion constraint shape: EXCLUDE USING gist (resource_id WITH =, during WITH &&) WHERE ((status = ANY (ARRAY['held'::text, 'confirmed'::text])))
==> concurrency fixture (resource c0000001-0001-4001-8001-000000000001)
==> 200 attempts, 50 in flight
attempts=200 success=1 slot_unavailable=199 other=0
PASS [booking] concurrency: attempts=200 success=1 slot_unavailable=199 live_rows=1 duplicates=0
==> structural assertions
NOTICE:  RLS enabled on every public table; 16 public tables present.
==> database verification passed
```

### Catalog counts (same chain, separate disposable database)

```sql
select (select count(*) from pg_policies where schemaname='public') as policies,
       (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
         where n.nspname='public' and p.prosecdef and p.prorettype <> 'trigger'::regtype) as secdef_funcs,
       (select count(*) from pg_constraint where contype='x') as exclusion_constraints,
       (select count(*) from pg_tables where schemaname='public') as public_tables,
       (select count(*) from pg_tables where schemaname='public' and rowsecurity) as rls_tables;
```

```
 policies | secdef_funcs | exclusion_constraints | public_tables | rls_tables
----------+--------------+-----------------------+---------------+------------
       69 |           16 |                     1 |            16 |         16
```

The booking layer contributes 15 policies (across four tables; `idempotency_keys` has RLS enabled
with no policy) and six non-trigger `SECURITY DEFINER` functions (`hold_slot`, `confirm_booking`,
`cancel_booking`, `reschedule_booking`, `expire_stale_holds`, `booking_window_error`).

## Concurrency proof detail

`scripts/db/booking_concurrency_test.sh` launches 200 `psql` processes through `xargs -P 50`, each
calling `public.hold_slot` in its own transaction with `set local role authenticated` and a member
JWT for Tenant A. Observed:

| Measure | Expected | Observed |
|---------|----------|----------|
| Attempts | 200 | 200 |
| Successes | 1 | 1 |
| `slot_unavailable` | 199 | 199 |
| Other result kinds | 0 | 0 |
| Live rows for the slot | 1 | 1 |
| Total persisted rows for the fixture resource | 1 | 1 |

The GiST exclusion constraint is the authority; the per-resource advisory lock only serialises the
expiry sweep and gives a stable error.

## Honest notes

1. **ADR-009 was `Proposed` when this layer was implemented.** It remains Proposed. The
   implementation note in `docs/adr/ADR-009-booking-concurrency.md` records the shipped surface; it
   does not approve the ADR.
2. **Naming differs from the ADR.** The delivery brief names the hold RPC `hold_slot` and the
   conflict `slot_unavailable`; the ADR says `book_slot` and `SLOT_TAKEN`. The shipped names are
   `hold_slot` / `slot_unavailable`, documented in this evidence and `docs/db-contracts.md`.
3. **Legacy `appointments` is untouched.** `appointments_public_insert` is retained per ADR-009 §8
   scope. That table still accepts overlapping rows and anonymous pending inserts. Gate 8 remains
   open for it. The browser still uses that path, so "double-booking is prevented" is true only for
   the new `bookings` store.
4. **Dual booking stores.** `appointments` and `bookings` coexist. This is a transition risk, not a
   finished migration. ADR-009 §8 (backfill + retire) owns it.
5. **`idempotency_keys` retains the original hold token** so a lost hold response can be replayed;
   booking rows store only `hold_token_hash`. Client roles are denied by RLS because the ledger has
   no policy, but a database reader could recover a live token within its short hold window. This is
   a documented trade-off.
6. **Capacity is constrained to `1`.** Group capacity needs `booking_slots`, which is not built. The
   schema refuses to advertise capacity it cannot enforce.
7. **No memory storage of secrets.** No credential or token value is recorded in this file; the
   concurrency fixture uses seeded test identities.

## CI

The branch is pushed and a pull request is opened; the required GitHub Actions database job runs
`npm run verify:db:host` against `postgres:16`. This section is updated with the run URL and verdict
when the run completes.

**CI verdict:** PENDING at the time this file was committed.

## Verdict

**PASS (local database layer).** The new `bookings` store refuses overlap under 200 concurrent
attempts, enforces tenant isolation through RPCs, expires stale holds in-transaction, and replays
idempotent requests without creating a duplicate. CI confirmation is tracked above. Gate 8 remains
open for the legacy `appointments` table.
