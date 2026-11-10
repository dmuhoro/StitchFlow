# Current State

> What is true today. Aspirational work is labelled **ASPIRATIONAL** and must not be assumed.

Last verified: 2026-11-10 (hosted pilot deployment and read-only role journeys).
Production migration `20261108173000` was applied and reverified by
`CI=1 supabase migration list --remote` in
[`evidence/2026-11-08_pilot-release-execution.md`](evidence/2026-11-08_pilot-release-execution.md);
local and remote migration IDs match. Six hosted identities
exist across the supervised pilot and an isolation-only tenant.
The rollback-only hosted RLS proof and local database/RLS tests pass. The local hermetic harness
passes all six browser journeys twice against a disposable Supabase stack, proves nine negative
controls, and restores a local dump before running the RLS suite. The approved Vercel production
deployment is READY and its owner, employee, and patron read-only journeys pass 3/3. Hosted booking
is still blocked: the guarded fixture check did not find exactly one pending script-owned fitting,
so no booking was made or fixture reset. Live backup/restore remains blocked on network reachability:
the direct Supabase host is IPv6-only, so the operator must supply the Session pooler URI.
Payments and SSR are not implemented for this pilot.
Authoritative findings: [`audit/2026-11-05_sprint-0-audit.md`](audit/2026-11-05_sprint-0-audit.md).

## Shipped and usable

- **Presentation:** cultural lookbook, fitting request flow, director suite, artisan workbench,
  patron portal, order tracker, settings, system/light/dark themes.
- **Cultural domain:** Agbada wingspan, Fila cap circumference, Sokoto inseam, Buba chest, Kitenge
  alignment, Kanzu drape, posture notes, and ceremonial occasion are modelled in types, forms and
  seed data.
- **Demo mode:** a seeded browser-local experience behind `VITE_DATA_MODE=demo` (the default).
- **Backend foundation:** nine core tenant tables with RLS on every table, plus the Sprint 3 booking
  tables (`booking_resources`, `resource_availability_rules`, `blackout_dates`, `bookings`,
  `idempotency_keys`). The tracked migration chain replays from empty and the adversarial suite now
  proves **14 RLS scenarios**, **15 hosted/local E2E scenarios**, and the booking RLS/RPC suite.
- **Booking engine (database layer):** `bookings` carries a GiST exclusion constraint keyed by
  resource and time range; `hold_slot`, `confirm_booking`, `cancel_booking`, and
  `reschedule_booking` are the only write paths. Stale holds expire inside the transaction.
  Idempotency replay is stored in `idempotency_keys`. A 200-attempt / 50-concurrent proof asserts one
  winner and 199 `slot_unavailable` results.
- **Booking staff workflow (local proof passed):** the owner workspace creates a
  resource with weekly availability, chooses an available slot for a pending request, and uses the
  protected hold/confirm/cancel RPCs. Database triggers guard confirmation and synchronize request
  status. A client may insert only an own-tenant `pending` request with no assigned tailor, so the
  update-only status guard can no longer be bypassed by an insert. The live visitor request form is
  disabled until rate-limited guest booking exists.
- **Persistence:** order, measurement, appointment, feedback, lookbook and settings writes go through
  `src/lib/atelier-repository.ts` in Supabase mode. Repository writes fail closed without a resolved
  atelier; order and feedback status writes scope human keys by tenant. Failures surface as explicit
  toasts.
- **Design briefs:** measurement card, production stepper, lookbook and booking briefs under `design/`.
- **Owner onboarding:** `create_atelier_with_owner` creates the atelier and active owner membership
  atomically; the legacy client-insert contract is retired.
- **Invitations:** email-bound employee/client invitation redemption is covered by the hosted SQL
  proof and a Playwright flow test.

## Verified on 2026-11-10

