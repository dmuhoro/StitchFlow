# 2026-11-07 — Live-data pilot readiness

## Commands and observed results

| Command | Result |
|---------|--------|
| `npm run lint` | PASS |
| `npm run build` | PASS (demo mode) |
| Supabase-mode build with placeholder URL/key, then `npm run verify:build` | PASS; production bundle assertions reject demo identities and copy |
| `npm run check:docs` | PASS |
| `npm run test:e2e -- --list` | PASS; five opt-in hosted tests collected. This lists tests only; it does not prove hosted browser flows. |
| `npm run verify:db` | PASS; 12 RLS scenarios, 15 local SQL E2E scenarios, booking B1–B23, staff S1–S6, structural RLS check for 16 public tables, and 200 concurrent slot attempts (1 success, 199 `slot_unavailable`, 0 duplicates). |
| `STITCHFLOW_ALLOW_HOSTED_VERIFY=1 npm run verify:hosted` | PASS; read-only hosted role/isolation proof completed. Pre/post atelier, member, audit, and invitation row counts were all zero and unchanged. This does not exercise hosted browser accounts. |
| `npx supabase migration list --linked` | BLOCKED for deployment: production contains remote migration `20261106122030` with no local file. Local booking migrations are pending remotely. |
| Read-only production catalog query for booking tables/functions | BLOCKED for live booking: `booking_resources`, `bookings`, and booking RPCs are absent. `appointments_public_insert` is still present remotely. |
| `npx supabase db push --remote --dry-run` | BLOCKED before writes: `DbPushMissingLocalError` for remote version `20261106122030`. No production migration was applied. |

## Verdict

**Local implementation PASS; production live-data pilot BLOCKED.** The production migration ledger
and schema must be reconciled first. The repository owner must identify or recover the exact migration
that produced remote version `20261106122030`, compare it with the live `create_atelier_with_owner`
function and schema, and restore a matching local migration history before retrying the dry run.
Do not mark that version reverted or push booking migrations until that reconciliation is reviewed.
After migration apply, run the hosted owner/employee/patron role journeys and the unique booking
confirmation fixture. Those journeys require owner-provisioned accounts and a test booking fixture;
no credentials or fixture values are stored in this repository.

## Security notes

No production credential values or account details are recorded here. Supabase-mode build used
placeholder values only.
