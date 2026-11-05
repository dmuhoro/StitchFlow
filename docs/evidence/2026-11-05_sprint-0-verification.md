# 2026-11-05 — Sprint 0 verification (eight gates)

## Command / Step

Run from the repository root on `main`.

```bash
npm ci
npm run lint
npm run check:docs
npm run build && npm run verify:build
VITE_SUPABASE_URL=https://example-project.supabase.co \
  VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_local_verification_only \
  VITE_DATA_MODE=supabase npm run build
VITE_DATA_MODE=supabase npm run verify:build
grep -o -E 'Demo PIN: 1234|Demo role gate|Authorized Credential Cards|Wanjiku Kamau|stitchflow-nairobi|asooke-lagos' dist/assets/*.js
npm run verify:db
npm audit --audit-level=high
```

Environment: Node `v22.22.1`, npm `11.12.1`, disposable `postgres:16` created by
`scripts/verify-db.sh`. Baseline commit `d06262a`. No hosted Supabase project, Netlify
deployment, DNS record, payment gateway or WhatsApp sender was contacted or verified.

## Observed Result

### 1. Install, types, docs, dependencies

| Command | Result |
|---------|--------|
| `npm ci` | exit `0` — 53 packages, 0 vulnerabilities |
| `npm run lint` | exit `0` — `tsc --noEmit` clean |
| `npm run check:docs` | exit `0` after this evidence file was written — 70 links / 70 files checked |
| `npm audit --audit-level=high` | exit `0` — `found 0 vulnerabilities` |

The first `check:docs` run failed on exactly one link: this file did not exist yet
(`docs/audit/2026-11-05_sprint-0-audit.md -> ../evidence/2026-11-05_sprint-0-verification.md`).
The link was not removed or relaxed; the evidence file was written and the check re-ran clean.

### 2. Demo-mode build and artifact assertions

```text
vite v8.3.5 building client environment for production...
✓ 1729 modules transformed.
dist/assets/index-Z04H1z4D.js    438.34 kB │ gzip: 118.03 kB
✓ built in 5.15s

PASS: 11 build files, 8 hashed image assets, no dev-only or placeholder artifacts.
```

### 3. Supabase-mode build, artifact assertions, and bundle leak

The production build succeeded and `verify:build` printed:

```text
PASS: 11 build files, 8 hashed image assets, no dev-only or placeholder artifacts.
```

The same artifact contains demo markers:

```text
      1 asooke-lagos
      1 Authorized Credential Cards
      1 Demo PIN: 1234
      2 Demo role gate
      1 stitchflow-nairobi
      3 Wanjiku Kamau
```

This is the `S0-P0-01` false-confidence defect: the artifact gate checks for the presence of
runtime guards, not the absence of demo code. It is recorded as **FAIL** for the production-
readiness claim even though `verify:build` exits `0`.

### 4. Database replay and RLS suite

`npm run verify:db` applied the full chain plus `supabase/seed.sql` to an empty disposable
`postgres:16` and exited `0`:

```text
PASS [1] owner order isolation: own=3, leaked=0
PASS [2] cross-tenant write isolation: rows mutated=0
PASS [3] artisan scope: assigned=3, otherOrders=0, otherMeasurements=0, financials=0, members=4
PASS [4] patron scope: measurements=1, orders=2, appointments=1, balances=2, clients=1, staff=2
PASS [5] public perimeter: published=3, drafts=0, orders=0, members=0, ateliers=2
PASS [6] anonymous booking: pending accepted, confirmed denied
PASS [7] cross-tenant order update: rows mutated=0
PASS [8] cross-tenant insert denied by WITH CHECK
PASS [9] patron self role escalation blocked
PASS [10] deactivated member access revoked: orders=0, measurements=0
PASS [11] patron write denial: orders=0, financials=0, measurements=0
PASS [12] tenant-id mutation guards: blocked=3
==> structural assertions
NOTICE:  RLS enabled on every public table; 9 tenant tables present.
==> database verification passed
```

Scenarios 11 and 12 are new adversarial cases added in this sprint; scenario 3 was expanded
to prove other-tenant measurement denial and scenario 4 to prove patron appointment scope.

### 5. Catalog inventory

Queried on the same disposable database after replay:

```text
 exclusion_constraints
-----------------------
                     0
(1 row)

 audit_tables
--------------
            0
(1 row)

 create_atelier_rpc
--------------------
                  0
(1 row)

 policy_count
--------------
           52
(1 row)

 tables_with_rls
-----------------
               9
(1 row)
```

`create_atelier_rpc=0` confirms `docs/db-contracts.md:174` documented a function that the chain
drops at `supabase/migrations/20261031111500_direct_uid_rls.sql:160` and never recreates.

### 6. Gate 8 — appointment capacity and double-booking

Two anonymous pending bookings for the same tailor at the same instant were both accepted:

```text
BEGIN
SET
SET
INSERT 0 2
COMMIT
 overlapping_rows_accepted
---------------------------
                         2
(1 row)
```

The same transaction space refuses an owner-created confirmed appointment:

```text
BEGIN
SET
SET
ERROR:  new row violates row-level security policy for table "appointments"
ROLLBACK
```

The policy catalog has no `INSERT` policy for `owner` or `employee` on `appointments`; the only
insert policies are `appointments_client_insert_own` and `appointments_public_insert`.

## Gate verdicts

| # | Gate | Verdict | Proof |
|---|------|---------|-------|
| 1 | Owner reads only their atelier | PASS | RLS scenario 1 + catalog policy review |
| 2 | Employee cannot read another atelier | PASS | RLS scenario 3 |
| 3 | Patron reads only own records | PASS | RLS scenario 4 |
| 4 | Anonymous reads only published lookbook | PASS | RLS scenario 5 |
| 5 | Patron cannot update order/balance/measurement | PASS | RLS scenario 11 |
| 6 | Staff cannot change tenant IDs | PASS | RLS scenario 12 |
| 7 | Deactivated members lose access | PASS | RLS scenario 10 |
| 8 | Appointment capacity and double-booking | **FAIL** | `exclusion_constraints=0`; two overlapping rows accepted |

Additional non-gate failure: owner/employee appointment creation is denied by RLS
(`S0-P1-03`), because no staff `INSERT` policy exists.

## Verdict

**7 PASS, 1 FAIL, 0 BLOCKED in the locally executable scope.** Gate 8 fails by design of the
current schema, not by a test defect. The production artifact also fails its intended
no-demo-code claim even though the artifact script exits `0`.

Not verified in this environment, and not claimed: hosted Supabase state, remote migration
apply, Netlify deployment or DNS, payment/WhatsApp credentials, legal review. Those remain
owner-blocked and are listed in `docs/audit/2026-11-05_sprint-0-audit.md` §9.
