# Current State

> What is true today. Aspirational work is labelled **ASPIRATIONAL** and must not be assumed.

Last verified: 2026-11-05 (Sprint 0a — Verify and Decide). `v1.0.0` is tagged and deployed, but the
Sprint 0 audit found two P0 defects and did **not** certify it as production-ready for a real atelier.
Authoritative findings: [`audit/2026-11-05_sprint-0-audit.md`](audit/2026-11-05_sprint-0-audit.md).

## Shipped and usable

- **Presentation:** cultural lookbook, fitting request flow, director suite, artisan workbench,
  patron portal, order tracker, settings, system/light/dark themes.
- **Cultural domain:** Agbada wingspan, Fila cap circumference, Sokoto inseam, Buba chest, Kitenge
  alignment, Kanzu drape, posture notes, and ceremonial occasion are modelled in types, forms and
  seed data.
- **Demo mode:** a seeded browser-local experience behind `VITE_DATA_MODE=demo` (the default).
- **Backend foundation:** nine tenant tables with RLS on every table. The tracked migration chain
  replays from empty and the adversarial suite now proves **12 scenarios**.
- **Persistence:** order, measurement, appointment, feedback, lookbook and settings writes go through
  `src/lib/atelier-repository.ts` in Supabase mode; failures surface as explicit toasts.
- **Design briefs:** measurement card, production stepper, lookbook and booking briefs under `design/`.

## Verified on 2026-11-05

| Gate | Verdict |
|------|---------|
| Owner reads only their atelier | PASS |
| Employee cannot read another atelier | PASS |
| Patron reads only own records | PASS |
| Anonymous reads only published lookbook | PASS |
| Patron cannot update order/balance/measurement | PASS |
| Staff cannot change tenant IDs | PASS |
| Deactivated members lose access | PASS |
| Appointment capacity and double-booking | **FAIL** |

Evidence: [`evidence/2026-11-05_sprint-0-verification.md`](evidence/2026-11-05_sprint-0-verification.md).

## Not shipped — do not assume

- **ASPIRATIONAL** Server-side appointment capacity, resources, holds, or double-booking protection.
- **ASPIRATIONAL** Owner/employee appointment creation (current RLS has no staff `INSERT` policy).
- **ASPIRATIONAL** Server-resolved tenancy by domain, subdomain or slug; the client still chooses the
  public tenant.
- **ASPIRATIONAL** Payments, deposits, invoices, reconciliation, or an append-only ledger.
- **ASPIRATIONAL** Transactional email, SMS, or WhatsApp Business API delivery.
- **ASPIRATIONAL** Media storage with signed URLs; imagery is bundled or remote.
- **ASPIRATIONAL** Multi-atelier membership per user.
- **ASPIRATIONAL** Measurement version history and garment specification snapshots.
- **ASPIRATIONAL** Audit log, monitoring, alerting, and automated backups.
- **ASPIRATIONAL** Sign-up, owner onboarding and staff/client invitations end to end.
- **ASPIRATIONAL** SSR, per-tenant metadata, sitemap, robots, OG tags or structured data.
- **ASPIRATIONAL** End-to-end browser tests against a hosted project.

## Known limitations

| Limitation | Impact | Owner |
|------------|--------|-------|
| Demo identities, PIN `1234`, credential cards and demo slugs ship in a Supabase-mode bundle while `verify:build` passes | P0 false confidence; violates the zero-demo production claim | Engineering — Sprint 1 |
| Overlapping appointments are accepted; no exclusion constraint, resource, hold or idempotency key | P0 double-booking risk | Engineering — Sprint 3 |
| No owner/employee `INSERT` policy on `appointments` | Staff cannot book for a patron | Engineering — Sprint 3 |
| Tenant is chosen on the client; public path defaults to the Nairobi tenant | Any URL shows the default atelier; no slug/custom domain | Engineering — Sprint 2 |
| Order writes locate rows by `order_code` alone | Same code in two tenants can be ambiguous | Engineering — Sprint 1 |
| Owner onboarding is two non-transactional inserts; documented onboarding RPC is dropped | Orphan atelier on partial failure | Engineering — Sprint 1 |
| Money display converts every amount from KES at hardcoded rates | NGN/USD balances display wrong values | Engineering — Sprint 4 |
| No audit trail for orders, measurements, payments, settings or roles | Disputes cannot be investigated | Engineering — Sprint 1 |
| Anonymous booking has no rate limit or bot challenge | Spam/resource exhaustion | Engineering — Sprint 3 |
| No unit or browser test framework | Component, auth and booking regressions escape CI | Engineering — Sprint 1/3 |
| Hosted Supabase state and remote migration apply were not verified in this environment | Remote schema parity unproven | Repository owner |
| Netlify/DNS were not re-verified in this environment | Live URL and domain state not re-proven | Repository owner |

## Decisions awaiting approval

ADR-008 (TanStack Start SSR shell), ADR-009 (booking concurrency), ADR-010 (payments ledger) and
ADR-011 (tenant resolution) are **Proposed**. Sprint 1 may not start until ADR-008 and ADR-011 are
approved.

## How to tell what is real

- Code: `src/` and `supabase/migrations/`.
- Proof: `docs/evidence/` and `supabase/tests/`.
- Findings and priorities: [`audit/2026-11-05_sprint-0-audit.md`](audit/2026-11-05_sprint-0-audit.md).
- Gates: [`release-readiness.md`](release-readiness.md).
