# 2026-11-13 — Node.js version contract and Vercel runtime alignment

## Problem

The runtime was declared and applied in three places, and all three disagreed:

| Place | Value before | What it controls |
|-------|--------------|------------------|
| `.nvmrc` | `20` | What CI and developers install |
| `package.json#engines` | absent | What npm advertises |
| Vercel project setting | `26.x` | What a remote source build runs |
| Local / proven artifact | `22.22.1` | The only toolchain that has produced a verified build |

Node.js 20 reached end of life on 2026-10-01, so the declared version was both
deprecated and different from the runtime that built the approved deployment.
A build on an unproven major is not evidence, and a guard that only prints a
mismatch is decoration.

## Change

- `.nvmrc` and `package.json#engines.node` both declare major **22**, the same
  major as the approved deployment artifact and the local toolchain.
- `scripts/ci/check-node-version.mjs` fails (exit 1) when the two tracked
  declarations disagree, when either is missing, or when `engines.node` is
  absent. With `NODE_CONTRACT_STRICT=1` it also fails when the running major is
  not the declared major; CI sets that variable, so CI proves the runtime it
  actually installed.
- CI runs the guard in both the `quality` and `e2e` jobs.
- `npm run preflight` reports declaration agreement, the running major, and the
  Vercel node version recorded at link time.
- The Vercel project setting was moved from `26.x` to `22.x` to match.

## Commands and results

Environment: Linux, local Node `v22.22.1`, npm `11.12.1`, Vercel CLI `65.12.1`.

```
$ npm run check:node
Node.js contract: .nvmrc=22 engines.node=22.x (declared major 22); running v22.22.1
PASS: the tracked Node.js declarations agree.
exit 0

$ NODE_CONTRACT_STRICT=1 npm run check:node
PASS: the tracked Node.js declarations agree.
exit 0

# drift fixture: .nvmrc=20, engines.node=22.x
FAIL: declared versions disagree: .../.nvmrc wants major 20, engines.node wants major 22
exit 1

# missing engines fixture
FAIL: .../package.json has no engines.node declaration
exit 1

$ vercel project inspect stitchflow --scope team_sGSR187e4tniaRMCYJ8yb0JG
    Node.js Version   22.x
    Framework Preset  Vite
    Region            iad1
    Failover Regions  None

$ vercel api /v9/projects/prj_aAjFkv5rqDMkPY0dzt4Gm1FVNQnH \
    -X PATCH -f nodeVersion=22.x --scope team_sGSR187e4tniaRMCYJ8yb0JG
{ "id": "prj_aAjFkv5rqDMkPY0dzt4Gm1FVNQnH", "name": "stitchflow", "nodeVersion": "22.x" }

$ vercel build --prod --yes --scope team_sGSR187e4tniaRMCYJ8yb0JG
vite v8.3.5 building client environment for production...
✓ built in 1.33s
PASS: 4 build files, 1 hashed image assets, no dev-only or placeholder artifacts.
"target": "production", "message": "Build completed successfully."
exit 0
```

Local gates after the change: `check:node` 0, `lint` 0, `test:unit` 0 (9 tests),
`check:docs` 0 (175 links / 105 files), `build` 0, `verify:controls` 0
(**14/14** controls, three of them new for this guard).

## Remote confirmation (CI)

GitHub Actions push run [43449174766](https://github.com/dmuhoro/StitchFlow/actions/runs/43449174766)
passed all jobs for `3dd58ea`, including the new `npm run check:node` step under
`NODE_CONTRACT_STRICT=1`. CI therefore installed the declared major and asserted it, rather than only
declaring it in a file.

## Verdict

**PARTIAL — declared and applied versions now agree; remote source build not yet
proven.**

- DONE: one declared major (22) in both tracked declarations, enforced by a
  guard that is proven to reject drift, and run in CI in strict mode.
- DONE: the Vercel project setting matches the declared major, verified by
  `vercel project inspect`.
- DONE: a production-target `vercel build` succeeds on the declared toolchain
  and passes the artifact gate.
- NOT PROVEN: a Vercel-hosted **remote** source build. `vercel build` runs on the
  local machine, so it does not exercise Vercel's build runtime. Proving that
  requires an authorized source deploy, which this change did not perform.

Owner: Repository owner — authorize one source deploy from
`sprint-3/booking-staff-slice` (or a merge) to close the remote half.

## Follow-up

Node.js 22 is in maintenance until April 2027. Moving to the next active LTS is
a scheduled upgrade that must re-run this same proof on the new major; the guard
makes the move a two-line change plus verification rather than a silent drift.

## Note on local state

`vercel link` appended a `VERCEL_OIDC_TOKEN` to the gitignored `.env.local`. It
was removed immediately so the file stays limited to the three public browser
variables (`VITE_DATA_MODE`, `VITE_SUPABASE_URL`,
`VITE_SUPABASE_PUBLISHABLE_KEY`). No secret value was printed or committed.
