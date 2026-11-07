# Current State

> What is true today. Aspirational work is labelled **ASPIRATIONAL** and must not be assumed.

Last verified: 2026-11-07 (Sprint 3 booking-engine database layer). Booking, frontend wiring,
payments, and SSR remain explicitly incomplete.
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
  proves **12 RLS scenarios**, **15 hosted/local E2E scenarios**, and the booking RLS/RPC suite.
- **Booking engine (database layer):** `bookings` carries a GiST exclusion constraint keyed by
  resource and time range; `hold_slot`, `confirm_booking`, `cancel_booking`, and
  `reschedule_booking` are the only write paths. Stale holds expire inside the transaction.
  Idempotency replay is stored in `idempotency_keys`. A 200-attempt / 50-concurrent proof asserts one
  winner and 199 `slot_unavailable` results.
- **Persistence:** order, measurement, appointment, feedback, lookbook and settings writes go through
  `src/lib/atelier-repository.ts` in Supabase mode; failures surface as explicit toasts.
- **Design briefs:** measurement card, production stepper, lookbook and booking briefs under `design/`.
- **Owner onboarding:** `create_atelier_with_owner` creates the atelier and active owner membership
  atomically; the legacy client-insert contract is retired.
- **Invitations:** email-bound employee/client invitation redemption is covered by the hosted SQL
  proof and a Playwright flow test.

## Verified on 2026-11-07

| Gate | Verdict |
|------|---------|
| Owner reads only their atelier | PASS |
| Employee cannot read another atelier | PASS |
| Patron reads only own records | PASS |
| Anonymous reads only published lookbook | PASS |
| Patron cannot update order/balance/measurement | PASS |
| Staff cannot change tenant IDs | PASS |
| Deactivated members lose access | PASS |
| Appointment capacity and double-booking (legacy `appointments`) | **FAIL** |
| Booking-store overlap exclusion and holds (new `bookings`) | **PENDING CI** — local `verify:db` PASS |
| Seamless feedback persistence | PASS |
| Lookbook item publication | PASS |
| Order creation with missing atelier guard | PASS |

Evidence: [`evidence/2026-11-07-booking-engine.md`](evidence/2026-11-07-booking-engine.md).

## Not shipped — do not assume

- **ASPIRATIONAL** Frontend/UI wiring of the booking engine; no browser path calls the new booking
  RPCs yet. This sprint shipped the database layer only.
- **ASPIRATIONAL** Guest booking via an edge function with per-IP/phone/tenant rate limits and a bot
  challenge (ADR-009 §8). Anonymous callers are explicitly denied execute on every booking RPC.
- **ASPIRATIONAL** Resource capacity greater than one and `booking_slots` for group workshops.
  `booking_resources.capacity` is constrained to `1` until that mechanism exists.
- **ASPIRATIONAL** A scheduled hold-expiry sweeper. Expiry runs inside hold/confirm/reschedule
  transactions; there is no cron/edge worker yet.
- **ASPIRATIONAL** Double-booking protection for the legacy `appointments` store. It is untouched and
  its anonymous pending-insert policy is retained; the new `bookings` store is the protected path.
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
- **ASPIRATIONAL** End-to-end browser tests against a hosted project.

## Known limitations

| Limitation | Impact | Owner |
|------------|--------|-------|
| Demo identities, PIN `1234`, credential cards and demo slugs ship in a Supabase-mode bundle while `verify:build` passes | P0 false confidence; violates the zero-demo production claim | Engineering — Sprint 1 |
| Legacy `appointments` still accepts overlapping rows and anonymous pending inserts; the new `bookings` store is protected | Two booking stores: a client on the legacy path can still double-book a tailor | Engineering — Sprint 3 (ADR-009 §8) |
| No owner/employee `INSERT` policy on `appointments`; staff booking uses `hold_slot` instead | Legacy staff-screen work cannot write `appointments` directly | Engineering — Sprint 3 |
| `booking_resources.capacity` is constrained to `1`; no `booking_slots` | Group workshops cannot be modelled yet | Engineering — Sprint 3 follow-up |
| No frontend calls `hold_slot`/`confirm_booking`/`cancel_booking`/`reschedule_booking` | The protected path exists but the UI still uses the legacy flow | Engineering — Sprint 3 follow-up |
| `idempotency_keys` retains the original hold token to make replay possible | A database reader could recover a live token for its short hold window; client roles are denied by RLS | Engineering — Security review |
| No scheduled expiry sweeper outside booking transactions | An abandoned hold can block a slot until the next hold/confirm/reschedule on that resource | Engineering — Operations |
| Tenant is chosen on the client; public path defaults to the Nairobi tenant | Any URL shows the default atelier; no slug/custom domain | Engineering — Sprint 2 |
| Order writes locate rows by `order_code` alone | Same code in two tenants can be ambiguous | Engineering — Sprint 1 |
| Hosted Playwright onboarding still requires configured invite credentials to run against the live app | Browser proof is opt-in and cannot run from a clean checkout without a fixture | Repository owner — Sprint 1 |
| Money display converts every amount from KES at hardcoded rates | NGN/USD balances display wrong values | Engineering — Sprint 4 |
| Audit coverage exists for orders, measurements, settings, roles, and bookings, but not payments | Payment disputes cannot be investigated | Engineering — Sprint 4 |
| Anonymous booking has no rate limit or bot challenge; booking RPCs are denied to `anon` | Spam/resource exhaustion on the legacy path | Engineering — Sprint 3 follow-up |
| Playwright invite flow is present but hosted credentials are not stored in the repository | Live browser proof requires a deliberate local/CI secret setup | Repository owner — Sprint 1 |
| Hosted Supabase state and remote migration apply were not verified in this environment | Remote schema parity unproven | Repository owner |
| Netlify/DNS were not re-verified in this environment | Live URL and domain state not re-proven | Repository owner |

## Decisions awaiting approval

ADR-008 and ADR-011 are approved directionally; ADR-009 and ADR-010 remain **Proposed**. Their
future SSR, booking, and payment implementation is not implied by the onboarding release.

## How to tell what is real

- Code: `src/` and `supabase/migrations/`.
- Proof: `docs/evidence/` and `supabase/tests/`.
- Findings and priorities: [`audit/2026-11-05_sprint-0-audit.md`](audit/2026-11-05_sprint-0-audit.md).
- Gates: [`release-readiness.md`](release-readiness.md).
