# 2026-11-10 — Published-secret boundary

## Trigger

`npm run preflight` reported that `.env.local` defined `VITE_SUPABASE_PASSWORD`,
`VITE_POSTGRESQL_URL`, `VITE_SUPABASE_PERSONAL_ACCESS_TOKEN`, and `VERCEL_OIDC_TOKEN`.

`VITE_*` is not a naming preference. Vite inlines every `VITE_`-prefixed value into the client
bundle, so a database password with that prefix is a password that ships to every visitor as soon as
any code reads it. The fourth value, a Supabase personal access token, can control the whole Supabase
account — a wider blast radius than the database itself.

No value appears in this record, in any other evidence file, or in any commit.

## Blast-radius assessment

Four independent checks, each run before any file was edited.

| Check | Method | Observed |
|---|---|---|
| Local build artifacts | `grep -rlF` the value across `dist`, `.vercel/output`, `build`, `test-results`, `playwright-report`, `node_modules/.vite`, `coverage` | **0 hits** for all three values |
| Tracked files | `git grep -lF` | **not present** |
| Commit history | `git log --all -S<value>` | **never committed** |
| Live bundle | fetched every `<script src>` from `https://stitchflow-coral.vercel.app` and searched the served JavaScript | 1 bundle, **0 hits — CLEAN** |
| Runtime reachability | `grep -rn "import.meta.env" src` | three explicit `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_DATA_MODE` reads; **no spread and no dynamic `[...]` access** |

**Conclusion:** there is no evidence the values were ever published. The exposure was latent (one
`import.meta.env` read away from a leak), plus the file on disk and this session's terminal output.

Rotating is still required, and is not optional: a credential that has been written into a file, an
environment, and a terminal is treated as burned, because the only cost of rotation is a few minutes
and the cost of being wrong is the pilot's data.

## Fixes applied

1. `.env.local` rewritten to the three public browser values only (`VITE_DATA_MODE`,
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`), mode `600`. The operator values were removed,
   not moved into it; they belong in `~/.config/stitchflow/ops.env`, which Vite never loads.
2. The accidental Vercel environment variable `NAME` (created by running the template command
   verbatim) was removed. Production environment now holds only the three public configuration values.
3. **Build-boundary guard** — `vite.pilot.config.ts` loads the env for the active mode and refuses to
   build when a public-prefixed name is credential-shaped. The check is name-based on purpose: it must
   not need the secret's value to prove the secret is about to be published. It throws at config time,
   so the build fails before an artifact exists.
4. **Artifact gate** — `scripts/ci/verify-build.mjs` re-checks the same invariant against every `.env*`
   file and the process environment. Defense in depth: a second build config cannot bypass a guard that
   only lives in the first one.
5. **Preflight** — `npm run preflight` scans both the shell environment and every `.env*` file and
   marks `npm run build` as `BLOCKED` when it finds such a name. The shell scan matters: the values had
   already been removed from `.env.local` and were still exported in the session, and a file-only check
   said "clean" while the build correctly refused.
6. **Harness hygiene** — `scripts/e2e/hermetic.sh` and `scripts/ci/negative-controls.sh` clear those
   names, so an operator's ambient export cannot make a hermetic run fail for an unrelated reason.

## Proof

Each guard was observed rejecting the failure it exists to catch.

`npm run verify:controls`, exit `0`, 9/9 (two runs, identical):

```text
PASS  demo artifact, no deploy context                           expected pass got pass (exit 0)
PASS  demo artifact in a production deploy context               expected fail got fail (exit 1)
PASS  Supabase artifact, loopback + explicit local flag          expected pass got pass (exit 0)
PASS  local flag used with a hosted project URL                  expected fail got fail (exit 1)
PASS  local loopback artifact promoted to production             expected fail got fail (exit 1)
PASS  loopback artifact without the explicit opt-in flag         expected fail got fail (exit 1)
PASS  build with VITE_SUPABASE_PASSWORD set                      expected fail got fail (exit 1)
PASS  artifact gate with VITE_SUPABASE_PASSWORD set              expected fail got fail (exit 1)
PASS  full E2E suite against a demo-mode build                   expected fail got fail (exit 1)
```

The build refusal names the offending variables and the remediation:

```text
Refusing to build: these variables look like credentials but carry a public prefix,
so Vite would inline them into the browser bundle:
  - VITE_SUPABASE_PERSONAL_ACCESS_TOKEN
  - VITE_POSTGRESQL_URL
```

With those names cleared, the same build succeeds:

```text
PASS: 4 build files, 1 hashed image assets, no dev-only or placeholder artifacts.
```

Credential-input validation, `npm run ops:set-source-db`, each path observed:

| Input | Exit | Result |
|---|---:|---|
| `https://<ref>.supabase.co` (the HTTPS API URL) | 1 | `REJECTED: that is the HTTPS API URL, not a database connection string.` |
| `postgresql://postgres@db.x:5432/postgres` (no password) | 1 | `REJECTED: the URL has no password.` |
| `...pooler.supabase.com:6543/postgres` | 1 | `REJECTED: port 6543 is the transaction pooler, which cannot serve pg_dump.` |
| Valid URI, dummy host | 0 | written, mode `600`, `password=***`, 87 value characters |

## Residual work — owner, dashboard access

| Action | Why | Where |
|---|---|---|
| Reset the database password | It existed in a `VITE_` variable and in a session terminal | Supabase → Project Settings → Database → Reset database password |
| Revoke the personal access token | Account-level credential; broader than the database | Supabase → Account → Access Tokens |
| Re-enter the new password | The live rehearsal needs it | `npm run ops:set-source-db` |

Until rotation is confirmed, the live dump/restore rehearsal stays **BLOCKED** on a credential the
owner must replace — not on engineering.

## Verdict

**Guard PASS, rotation PENDING.** The build can no longer publish a credential-shaped `VITE_`
variable, and that refusal is observed rather than asserted. No evidence of publication exists in
local artifacts, git history, or the live bundle. The two credentials must still be rotated by the
owner before the live restore is attempted.
