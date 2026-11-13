# 2026-11-13 — Verify the live-restore source when the credential is saved

## Problem

`npm run ops:set-source-db` validated the shape of the URI and wrote it. It did not
check that the host resolves from the rehearsal container or that the credential is
accepted. Three of the last live-restore attempts therefore failed downstream:

- the direct Supabase host was saved, then proved IPv6-unreachable;
- the Session pooler was saved, then Supabase rejected the authentication;
- at one point a line of prose with an em dash was pasted into the prompt.

In each case the file looked configured and the operator only learned the truth at the
rehearsal, one command later. That is a retry loop, not a diagnosis.

## Change

After a valid URI is written, the setter runs the already-proven read-only probe
(`node scripts/ops/source-db.mjs probe`) through `run-with-ops-secrets.sh`, from inside
the same `postgres:16` container that will run `pg_dump`.

- exit 0 — reachable and authenticated; prints the next command;
- exit 2 — saved but unusable; the probe prints the classified reason and remedy;
- docker unavailable — reports `UNVERIFIED` and leaves the rehearsal to probe;
- `STITCHFLOW_SKIP_SOURCE_PROBE=1` — writes without probing for offline use.

The write path is unchanged: validation still rejects a non-PostgreSQL URI, the HTTPS API
URL, port 6543, and a URI missing a user, password, host, or database name, and a rejected
value writes nothing. No secret is printed; the probe output names the host and the
classification only.

## Commands and results

```
# offline path: write succeeds, no probe
$ printf 'postgresql://postgres:***@127.0.0.1:5432/postgres\n' | \
    STITCHFLOW_OPS_ENV=$T/ops.env STITCHFLOW_SKIP_SOURCE_PROBE=1 \
    bash scripts/ops/set-source-db.sh
PASS: wrote SOURCE_DB_URL to .../ops.env (mode 600).
SKIPPED: source probe disabled by STITCHFLOW_SKIP_SOURCE_PROBE=1.
exit 0; file mode 600

# unresolvable host: saved, then blocked with a remedy
$ printf 'postgresql://postgres:***@nonexistent.invalid:5432/postgres\n' | \
    STITCHFLOW_OPS_ENV=$T/ops2.env bash scripts/ops/set-source-db.sh
PASS: wrote SOURCE_DB_URL to .../ops2.env (mode 600).
Probing the source from inside the postgres:16 container (read-only)...
BLOCKED: the hosted source is not reachable for the rehearsal (precondition, not a gate result).
  reason: the source host name did not resolve from the rehearsal container.
  Check the host in SOURCE_DB_URL; the pooler host is aws-0-<region>.pooler.supabase.com.
BLOCKED: the source cannot be used yet; the remedy is printed above.
exit 2
```

## Verdict

**PASS for the verification step; the live restore itself remains BLOCKED on the owner's
credential.**

The setter now delegates to the probe that negative control 5 already proves
(`probe: unresolvable source host` → exit 2 with the precondition banner), so the
classification path is exercised by `npm run verify:controls`. The setter adds no new
classification logic of its own.

Owner: Repository owner — rerun `npm run ops:set-source-db` with the Dashboard-generated
Session pooler URI. A `PASS` from that command now means the credential actually works.

## Note

A negative control for the setter itself would need docker to reproduce the probe
classification, while the existing control suite runs without docker. Control 5 covers the
same code path from the rehearsal side, and the rehearsal still probes before dumping, so
this change does not weaken that boundary.
