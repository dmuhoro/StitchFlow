# Sprint 00b — Phase 0 publication guards

**Status:** DONE (branch `fix/secret-guard`; the owner merges and tags)
**Date:** 2026-11-14
**Plan item:** owner-preview Phase 0.5
**Version:** none — this is an untagged checkpoint, not a release

## Planned

Make the build itself refuse to publish a credential, at every boundary where
publication can happen, and prove each refusal by observing it:

1. Both Vite configs refuse a credential-shaped public-prefixed variable name.
2. `verify-build` re-checks the names and scans client **and** server artifacts for
   `sbp_` keys, database URIs with embedded passwords, and `service_role` JWTs.
3. Negative controls prove each check can fail.

## Shipped

| Boundary | File | What it refuses |
|----------|------|-----------------|
| Config time (supported build) | `vite.pilot.config.ts` → `scripts/ci/env-guard.mjs` | a credential-shaped `VITE_`/`NEXT_PUBLIC_`/`REACT_APP_` name, before an artifact exists |
| Config time (root config) | `vite.config.ts` → `scripts/ci/env-guard.mjs` | the same names, so a second config is not a bypass |
| Deploy time — names | `scripts/ci/verify-build.mjs` | the same names, re-checked independently of either build config |
| Deploy time — artifacts | `scripts/ci/verify-build.mjs` → `scripts/ci/secret-scan.mjs` | `sbp_` keys, `postgres(ql)://user:password@host`, `service_role` JWTs in `dist/` and every existing server root |
| Controls | `scripts/ci/secret-guard-controls.mjs` | feeds each guard its own failure and requires a non-zero exit |

`npm run verify:secret-guard` runs the controls. CI runs it after the
Supabase-mode artifact assertions, and `npm run verify:controls` chains it after
the existing bash controls, so the hermetic job exercises the same proof.

The guard replaces the two near-copies that arrived with PR #3
(`vite.pilot.config.ts` and `verify-build.mjs`). The union of both token sets is
kept, now covering `VITE_`, `NEXT_PUBLIC_`, and `REACT_APP_` prefixes.

Guard design constraints, deliberately chosen:

- **Name-based where a name is enough.** Proving a secret is about to be published
  must not require reading it; the name guard never touches a value.
- **Independent name checks.** A guard that lives only in one Vite config can be
  bypassed by a second config. The deploy gate re-checks rather than trusting the
  build.
- **Shape-based for artifacts.** A `service_role` JWT is base64url, so plain text
  search cannot find it; the scanner decodes the payload and compares `role`.
- **Narrow placeholders.** `<password>`, `${DB_PASSWORD}`, `***`, `xxxx`,
  `changeme`, `USER`, `PASSWORD` are not findings. A false positive here would
  block a legitimate build and teach people to bypass the gate.

## Proven

```
$ npm run verify:secret-guard
PASS  credential-shaped VITE_ name in the process environment is refused
PASS  each forbidden token is recognised in a VITE_ name
PASS  legitimate public names pass, and non-VITE_ credential names pass
PASS  credential-shaped VITE_ name declared in an .env file is refused
PASS  .env file with only legitimate names passes
PASS  sbp_ secret key inside an artifact is detected
PASS  a publishable key is not mistaken for an sbp_ secret key
PASS  database URI with an embedded password is detected
PASS  placeholder database URIs are not flagged
PASS  JWT with role service_role is detected
PASS  JWT with role anon is not flagged
PASS  malformed JWT-shaped text does not crash the scanner
PASS  verify-build refuses an artifact that contains a planted secret key
PASS  verify-build passes again once the fixture is removed
PASS  verify-build refuses a credential-shaped VITE_ name in the build environment

PASS: 15/15 negative controls fired as expected.
```

Also run on this branch: `npm run lint`, `npm run test:unit`, `npm run build`,
`npm run verify:build`, and `npm run verify:controls`. The CI run is recorded in
`docs/owner-preview-status.md`.

## Remaining / not claimed

- The guards scan **artifacts and names**, not source history. A secret committed
  and later deleted still needs rotation, not a scanner.
- No pre-commit hook. The gates run at build and in CI; a local commit can still
  contain a secret until CI runs. A hook is not Phase 0 scope.
- The guards do not prove that demo code is absent from a `demo`-mode bundle;
  `S0-P0-01` remains open.
- `NEXT_PUBLIC_` and `REACT_APP_` names are refused even though this app does not
  use them. That is deliberate: the guard follows the bundler rule, not the current
  framework.
