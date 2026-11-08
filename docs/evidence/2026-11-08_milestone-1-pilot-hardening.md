# 2026-11-08 — Milestone 1 Pilot Hardening

## Summary

Local tenant-write hardening, source build, database/unit verification, hosted role journeys, and
protected booking confirmation pass. This does **not** certify the managed pilot: the live Netlify
artifact targets the retired Supabase project, publishing is blocked on credits, and no
backup/restore rehearsal has been performed.

## Write boundaries found

- `persistOrderStatus`: [repository lines 318–337](../../src/lib/atelier-repository.ts#L318)
  resolves `order_code` with `atelier_id`, then updates by row id and `atelier_id`.
- `persistTailorAssignment`: [repository lines 355–366](../../src/lib/atelier-repository.ts#L355)
  updates by `atelier_id` plus `order_code`.
- `persistFeedback`: [repository lines 409–422](../../src/lib/atelier-repository.ts#L409)
  resolves the order by `atelier_id` plus `order_code`, then inserts feedback with `atelier_id`.
- `persistFeedbackStatus`: [repository lines 425–437](../../src/lib/atelier-repository.ts#L425)
  updates by `atelier_id` plus feedback id.
- `revokeInvitation`: [repository lines 167–179](../../src/lib/atelier-repository.ts#L167)
  deletes by `atelier_id` plus invitation id.
- Other mutable repository boundaries: measurement upsert uses `(atelier_id, client_id)` at
  [line 373](../../src/lib/atelier-repository.ts#L373); appointment status uses `(atelier_id, id)`
  at [line 404](../../src/lib/atelier-repository.ts#L404); settings update uses the resolved
  atelier id at [line 464](../../src/lib/atelier-repository.ts#L464). Insert writers carry the
  resolved atelier.
- Context call sites reject an unresolved atelier before order status, assignment, or feedback status
  writes at [StitchFlowContext lines 820–824](../../src/context/StitchFlowContext.tsx#L820),
  [line 910](../../src/context/StitchFlowContext.tsx#L910), and
  [lines 1034–1042](../../src/context/StitchFlowContext.tsx#L1034).

The duplicate-order regression uses the same `order_code` in two tenants. Local
`npm run verify:db` passes `E2E-3a`; hosted SQL evidence is present in
`supabase/tests/hosted_rls_e2e.sql`, but that specific hosted SQL script was not run in this
verification. The separate hosted publishable-key role/RLS verifier passes 30/30.

## Commands and results

| Command | Result |
|---------|--------|
| `npm run test:unit` | PASS — 3 tests, including no repository call on missing atelier and tenant-scoped writes |
| `npm run verify:db` | PASS — RLS, hosted/local E2E SQL, booking/staff rules, duplicate human-key isolation, and 200-attempt concurrency |
| `npm run check:docs` | PASS — 138 relative Markdown links across 89 files |
| `npx tsc --ignoreConfig --noEmit --target ES2022 --module ESNext --moduleResolution Bundler --skipLibCheck --strict --types vite/client src/lib/atelier-repository.test.ts` | PASS — repository test and imports type-check independently |
| `npm run lint` | PASS — supported app scripts use the static pilot configuration; the unshipped root SSR config is not included in app type-check |
| `npm run build` | PASS — fresh static production build; `postbuild` production assertions passed |
| `set -a; . ./.env.local; set +a; npm run verify:build` | PASS — fresh artifact has one project ref matching the configured current/linked Supabase project and no forbidden demo markers |
| `npm run verify:pilot` | PASS — 30/30 hosted publishable-key/RLS checks, including after synthetic fitting confirmation |
| `npm run seed:pilot-fitting` | PASS — deterministic fitting fixture was linked to the patron and visible through patron RLS |
| `set -a; . ./.env.pilot; set +a; STITCHFLOW_E2E_BASE_URL=http://127.0.0.1:4174 npm run test:e2e -- --workers=1 e2e/role-access.spec.ts` | PASS — 3/3 owner, employee, patron journeys against fresh local artifact + hosted Supabase |
| `set -a; . ./.env.pilot; set +a; STITCHFLOW_E2E_BASE_URL=http://127.0.0.1:4174 npm run test:e2e -- --workers=1 e2e/booking-confirm.spec.ts` | PASS — 1/1 protected booking confirmation using the script-owned synthetic pilot fixture |

The live asset at `https://stitchflow-12pv.netlify.app` still embeds retired project
`vpathqzkaqdtbykumxeo`. The earlier live browser attempt failed at sign-in with `Failed to fetch`.
Netlify publishing currently returns `403 Account credit usage exceeded`. The fresh browser
journeys exercised the exact freshly built production SPA locally against the current hosted
Supabase project; they are not a claim that the live Netlify site has been repaired.

## Pilot operations and owner actions

- Hosted role identities exist across the supervised pilot atelier and an isolation-only tenant.
- The production fitting fixture is now protected-booking-confirmed by the browser journey; the full
  `seed:pilot.mjs` provisioner was not run in this work. Re-seeding the fixture resets its
  script-owned booking according to the provisioner.
- Restore Netlify deploy credits and confirm production Supabase environment settings; track in
  [issue #4](https://github.com/dmuhoro/StitchFlow/issues/4).
- Owner restores Netlify credits and publishes; then re-run the three role journeys against the live
  URL. Re-run booking confirmation only after resetting the synthetic fixture.
- Complete the disposable-project backup/restore rehearsal in
  [`../runbooks/pilot-operations.md`](../runbooks/pilot-operations.md). No credentials were provided
  to or written by this evidence record.

## Verdict

**BLOCKED** for opening the supervised pilot. Local build, repository/database checks, hosted RLS,
three role journeys, and protected booking confirmation pass. Live deployment and backup/restore
acceptance criteria remain incomplete.
