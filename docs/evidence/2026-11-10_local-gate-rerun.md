# 2026-11-10 — Credential-free local gate rerun

## Scope

The checks below used unit runners, disposable local containers, or loopback-only browser
configuration. No hosted database writes, deployment, push, or booking were performed.

## Commands and observed results

| Command | Exit | Observed result |
|---|---:|---|
| `npm run preflight` | 0 | Local capabilities were runnable; this agent shell reported two credential-shaped `VITE_*` names in the inherited environment. The user's terminal separately reported none. Values were not printed or recorded. |
| `npm run lint` | 0 | TypeScript check passed. |
| `npm run test:unit` | 0 | 2 files and 9 tests passed. |
| `npm run check:docs` | 0 | 172 relative Markdown links resolved across 105 files after the updates. |
| `npm run build` | 1 | Correctly refused because this agent shell inherited credential-shaped public-prefixed variable names. |
| `env -u VITE_SUPABASE_PERSONAL_ACCESS_TOKEN -u VITE_POSTGRESQL_URL npm run build` | 0 | Production-mode artifact built and passed the artifact gate. The build did not connect to or write to Supabase. |
| `npm run verify:db` | 0 | Migration, RLS, booking, and concurrency verification passed in disposable PostgreSQL. |
| `npm run test:e2e:hermetic` | 0 | All 6 browser journeys passed against a freshly reset local Supabase stack; the fitting fixture was recreated and locally confirmed. |
| `npm run verify:controls` | 0 | All 11 negative controls fired; expected negative cases exited 1 and blocked-precondition cases exited 2. |
| `npm run rehearse:restore` | 0 | Three invalid dumps were rejected; all 16 table counts matched after restore and the restored-database RLS suite passed. |
| `npm run rehearse:restore:hosted` (direct host) | 2 | Blocked before dumping: the rehearsal container has no route to the IPv6-only source host. |
| `npm run rehearse:restore:hosted` (Session pooler) | 2 | Pooler endpoint was reachable, but Supabase rejected authentication. Probe stopped before dumping; no source write occurred. |

Both hosted rehearsal exits `2` are missing preconditions, not restore-gate failures. The direct host
was unreachable; the Session pooler was reachable but rejected authentication. Verify the
Dashboard-generated username and current database password, update the protected URI through
`npm run ops:set-source-db`, then rerun the hosted rehearsal. Never record the URI or its password.

## Verdict

**Local gates PASS.** The production build passed with two unrelated exported variable names excluded
for that command; the build boundary still correctly refuses an unfiltered shell that contains
credential-shaped public-prefixed variables. The user's terminal reports a clean environment. Any
credential rotation remains an owner responsibility as recorded in
[`2026-11-10_bundle-secret-boundary.md`](2026-11-10_bundle-secret-boundary.md).
**Live restore BLOCKED** until the owner supplies valid Session-pooler authentication. No credentials
or credential values are included in this record.
