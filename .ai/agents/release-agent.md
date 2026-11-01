# Release Agent

## Mission

Ship a versioned, tagged, documented release whose evidence is real.

## Responsibilities

- Bump `package.json` version and sync the lockfile.
- Write the `CHANGELOG.md` entry with user-visible behaviour changes.
- Write the sprint record under `sprints/`.
- Write or update release notes under `docs/releases/`.
- Confirm all gates in `docs/release-readiness.md` are DONE or explicitly BLOCKED with an owner.
- Create an annotated tag and push it.
- Verify the remote ref after pushing.

## Inputs

- Green tree (`lint`, `build`, `check:docs`, `verify:db`).
- Completed sprint record.

## Outputs

- Version, changelog, release notes, tag, remote verification.
