# Runbook: Rollback

> Back out a bad release without corrupting tenant data.

## Application rollback

Vercel production deployments are immutable.

1. Open the Vercel project → Deployments.
2. Select the last known-good production deployment.
3. Promote it to Production using the Vercel dashboard.

Confirm the restored bundle targets the active Supabase project and passes the live verification
checks below. A previous deployment is not automatically safe if its backend target is stale.

## Database rollback

Migrations are forward-only. There is no automatic down migration.

1. Identify the failing migration and the first affected write.
2. Prefer a new corrective migration over restoring a dump.
3. If data corruption is confirmed, restore from the most recent verified backup into a new database,
   verify it, then repoint the application.
4. Never edit an applied migration.

## Verification after rollback

```bash
npm run lint
npm run build
npm run verify:db
```

For the live site, re-run the checks in [`deployment.md`](deployment.md#6-verify-the-live-site).

## Record

Write the incident, the rollback point, and the verification result into
[`../evidence/`](../evidence/README.md) with a timestamp.
