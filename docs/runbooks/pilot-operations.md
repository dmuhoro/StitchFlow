# Runbook: Supervised Pilot Operations

> One boutique atelier, owner-controlled workflows, and no public self-service. This checklist does
> not authorize payments, guest booking, messaging integrations, or additional live ateliers.

## Before opening the pilot

- [ ] Confirm a fresh production build passes `npm run lint`, `npm run build`, and
  `CONTEXT=production node scripts/ci/verify-build.mjs`.
- [ ] Publish the artifact and confirm the live bundle targets the active Supabase project.
- [ ] Run `npm run verify:pilot` and all hosted Playwright role journeys against that live artifact.
- [ ] Verify owner, employee, and patron see only their intended workflows and data.
- [ ] Confirm anonymous fitting submission remains disabled.
- [ ] Record the deployment, checks, owner approval, and any known limitations in
  [`../evidence/`](../evidence/README.md).

Do not open the pilot while a verification step is blocked. The current deployment/build blockers
are recorded in [`deployment.md`](deployment.md) and [issue #4](https://github.com/dmuhoro/StitchFlow/issues/4).

## Provisioning rehearsal

`npm run seed:pilot` creates one supervised pilot atelier (A), a second isolation-only tenant (B),
role identities, and deterministic synthetic fixtures. Tenant B is only an isolation control; it is
not a second customer pilot. The command requires an explicit owner email and a service-role key and
refuses to proceed unless the target matches the locally linked Supabase project.

For a rehearsal, use a fresh, disposable Supabase project—not the production pilot:

1. Link the checkout to the disposable project and apply the tracked migrations:
   `supabase link --project-ref <disposable-project-ref>` then
   `supabase db push --dry-run --remote` and `supabase db push --remote --yes`.
2. Provide `SUPABASE_PILOT_URL`, `SUPABASE_PILOT_SERVICE_ROLE_KEY`,
   `SUPABASE_PILOT_PUBLISHABLE_KEY`, and `PILOT_ADMIN_EMAIL` through the shell or a mode-`0600`
   ignored secrets file. Never pass credentials as command arguments or record their values.
3. Run `npm run seed:pilot` once. Confirm it writes `.env.pilot` with restrictive permissions.
4. Run `npm run verify:pilot`; require every role, tenant-isolation, write-denial, and fitting
   assertion to pass. Run `npm run seed:pilot-fitting` only when the deterministic fitting is
   missing its patron link, then rerun the verifier.
5. Capture counts and pass/fail results only. Do not retain access tokens, passwords, or real patron
   data in evidence.

The script has not been run against the production project in this work. Do not seed production
without explicit owner approval.

## Backup and restore rehearsal

No automated backup or restore process has been verified for this pilot. Before accepting
non-synthetic atelier data:

1. In Supabase, confirm the active plan supports database backups and a restore destination. If it
   does not, stop and obtain an owner-approved backup plan.
2. Create a backup of the disposable rehearsal project after the seed above.
3. Restore that backup to a separate disposable project using the Supabase Dashboard's documented
   restore flow. Never overwrite the production pilot to test a restore.
4. Point a private `.env.pilot`/`PILOT_SECRETS_FILE` at the restored project and run
   `npm run verify:pilot`. Require the six pilot/isolation identities and all RLS assertions to
   resolve; separately run `npm run verify:db` for the migration and database suite.
5. Record the backup timestamp, restore target, verification commands/results, and any recovery
   time. Do not include database URLs, keys, passwords, email addresses, or patron details.
6. Remove the disposable projects and local backup files through approved, targeted cleanup.

This rehearsal is **not yet performed**. Until an owner completes it and records evidence, recovery
from production data loss is an explicit pilot limitation.

## Support and pause checklist

1. Capture the time, role, atelier, affected screen/action, and a redacted error message. Never ask
   for a password, token, or service-role key.
2. Stop the affected owner/staff workflow. Do not ask a patron or employee to retry a write that may
   have partially completed.
3. Have the owner check the order/request in Supabase through the approved owner workflow before
   retrying. Do not use direct SQL to repair live tenant data without an approved incident plan.
4. If there is a suspected cross-tenant exposure, unauthorized write, or lost access boundary,
   pause the entire pilot immediately and notify the repository owner.
5. Keep guest fitting submission closed. The pilot has no payment, WhatsApp/SMS, media-storage, or
   automated alerting support.
6. Record the incident and resolution in a dated evidence note; include no credentials or personal
   data.

## Application rollback

Follow [`rollback.md`](rollback.md): promote the last known-good immutable Vercel deployment, then
rerun the live-site verification in [`deployment.md`](deployment.md). Do not roll back database
migrations; they are forward-only. If data corruption is suspected, pause writes and use the
verified backup/restore procedure above. That procedure remains blocked until its rehearsal passes.
