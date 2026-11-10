# 2026-11-10 — Hosted rehearsal precondition classification

## Trigger

`npm run rehearse:restore:hosted` failed with:

```text
pg_dump: error: connection to server at "db.qkhfjlxhulekjrfgrdbz.supabase.co"
(2a05:d014:1577:8801::5a64), port 5432 failed: Network is unreachable
ERROR: source database dump failed.
FAIL: pg_dump against SOURCE_DB_URL failed. Check the database password and network access.
```

The harness exited `1`, which its own contract reserves for **a gate rejected its input**. Nothing had
been tested about the data: the source host resolved to an IPv6 address and this network has no IPv6
route. A restore rehearsal that reports "FAIL" when it could not connect teaches the operator the
wrong lesson and invites the wrong fix (retyping a password that was never wrong).

## Why the classification matters

The contract is `0` verified, `1` a gate rejected, `2` a precondition is missing. A network or
credential failure is a precondition. Reporting it as `1` is a false claim that the restore gate
produced a verdict. The rules this change upholds:

- A guard must not claim a protection it did not exercise.
- Fail closed, and name the real reason.
- A blocked capability names the human owner and the exact authorization needed.

## Change

- `scripts/ops/source-db.mjs` gained a read-only `probe` operation (`psql -c 'select 1'`) that runs
  inside the same `postgres:16` container that performs the dump, so reachability **and** the
  credential are proven from the same network position. On failure it classifies the error and exits
  `2`:
  - `Network is unreachable` / `No route to host` → session-pooler remedy (the direct host is IPv6-only);
  - `password authentication failed` / `Tenant or user not found` / `no pg_hba.conf entry` → credential remedy;
  - DNS-resolution failure → host-name remedy;
  - `timeout expired` → firewall/egress remedy;
  - TLS failure → `sslmode` remedy.
  Connect time is bounded (`PGCONNECT_TIMEOUT=15`) so an unreachable host fails with a classifiable
  timeout rather than hanging on the OS default. Error output is redacted for `//user:pass@` before
  printing.
- `scripts/ops/backup-restore-rehearsal.sh` probes before dumping in `hosted` mode and propagates
  exit `2`. A dump that fails **after** a successful probe is now `blocked` (exit `2`): a reachable,
  authenticated source that cannot be dumped is a privilege or tooling limitation, not a data
  verdict.
- `docs/runbooks/agent-operating-guide.md` documents the probe and the IPv6 → session-pooler path.
- `OWNER_ACTIONS.md` and `docs/current-state.md` name the reachability blocker instead of a vague
  "source credentials".

## Proof

The classifier was exercised in both directions: it must reject the failures it exists to catch,
and it must not block a healthy source.

| Case | Host | Exit | Observed |
|---|---|---:|---|
| Unreachable host (TEST-NET) | `192.0.2.1:5432` | 2 | `reason: the connection to the source timed out.` |
| Reachable container, wrong password | disposable `postgres:16` | 2 | `reason: the server rejected the credential.` + `npm run ops:set-source-db` remedy |
| Reachable container, correct password | disposable `postgres:16` | 0 | `source reachable ... credential was accepted (select 1).` |
| Real hosted source (read-only) | `db.qkhfjlxhulekjrfgrdbz.supabase.co` | 2 | `reason: the rehearsal container has no network route to the source host.` + Session pooler remedy |

The full hosted rehearsal now exits `2` and prints the remedy, before any dump:

```text
==> probing the hosted source from the rehearsal container
BLOCKED: the hosted source is not reachable for the rehearsal (precondition, not a gate result).
  reason: the rehearsal container has no network route to the source host.
  detail: psql: error: connection to server at "db.qkhfjlxhulekjrfgrdbz.supabase.co"
          (2a05:d014:1577:8801::5a64), port 5432 failed: Network is unreachable
  Supabase's direct host (db.<ref>.supabase.co) resolves to IPv6 only. Use the Session pooler
  instead (port 5432, user postgres.<ref>):
    postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require
```

The local path did not regress: `npm run rehearse:restore` exited `0` — the three derived archives
were rejected (exit `1`), 258,355 bytes restored, all 16 row counts matched, the RLS isolation suite
passed, and the structural RLS check passed.

The classification is now a permanent negative control (`npm run verify:controls`, case 10). An
unresolvable `.invalid` host must exit `2` and print the precondition banner; the control fails if
the probe ever reports a gate rejection (`1`) instead. This keeps the distinction from regressing
without needing a credential.

## Residual work — owner

| Action | Why | Where |
|---|---|---|
| Copy the **Session pooler** URI (port `5432`, user `postgres.<ref>`) | The direct host is IPv6-only and this network has no IPv6 route | Supabase → Project Settings → Database → Connection string → Session pooler |
| Run `npm run ops:set-source-db` with it | Replaces the unreachable direct-host URI | Local, hidden prompt |
| Run `npm run rehearse:restore:hosted` | The actual pilot-data restore gate | Local |

The live restore remains **BLOCKED** on the owner's network route and dashboard access, not on
engineering. It is not reported as passing.

## Verdict

**Classification PASS; live restore BLOCKED (owner).** An unreachable or unauthenticated source is
now reported as a precondition with a specific remedy and exit `2`. The restore gate is only reached,
and can only report `1`, after the source is proven reachable and authenticated.

## Follow-up operator attempt

The owner first re-entered the direct-host URI; as expected, the probe exited `2` because the
endpoint is IPv6-only and unreachable from the rehearsal container. The owner then configured a
Session-pooler endpoint. The rehearsal reached that endpoint, but the server rejected authentication;
it again exited `2` before `pg_dump`. No source dump, restore, or write occurred.

The required next action is to verify the exact Dashboard-generated Session pooler username and
current database password. If the password is uncertain, reset it in the Supabase dashboard, then
run `npm run ops:set-source-db` by itself and paste the complete URI only at the hidden prompt.
Rerun `npm run rehearse:restore:hosted` only after that setup.

The terminal command also included a Unicode em dash and explanatory prose as trailing arguments.
Although npm printed a non-ASCII argument warning, the script proceeded to prompt and write the URI.
The setter now rejects all command-line arguments before prompting, and a negative control covers
this case. Correct invocation: run `npm run ops:set-source-db` alone, then paste the URI at its
hidden prompt.

The later clean invocation used the hidden prompt correctly. It confirmed the pooler host was
selected, but the rehearsal server rejected authentication. This is an authentication
precondition—not a dump or restore result—and the URI/password values are intentionally absent from
this record.
