# Runbook: Rollback

> Back out a bad release without corrupting tenant data.

## Application rollback

Netlify builds are immutable.

1. Open the Netlify project → Deploys.
2. Select the last known-good production deploy.
3. Choose **Publish deploy**.

The live site reverts immediately. No rebuild is required.

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

For the live site, re-run the checks in [`deployment.md`](deployment.md#5-verify-the-live-site).

## Record

Write the incident, the rollback point, and the verification result into
[`../evidence/`](../evidence/README.md) with a timestamp.
