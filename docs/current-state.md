# Current State

> What is true today. Aspirational work is labelled **ASPIRATIONAL** and must not be assumed.

Last verified: 2026-11-01. Sprint 01 (v1.0.0) is in progress; open gates are tracked in
[`release-readiness.md`](release-readiness.md).

## Shipped and usable

- **Presentation:** cultural lookbook, fitting request flow, director suite, artisan workbench,
  patron portal, order tracker, settings, system/light/dark themes.
- **Cultural domain:** Agbada wingspan, Fila cap circumference, Sokoto inseam, Buba chest, Kitenge
  alignment, Kanzu drape, posture notes, and ceremonial occasion are modelled in types, forms and
  seed data.
- **Demo mode:** a seeded browser-local experience behind `VITE_DATA_MODE=demo` (the default).
- **Backend foundation:** tenant tables and RLS exist in the migration chain, with an adversarial SQL
  suite checked into `supabase/tests/`.
- **Design briefs:** measurement card, production stepper, lookbook and booking briefs under `design/`.

## In progress — sprint 01

These are being completed in the current release and are not yet signed off:

| Item | Gate |
|------|------|
| Migration chain replays from an empty database | L1 |
| RLS suite green | L2 |
| Bundled local imagery | L3 |
| Persistence wired for supported actions | L4 |
| CI workflow | L5 |
| Version and tag | L6 |
| Cleanup | L7 |
| Documentation final | L8 |

## Not shipped — do not assume

- **ASPIRATIONAL** Payments, deposits, invoices, reconciliation.
- **ASPIRATIONAL** Server-side appointment capacity or double-booking protection.
- **ASPIRATIONAL** Transactional email, SMS, or WhatsApp Business API delivery.
- **ASPIRATIONAL** Media storage with signed URLs; imagery is bundled or remote.
- **ASPIRATIONAL** Multi-atelier membership per user.
- **ASPIRATIONAL** Measurement version history and garment specification snapshots.
- **ASPIRATIONAL** Audit log, monitoring, alerting, and automated backups.
- **ASPIRATIONAL** End-to-end browser test with three real identities against a hosted project.

## Known limitations

| Limitation | Impact | Owner |
|------------|--------|-------|
| No hosted Supabase project access verified in this environment | Remote migration unproven | Repository owner |
| Netlify deploy not authorized in this environment | Live URL unverified | Repository owner |
| Demo PIN remains in demo builds | Acceptable only in demo mode | Engineering |
| Anonymous booking is rate-limit-free | Abuse risk; post-launch | Engineering |
| `express` dependency unused | Bundle hygiene only; not shipped | Engineering |
| Order status `delivered` exists in the legacy check but not in the client stage type | Historical rows may carry it | Engineering |

## How to tell what is real

- Code: `src/` and `supabase/migrations/`.
- Proof: `docs/evidence/` and `supabase/tests/`.
- Gates: [`release-readiness.md`](release-readiness.md).
