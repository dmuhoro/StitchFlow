# Release 1.0.1 — Sprint 0 audit (2026-11-05)

## Capabilities shipped

No new product capability. This patch records the Sprint 0 verification, adds adversarial RLS
coverage, proposes four architecture decisions, and removes unused dependencies.

## Verified

- `npm ci`, `npm run lint`, `npm run check:docs`, `npm run build`, `npm run verify:build`,
  `npm run verify:db` and `npm audit --audit-level=high` pass.
- RLS suite: 12/12 scenarios plus structural assertions; gates 1–7 PASS.
- Gate 8 FAIL: `exclusion_constraints=0`; two overlapping appointments accepted.
- Supabase-mode bundle contains demo markers although `verify:build` passes.

Evidence: [`../evidence/2026-11-05_sprint-0-verification.md`](../evidence/2026-11-05_sprint-0-verification.md).
Findings: [`../audit/2026-11-05_sprint-0-audit.md`](../audit/2026-11-05_sprint-0-audit.md).

## Decisions

ADR-008 through ADR-011 are **Proposed**. Sprint 1 is blocked until ADR-008 and ADR-011 are
approved.

## Known limits

- The release is demo-first. It is not certified for a live atelier.
- Demo code, PIN `1234` and demo identities remain in the production bundle (`S0-P0-01`).
- Double-booking is not prevented (`S0-P0-02`).
- Hosted Supabase parity, Netlify/DNS, payments and WhatsApp were not re-verified in this
  environment; they remain owner-blocked.

## Evidence

- `docs/evidence/2026-11-05_sprint-0-verification.md`
- `docs/audit/2026-11-05_sprint-0-audit.md`
- `sprints/sprint-00a-verify-and-decide.md`
