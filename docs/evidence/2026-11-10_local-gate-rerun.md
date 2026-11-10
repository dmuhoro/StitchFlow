# 2026-11-10 — Credential-free local gate rerun

## Scope

The checks below used unit runners, disposable local containers, or loopback-only browser
configuration. No hosted database writes, deployment, push, or booking were performed.

## Commands and observed results

| Command | Exit | Observed result |
|---|---:|---|
| `npm run preflight` | 0 | Reported local gates runnable; marked the ordinary build blocked because two credential-shaped `VITE_*` names remain in the inherited shell environment. Values were not printed or recorded. |
| `npm run lint` | 0 | TypeScript check passed. |
| `npm run test:unit` | 0 | 2 files and 9 tests passed. |
| `npm run check:docs` | 0 | 168 relative Markdown links resolved across 106 files. |
| `npm run build` | 1 | Correctly refused to build because the inherited shell environment defines credential-shaped public-prefixed names. |
| `env -u VITE_SUPABASE_PERSONAL_ACCESS_TOKEN -u VITE_POSTGRESQL_URL VITE_DATA_MODE=supabase VITE_SUPABASE_URL=http://127.0.0.1:54521 VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_negative_control_loopback_key STITCHFLOW_LOCAL_SUPABASE_BUILD=1 npm run build -- --mode test` | 0 | Loopback-only Supabase-mode artifact built and passed the artifact gate. |
| `npm run verify:db` | 0 | Migration, RLS, booking, and concurrency verification passed in disposable PostgreSQL. |
| `npm run test:e2e:hermetic` | 0 | All 6 browser journeys passed against a freshly reset local Supabase stack. |
| `npm run verify:controls` | 0 | All 9 negative controls fired; expected negative cases exited 1. |
| `npm run rehearse:restore` | 0 | Three invalid dumps were rejected; all 16 table counts matched after restore and the restored-database RLS suite passed. |
| `npm run rehearse:restore:hosted` | 2 | Blocked before dumping: the rehearsal container has no route to the IPv6-only direct source host. The probe recommended the Supabase Session pooler. No source write occurred. |

The hosted rehearsal exit `2` is a missing network precondition, not a restore-gate failure.
Use the Session pooler URI (port `5432`) with `npm run ops:set-source-db`, then rerun the hosted
rehearsal. Never record the URI or its password.

## Verdict

**Local gates PASS with loopback-only configuration.** **Default build BLOCKED** until the owner
removes the credential-shaped variables from the shell environment and rotates any exposed
credentials as recorded in [`2026-11-10_bundle-secret-boundary.md`](2026-11-10_bundle-secret-boundary.md).
**Live restore BLOCKED** until the owner supplies a reachable Session pooler route. No credentials
or credential values are included in this record.