| Gate | Verdict |
|------|---------|
| Hermetic owner, employee, patron, invitation, public-entry, and booking journeys | **PASS locally** — 6/6 twice using `npm run test:e2e:hermetic`; each run resets and re-seeds the disposable local stack |
| Demo artifact rejected in production context; owner journey fails against demo artifact | **PASS negative controls** — `npm run verify:controls`, 9/9 controls observed |
| Local backup → restore → RLS suite | **PASS locally** — real 1,000-byte truncated dump rejected (exit 1), full local dump restored and RLS suite passed (exit 0) |
| Approved hosted deployment | **PASS** — Vercel deployment `dpl_3psUv1F9c9Gq9FqKLx8bkdRXyp13` is READY; production alias returns HTTP 200 |
| Hosted owner, employee, and patron journeys | **PASS** — 3/3 read-only journeys against the approved deployment |
| Hosted booking confirmation | **BLOCKED** — guarded fixture check found no exactly-one pending script-owned fitting; no booking write or fixture reset occurred |
| Live backup/restore | **BLOCKED** — the direct Supabase host is IPv6-only and unreachable from this network; the operator must supply the Session pooler URI. The rehearsal reports this as a precondition (exit 2) |

## Verified on 2026-11-08

| Gate | Verdict |
|------|---------|
| Owner reads only their atelier | PASS |
| Employee cannot read another atelier | PASS |
| Patron reads only own records | PASS |
| Anonymous reads only published lookbook | PASS |
| Patron cannot update order/balance/measurement | PASS |
| Staff cannot change tenant IDs | PASS |
| Deactivated members lose access | PASS |
| Confirmed fitting requires a protected booking; status sync and anonymous insert denial | **PASS** — local `npm run verify:db` |
| Client cannot insert a confirmed or staff-assigned appointment | **PASS** — local `verify:db` (RLS 13–14, staff S7a–S7d) |
| Production deploy rejects a demo-mode artifact | **PASS** — `CONTEXT=production` negative check; `postbuild` gate |
| Production schema and migration history match the tracked chain | **PASS** — `CI=1 supabase migration list --remote` and `CI=1 supabase db push --dry-run --remote` confirmed current through `20261108173000` |
| Booking-store overlap exclusion and holds (new `bookings`) | **PASS** — local `verify:db` and CI run [42371377892](https://github.com/dmuhoro/StitchFlow/actions/runs/42371377892) |
| Seamless feedback persistence | PASS |
| Lookbook item publication | PASS |
| Order creation with missing atelier guard | PASS |
| Keyed order, feedback and invitation mutations require the resolved atelier | **PASS locally** — `npm run test:unit` and `npm run verify:db`; the hosted duplicate-code SQL fixture is present but was not run against hosted SQL in this verification. The separate hosted role/RLS proof passes 30/30. |
| Owner financial edits record actor/before/after, with financial snapshots hidden from staff and patrons | **PASS locally; migration applied remotely** — local `npm run verify:db`; hosted rollback-only proof passed |

Evidence: [`evidence/2026-11-07-booking-engine.md`](evidence/2026-11-07-booking-engine.md) and
[`evidence/2026-11-08_v1.4.0-rc.1.md`](evidence/2026-11-08_v1.4.0-rc.1.md).

## Not shipped — do not assume

- **BLOCKED / hosted booking confirmation** Owner booking flow is wired; local database booking
  tests pass. The current deployment passes the owner, employee, and patron role journeys, but its
  synthetic pending-fitting precondition is not satisfied. No booking was confirmed.
- **ASPIRATIONAL** Guest booking via an edge function with per-IP/phone/tenant rate limits and a bot
  challenge (ADR-009 §8). Anonymous callers are explicitly denied execute on every booking RPC.
- **ASPIRATIONAL** Resource capacity greater than one and `booking_slots` for group workshops.
  `booking_resources.capacity` is constrained to `1` until that mechanism exists.
- **ASPIRATIONAL** A scheduled hold-expiry sweeper. Expiry runs inside hold/confirm/reschedule
  transactions; there is no cron/edge worker yet.
- Legacy appointment requests remain pending proposals; local database proof confirms the status
  guard and direct anonymous insert denial. The production migrations are now applied.
- **ASPIRATIONAL** Owner/employee appointment creation on `appointments`; staff booking now belongs
  to the `hold_slot` RPC, not the legacy table.
- **ASPIRATIONAL** Server-resolved tenancy by domain, subdomain or slug; the client still chooses the
  public tenant.
- **ASPIRATIONAL** Payments, deposits, invoices, reconciliation, or an append-only ledger.
- **ASPIRATIONAL** Transactional email, SMS, or WhatsApp Business API delivery.
- **ASPIRATIONAL** Media storage with signed URLs; imagery is bundled or remote.
- **ASPIRATIONAL** Multi-atelier membership per user.
- **ASPIRATIONAL** Measurement version history and garment specification snapshots.
- **ASPIRATIONAL** Monitoring, alerting, and automated backups. The append-only `audit_log` exists
  for orders, measurements, settings, and roles; booking transitions are now appended too.
- **PARTIAL** Owner onboarding and invitation redemption are implemented; transactional delivery and
  unrestricted self-service sign-up are not.
- **Approved but not implemented** SSR, per-tenant metadata, sitemap, robots, OG tags or structured
  data (ADR-008). These are outside Milestone 1.
- **DONE / remote schema current** Financial audit migration `20261108173000` is applied; remote list
  and dry run are current. Trigger-specific assertions pass locally; hosted rollback-only RLS proof
  passed.

## Known limitations

| Limitation | Impact | Owner |
|------------|--------|-------|
| Guest self-booking lacks rate limits and a bot challenge | Direct anon inserts and the visitor form are disabled pending the edge boundary | Engineering — before opening public booking |
| Hosted booking confirmation has not passed | The guarded fitting fixture precondition is unmet; no live booking was created, while owner/employee/patron read-only journeys pass | Repository owner — authorize a narrowly scoped synthetic-fixture reset |
| No owner/employee `INSERT` policy on `appointments`; staff booking uses `hold_slot` instead | Legacy staff-screen work cannot write `appointments` directly | Accepted boundary; do not write legacy appointment rows |
| `booking_resources.capacity` is constrained to `1`; no `booking_slots` | Group workshops cannot be modelled yet | Engineering — Sprint 3 follow-up |
| `idempotency_keys` retains the original hold token to make replay possible | A database reader could recover a live token for its short hold window; client roles are denied by RLS | Engineering — Security review |
| No scheduled expiry sweeper outside booking transactions | An abandoned hold can block a slot until the next hold/confirm/reschedule on that resource | Engineering — Operations |
| Tenant is chosen on the client; public path defaults to the Nairobi tenant | Any URL shows the default atelier; no slug/custom domain | Engineering — Sprint 2 |
| Hosted Playwright onboarding still requires configured invite credentials to run against the live app | Browser proof is opt-in and cannot run from a clean checkout without a fixture | Repository owner — Sprint 1 |
| No payment ledger or provider reconciliation | Order deposits/balances are displayed as order terms, not payment receipts | Engineering — later payment sprint |
| Audit coverage exists for orders, measurements, settings, roles, and bookings, but not payments | Payment disputes cannot be investigated | Engineering — Sprint 4 |
| Guest booking has no rate limit or bot challenge | Direct anon inserts are disabled until the edge boundary exists | Engineering — before public booking |
| Playwright invite flow is present but hosted credentials are not stored in the repository | Live browser proof requires a deliberate local/CI secret setup | Repository owner — Sprint 1 |
| Production has six hosted identities across pilot and isolation-only tenants | Approved Vercel deployment and hosted owner/employee/patron role journeys pass; remote source-build parity remains unverified | Repository owner — align the Vercel Node.js version with `.nvmrc` and verify a source build |
| Vercel project uses Node.js 26.x while `.nvmrc` specifies Node.js 20 | The successful prebuilt deployment used Node.js 22.22.1; remote source-build parity is unverified | Repository owner — align Vercel Node.js with `.nvmrc` and verify a source build |
| Financial edit audit migration is applied remotely | Local trigger/RLS assertions pass; remote migration chain is current; hosted rollback-only proof passed | Engineering — retain as release evidence |

## Decisions awaiting approval

ADR-008, ADR-011, and ADR-012 are approved. ADR-008 SSR and ADR-011 tenant resolution are not
implemented in the current pilot. ADR-009 and ADR-010 remain **Proposed**; no guest booking or
payment implementation is implied by the supervised pilot.

## How to tell what is real

- Code: `src/` and `supabase/migrations/`.
- Proof: `docs/evidence/` and `supabase/tests/`.
- Findings and priorities: [`audit/2026-11-05_sprint-0-audit.md`](audit/2026-11-05_sprint-0-audit.md).
- Gates: [`release-readiness.md`](release-readiness.md).
