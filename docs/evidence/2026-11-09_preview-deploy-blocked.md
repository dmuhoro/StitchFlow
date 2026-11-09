# 2026-11-09 — Preview deployment blocked by target mismatch

## Step 1 — Push prerequisite and branch push

### Commands

```sh
git remote -v
git push --dry-run
git push --dry-run --set-upstream origin sprint-3/booking-staff-slice
git push --set-upstream origin sprint-3/booking-staff-slice
```

### Observed result

- `git remote -v` exited 0 and resolved `origin` to the StitchFlow GitHub repository.
- Bare `git push --dry-run` exited 128 because the branch had no upstream configured; no remote
  authorization check was reached by that invocation.
- The explicit dry run exited 0 and reported the branch update would move `2d55e0a..42b7f9d`.
- The actual branch push exited 0, updated `origin/sprint-3/booking-staff-slice`, and configured
  the upstream. No missing `workflow`-scope error occurred.

## Step 2 — Build and deploy preview

### Command

```sh
vercel build --prod && vercel deploy --prebuilt
```

### Observed output

```text
Vercel CLI 65.12.1
Running "install" command: `npm ci`...

added 87 packages, and audited 88 packages in 8s
22 packages are looking for funding
found 0 vulnerabilities

> stitchflow@1.4.0-rc.2 build
> vite build --config vite.pilot.config.ts

vite v8.3.5 building client environment for production...
transforming...
✓ 1730 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                                          1.80 kB │ gzip:   0.78 kB
dist/assets/agbada_aso_oke_1793438762681-CRZIoIHj.jpg  821.30 kB
dist/assets/index-Dl66UCrO.css                          55.87 kB │ gzip:  10.54 kB
dist/assets/index-CaIwEMsA.js                          670.32 kB │ gzip: 174.19 kB
[plugin builtin:vite-reporter]
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
✓ built in 1.08s

> stitchflow@1.4.0-rc.2 postbuild
> node scripts/ci/verify-build.mjs

PASS: 4 build files, 1 hashed image assets, no dev-only or placeholder artifacts.
{
  "status": "ok",
  "outputDir": "[local path omitted]/.vercel/output",
  "outputDirRelative": ".vercel/output",
  "target": "production",
  "message": "Build completed successfully."
}
Vercel CLI 65.12.1
Error: The "--prebuilt" option was used with the target environment "preview", but the prebuilt output found in ".vercel/output" was built with target environment "production". Please run `vercel --prebuilt --prod`.
Learn More: https://vercel.link/prebuilt-environment-mismatch
```

`vercel build --prod` exited 0. The chained `vercel deploy --prebuilt` exited 1. No preview URL
was created. The CLI's suggested `--prod` deploy was not run because it would target production.
The artifact was not redeployed through an alternate command.

## Verdict

**BLOCKED at Step 2.** Steps 3–8 were not attempted: no bundle verification, E2E run, production
promotion, owner booking, backup/restore rehearsal, version bump, tag, or PR. No secret values were
included in this record.

## Owner action

Choose/authorize a Vercel preview build/deploy flow whose build target and deploy target are both
preview. Then resume at Step 2 and continue the gated sequence only if the preview deploy succeeds.
