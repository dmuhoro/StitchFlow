# 2026-11-08 — Vercel pilot deployment readiness

## Command / Step

- `node -e "JSON.parse(require('node:fs').readFileSync('vercel.json', 'utf8'))"`
- `npm run lint`
- `npm run test:unit`
- `npm run build`
- `npm run test:e2e -- --grep "public entry renders"`
- `env STITCHFLOW_E2E_BASE_URL= STITCHFLOW_E2E_OWNER_EMAIL= STITCHFLOW_E2E_OWNER_PASSWORD= STITCHFLOW_E2E_EMPLOYEE_EMAIL= STITCHFLOW_E2E_EMPLOYEE_PASSWORD= STITCHFLOW_E2E_PATRON_EMAIL= STITCHFLOW_E2E_PATRON_PASSWORD= STITCHFLOW_E2E_BOOKING_RESOURCE_NAME= STITCHFLOW_E2E_BOOKING_DATE= STITCHFLOW_E2E_BOOKING_TIME= STITCHFLOW_E2E_EMAIL= STITCHFLOW_E2E_PASSWORD= STITCHFLOW_E2E_INVITE_CODE= npm run test:e2e`
- `npm run verify:db`
- `npm run check:docs`
- `VITE_DATA_MODE=demo npm run build`
- `VERCEL_ENV=production node scripts/ci/verify-build.mjs`
- `CI=1 supabase migration list --remote`
- `git diff --check`

## Observed Result

- Vercel config parses as JSON.
- TypeScript check passes.
- Unit suite passes: 1 test file, 3 tests.
- Static build and postbuild artifact check pass.
- Local public-entry smoke passes (1/1). Full local suite lists six tests; with hosted credentials
  and fixtures explicitly blanked, 1 passes and 5 are skipped. This is not a pass for hosted flows.
- Local database migration/RLS/booking verification exits 0, including the new financial audit
  migration, owner actor/before/after assertion, owner cross-tenant audit denial, and
  employee/patron financial-snapshot denial.
- Read-only remote migration listing exits 0: production latest is `20261107220000`; local
  `20261108173000` is absent remotely. Tracking issue
  [#5](https://github.com/dmuhoro/StitchFlow/issues/5) records the required owner review,
  application, and hosted verification.
- The Vercel production gate rejects the demo artifact as expected, reporting demo-only content.
- Documentation link check and whitespace check pass after this evidence record is added.
- No live owner booking was created, no production database dump/restore was performed, no
  successful-booking photo was captured, and no Vercel preview or production deployment was verified.

## Verdict

**Code-side Vercel deployment readiness: PASS. Supervised pilot opening: BLOCKED.** The new
financial-audit migration passed local verification but is absent from production; see issue #5.
The Vercel project, production environment variables, domain and Supabase Auth redirect allowlist
require owner action. No live owner booking, Vercel deployment, or live browser journey has been
observed. The disposable-project backup/restore rehearsal remains incomplete and must be completed
before accepting non-synthetic pilot data.
