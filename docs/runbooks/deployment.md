# Runbook: Deployment

> Deploy StitchFlow to Netlify with a Supabase backend.

## Human-owned prerequisites

The agent cannot complete these alone. They require the repository owner:

1. **Supabase project access.** The project ref used by this repository must be reachable from the
   owner's Supabase account. If it is not, create or re-authorize a project and update the values
   server-side.
2. **Netlify authorization.** Grant the Netlify CLI access to the StitchFlow site, or deploy from the
   Netlify dashboard connected to `main`. Never paste a token into chat.

## 1. Apply the schema

```bash
supabase link --project-ref <project-ref>
supabase db push
```

The chain is forward-only and idempotent. `supabase/seed.sql` is for local/pilot data only; do not
run it against a live atelier unless you intend to create the two pilot tenants.

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
npm run verify:build
```

`verify:build` asserts the bundle contains no `/src/assets/` literal, no placeholder Supabase host,
and no demo PIN.

## 4. Deploy

```bash
npx netlify-cli deploy --prod --dir=dist --site=<site-id>
```

or push to `main` if the site is connected to the repository. Record the deploy in
[`../evidence/2026-11-01_deployment.md`](../evidence/2026-11-01_deployment.md).

## 5. Verify the live site

- The app loads with no console error about missing Supabase configuration.
- Sign-in works with a real member.
- The lookbook renders bundled imagery (hashed asset URLs).
- A patron sees only their own orders and balance.
- An anonymous visitor can submit a pending fitting request.
- The demo PIN is not accepted.

## Rollback

See [`rollback.md`](rollback.md).

## Status

As of 2026-11-01 the build and database verification pass locally. Deployment is **BLOCKED** pending
owner authorization for Netlify and Supabase project access. This is recorded honestly in
[`release-readiness.md`](../release-readiness.md).
