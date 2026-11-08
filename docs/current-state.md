# Current State

> What is true today. Aspirational work is labelled **ASPIRATIONAL** and must not be assumed.

Last verified: 2026-11-08 (Sprint 3 booking workflow, insert boundary, deploy gate, and hosted schema
repair). Booking staff workflow is wired and locally verified; the production project now has the
full tracked schema and a matched migration history. Hosted browser role flows remain blocked
because production has no accounts yet. Payments and SSR remain explicitly incomplete.
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
  `src/lib/atelier-repository.ts` in Supabase mode; failures surface as explicit toasts.
- **Design briefs:** measurement card, production stepper, lookbook and booking briefs under `design/`.
- **Owner onboarding:** `create_atelier_with_owner` creates the atelier and active owner membership
  atomically; the legacy client-insert contract is retired.
- **Invitations:** email-bound employee/client invitation redemption is covered by the hosted SQL
  proof and a Playwright flow test.

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
| Production schema and migration history match the tracked chain | **PASS** — `supabase migration list --remote` matched; hosted proof passed |
| Booking-store overlap exclusion and holds (new `bookings`) | **PASS** — local `verify:db` and CI run [42371377892](https://github.com/dmuhoro/StitchFlow/actions/runs/42371377892) |
| Seamless feedback persistence | PASS |
| Lookbook item publication | PASS |
| Order creation with missing atelier guard | PASS |

Evidence: [`evidence/2026-11-07-booking-engine.md`](evidence/2026-11-07-booking-engine.md) and
[`evidence/2026-11-08_v1.4.0-rc.1.md`](evidence/2026-11-08_v1.4.0-rc.1.md).

## Not shipped — do not assume

- **IN PROGRESS / not verified** Hosted owner booking flow: availability, hold, confirm, cancel,
  appointment status synchronization, and resource setup are wired and locally verified. The
  production project now has the booking schema and a matched migration history
  (`v1.4.0-rc.2`); the hosted browser flow still needs owner-provisioned identities, and the live
  site cannot be updated until Netlify deploys are unblocked.
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
- **ASPIRATIONAL** Sign-up, owner onboarding and staff/client invitations end to end.
- **ASPIRATIONAL** SSR, per-tenant metadata, sitemap, robots, OG tags or structured data.
- **ASPIRATIONAL** Passing three-identity and booking-confirmation browser tests against the hosted
  project; fixtures require owner-provisioned accounts and a unique pending request/resource slot.
  Production currently has no accounts.

## Known limitations

| Limitation | Impact | Owner |
|------------|--------|-------|
| Guest self-booking lacks rate limits and a bot challenge | Direct anon inserts and the visitor form are disabled pending the edge boundary | Engineering — before opening public booking |
| Booking UI and appointment-status guard are wired; local proof passes and the hosted schema is applied, but the hosted browser flow is unverified | Do not use for live confirmations until hosted role E2E passes | Engineering + repository owner |
| No owner/employee `INSERT` policy on `appointments`; staff booking uses `hold_slot` instead | Legacy staff-screen work cannot write `appointments` directly | Engineering — Sprint 3 |
| `booking_resources.capacity` is constrained to `1`; no `booking_slots` | Group workshops cannot be modelled yet | Engineering — Sprint 3 follow-up |
| Hosted frontend booking flow has not been run against production | Local UI calls protected booking RPCs and the hosted database now has them; the flow still needs a provisioned owner and a live slot | Repository owner — provision pilot identities |
| `idempotency_keys` retains the original hold token to make replay possible | A database reader could recover a live token for its short hold window; client roles are denied by RLS | Engineering — Security review |
| No scheduled expiry sweeper outside booking transactions | An abandoned hold can block a slot until the next hold/confirm/reschedule on that resource | Engineering — Operations |
| Tenant is chosen on the client; public path defaults to the Nairobi tenant | Any URL shows the default atelier; no slug/custom domain | Engineering — Sprint 2 |
| Order writes locate rows by `order_code` alone | Same code in two tenants can be ambiguous | Engineering — Sprint 1 |
| Hosted Playwright onboarding still requires configured invite credentials to run against the live app | Browser proof is opt-in and cannot run from a clean checkout without a fixture | Repository owner — Sprint 1 |
| No payment ledger or provider reconciliation | Order deposits/balances are displayed as order terms, not payment receipts | Engineering — later payment sprint |
| Audit coverage exists for orders, measurements, settings, roles, and bookings, but not payments | Payment disputes cannot be investigated | Engineering — Sprint 4 |
| Guest booking has no rate limit or bot challenge | Direct anon inserts are disabled until the edge boundary exists | Engineering — before public booking |
| Playwright invite flow is present but hosted credentials are not stored in the repository | Live browser proof requires a deliberate local/CI secret setup | Repository owner — Sprint 1 |
| Production has no accounts yet (0 auth users, 0 ateliers/members) | Hosted owner/employee/patron browser journeys cannot run until the owner provisions identities or seeds pilot tenants | Repository owner |
| Netlify refuses new deploys: `403 Account credit usage exceeded` | The live site still serves a bundle that embeds the retired project `vpathqzkaqdtbykumxeo`; the corrected, gate-passing artifact is ready in `dist/` | Repository owner — restore Netlify credits and publish |

## Decisions awaiting approval

ADR-008 and ADR-011 are approved directionally; ADR-009 and ADR-010 remain **Proposed**. Their
future SSR, booking, and payment implementation is not implied by the onboarding release.

## How to tell what is real

- Code: `src/` and `supabase/migrations/`.
- Proof: `docs/evidence/` and `supabase/tests/`.
- Findings and priorities: [`audit/2026-11-05_sprint-0-audit.md`](audit/2026-11-05_sprint-0-audit.md).
- Gates: [`release-readiness.md`](release-readiness.md).
