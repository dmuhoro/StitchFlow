# Runbook: Vercel Deployment

> Deploy the supervised static SPA to Vercel with a Supabase backend.

## Human-owned prerequisites

The repository owner must still own these:

1. **Supabase account and identity provisioning.** The project ref is reachable through the CLI's
   Management API session, which is how the 2026-11-08 schema repair was executed. Pilot identities
   and fixtures now exist; changing identities, choosing tenant data, and rotating credentials
   remain owner decisions.
2. **Vercel project and domain.** The repository owner links the Git repository to the Vercel
   project, selects the production domain, and authorizes production publishing. Never paste an
   access token into chat or a committed file.

## 1. Apply the schema

First prove the remote history matches this repository. A remote version with no local file is a
stop sign, not a reason to mark it reverted:

```bash
supabase migration list --remote
supabase db push --dry-run --remote
```

If the remote has an extra version, identify what it applied and compare it with the nearest local
migration (live function body, grants, and objects). Only when they are equivalent, record the
remote row under the canonical local version. Do not delete an applied migration blindly:

```sql
-- after the comparison above
update supabase_migrations.schema_migrations
set version = '<canonical-local-version>'
where version = '<remote-only-version>'
returning version, name, cardinality(statements);
```

Then apply:

```bash
supabase db push --dry-run --remote
supabase db push --remote --yes
supabase migration list --remote   # local and remote must match
```

The chain is forward-only and idempotent. `supabase/seed.sql` is for local/pilot data only; do not
run it against a live atelier unless you intend to create the pilot tenants and their auth users.

Reconciliation performed on 2026-11-08: remote `20261106122030` (`atomic_owner_onboarding`) was
proven equivalent to local `20261106160000_atomic_owner_onboarding.sql` and recorded under the local
version; the seven pending migrations were then applied. Evidence:
[`../evidence/2026-11-08_v1.4.0-rc.2-hosted-repair.md`](../evidence/2026-11-08_v1.4.0-rc.2-hosted-repair.md).
Since that reconciliation, `20261108173000_audit_order_financials.sql` was added. It is not yet
applied remotely. Review it, apply it using the forward-only procedure above, and verify the hosted
RLS/audit boundary before pilot use.

## 2. Configure Vercel

In Vercel Project Settings → Environment Variables, configure:

| Environment | Variables |
|-------------|-----------|
| Production | `VITE_DATA_MODE=supabase`, `VITE_SUPABASE_URL=https://<project-ref>.supabase.co`, and `VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-key>` |
| Preview and Development | `VITE_DATA_MODE=demo` |

Never set a service-role key; Vite variables are included in browser assets. Use Node.js 20 as
declared by `.nvmrc`. In Supabase Auth, allowlist the final production and preview callback URLs
that are actually used; do not guess the final domain.

`vercel.json` declares `npm ci`, `npm run build`, `dist`, the SPA rewrite, and security/cache
headers. Production builds receive `VERCEL_ENV=production`; the postbuild artifact gate rejects a
demo build, missing/placeholder Supabase settings, the retired project, and artifact/environment
project drift.

## 3. Build and verify locally

```bash
npm ci
VERCEL_ENV=production VITE_SUPABASE_URL=... VITE_SUPABASE_PUBLISHABLE_KEY=... VITE_DATA_MODE=supabase npm run build
VERCEL_ENV=production npm run verify:build
```

`verify:build` runs as `postbuild` and asserts the bundle contains no `/src/assets/` literal, no
placeholder Supabase host, no service-role marker, and no demo identity or PIN. A
`VERCEL_ENV=production` build additionally requires `VITE_DATA_MODE=supabase` and configured,
non-placeholder Supabase values, so a demo artifact or a stale mode fails closed.

## 4. Link and configure the Vercel project (owner action)

The Vercel project, domains, and environment variables are owner-controlled. Before publishing:

1. Import this repository into the owner's Vercel account and confirm `vercel.json` is detected.
2. Set the Production and Preview variables exactly as described above; do not expose secrets in
   build logs or evidence.
3. Assign the approved production domain and configure its URL in Supabase Auth redirect allowlists.
4. Confirm the project's production branch and repository connection with the owner.

Do not treat project creation or a successful preview as evidence that production is deployed.

## 5. Deploy

```bash
npx vercel --prod
```

Or publish the production deployment through the connected Vercel Git integration. Record the
deployment ID, URL, and verification results in a new dated evidence file. Do not put credentials,
private customer data, or sensitive environment values in the evidence.

If the production build fails the artifact gate, do not bypass or weaken it. Correct the Vercel
environment and rebuild.

## 6. Verify the live site

- The production deployment serves the expected asset from `dist/index.html`.
- The live bundle embeds the same project ref as `VITE_SUPABASE_URL` and
  `supabase/.temp/project-ref`.
- The app loads with no console error about missing Supabase configuration.
- Sign-in works with a real member.
- The lookbook renders bundled imagery (hashed asset URLs).
- A patron sees only their own orders and balance.
- Anonymous fitting submission is disabled until the rate-limited guest edge boundary is deployed.
- The demo PIN is not accepted.

Run the hosted database proof when the schema changes:

```bash
STITCHFLOW_ALLOW_HOSTED_VERIFY=1 npm run verify:hosted
```

It runs the self-contained proof inside `BEGIN … ROLLBACK` and compares pre/post row counts. The
hosted browser journeys need provisioned identities:

```bash
STITCHFLOW_E2E_BASE_URL=https://<production-domain> npm run test:e2e
```

Set `STITCHFLOW_E2E_OWNER_EMAIL`/`_PASSWORD`, `STITCHFLOW_E2E_EMPLOYEE_EMAIL`/`_PASSWORD`, and
`STITCHFLOW_E2E_PATRON_EMAIL`/`_PASSWORD` in the shell or CI secret store. Do not put their values
in a command transcript, evidence file, issue, or repository file.

## Rollback

See [`rollback.md`](rollback.md).

## Status

As of 2026-11-08 the production schema is reconciled and up to date. Six hosted identities exist
across the supervised pilot atelier and an isolation-only second tenant; the pilot fitting fixture
is seeded. The hosted RLS proof passes 30/30, and owner/employee/patron journeys pass against the
fresh local production artifact connected to hosted Supabase. Vercel has been selected, and
`vercel.json` plus the Vercel production artifact gate are in source, but owner project setup,
environment configuration, publication, and live-site role/booking journeys remain **BLOCKED /
NOT VERIFIED**. The former Netlify site still serves a bundle embedding the retired project
`vpathqzkaqdtbykumxeo`. The supported static SPA source builds with `vite.pilot.config.ts`; no
TanStack Start entry is required for Vercel preview or deployment. Details:
[`../evidence/2026-11-08_milestone-1-pilot-hardening.md`](../evidence/2026-11-08_milestone-1-pilot-hardening.md)
and [release gates](../release-readiness.md).
