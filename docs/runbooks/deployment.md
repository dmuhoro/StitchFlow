# Runbook: Deployment

> Deploy StitchFlow to Netlify with a Supabase backend.

## Human-owned prerequisites

The repository owner must still own these:

1. **Supabase account and identity provisioning.** The project ref is reachable through the CLI's
   Management API session, which is how the 2026-11-08 schema repair was executed. Pilot identities
   and fixtures now exist; changing identities, choosing tenant data, and rotating credentials
   remain owner decisions.
2. **Netlify authorization.** The Netlify CLI is authenticated for this workstation; production
   deploy approval and any custom-domain/DNS change remain with the owner. Never paste a token into
   chat or a committed file.

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

## 2. Set Netlify environment

In the Netlify project settings, set:

| Variable | Value |
|----------|-------|
| `VITE_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | the publishable (anon) key |
| `VITE_DATA_MODE` | `supabase` |
| `NODE_VERSION` | `20` (already in `netlify.toml`) |

Never set a service-role key here. It would ship to the browser.

## 3. Build and verify locally

```bash
npm ci
VITE_SUPABASE_URL=... VITE_SUPABASE_PUBLISHABLE_KEY=... VITE_DATA_MODE=supabase npm run build
CONTEXT=production node scripts/ci/verify-build.mjs
```

`verify:build` runs as `postbuild` and asserts the bundle contains no `/src/assets/` literal, no
placeholder Supabase host, no service-role marker, and no demo identity or PIN. A
`CONTEXT=production` invocation additionally requires `VITE_DATA_MODE=supabase` and configured,
non-placeholder Supabase values, so a demo artifact or a stale mode fails closed.

## 4. Restore Netlify deploy credits (owner action)

The production site currently rejects publishes with `403 Account credit usage exceeded`. Restore
the account's deploy capacity before trying to publish:

1. Sign in to the Netlify account that owns `stitchflow-12pv`.
2. Open **Team overview → Billing → Usage** (or the billing page available to the account owner)
   and confirm the account is over its deploy-credit limit.
3. Restore credits by completing the account's approved billing action: add the required credits,
   update the payment method, or move to an approved plan. Do not send billing details or access
   tokens to engineering.
4. Return to the site's **Deploys** page and confirm the account can create a deploy. A successful
   billing change alone is not evidence that the site can publish; the deploy must succeed.
5. Before publishing, verify the production environment variables in **Site configuration →
   Environment variables**: `VITE_DATA_MODE=supabase`, `VITE_SUPABASE_URL` for the active project,
   and its publishable key. Never configure a service-role key in the browser build.

Track the owner action in [issue #4](https://github.com/dmuhoro/StitchFlow/issues/4).

## 5. Deploy

```bash
npx netlify-cli deploy --prod --dir=dist --site=<site-id>
```

or push to `main` if the site is connected to the repository. Record the deploy in
[`../evidence/2026-11-01_deployment.md`](../evidence/2026-11-01_deployment.md).

If the API returns `403 Account credit usage exceeded`, no deploy was created: the live site keeps
serving its previous bundle. Restore credits (owner billing action) before retrying; do not record a
successful deploy.

## 6. Verify the live site

- The asset in `dist/index.html` is the asset the live URL serves.
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
STITCHFLOW_E2E_BASE_URL=https://stitchflow-12pv.netlify.app npm run test:e2e
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
fresh local production artifact connected to hosted Supabase. The production site
(`https://stitchflow-12pv.netlify.app`) still serves a bundle embedding the retired project
`vpathqzkaqdtbykumxeo`, and Netlify returns `403 Account credit usage exceeded`; owner billing and a
successful publish are **BLOCKED**. The supported static SPA source now builds and passes lint using
`vite.pilot.config.ts`; the root `vite.config.ts` SSR experiment is not used by application scripts.
The live-site role and booking-confirmation journeys still need a successful publish. Details:
[`../evidence/2026-11-08_milestone-1-pilot-hardening.md`](../evidence/2026-11-08_milestone-1-pilot-hardening.md)
and [issue #4](https://github.com/dmuhoro/StitchFlow/issues/4).
