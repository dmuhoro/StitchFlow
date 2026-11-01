# 2026-11-01 — Deployment (production alignment)

## Command / Step

```bash
npx netlify-cli env:set VITE_SUPABASE_URL https://vpathqzkaqdtbykumxeo.supabase.co
npx netlify-cli env:set VITE_SUPABASE_PUBLISHABLE_KEY <publishable>
npx netlify-cli env:set VITE_DATA_MODE supabase
npm ci && npm run build && npx netlify-cli deploy --prod --build
node scripts/ci/verify-build.mjs
```

## Observed Result

- `npm run build`: 1,729 modules, completed.
- Bundle verification: `PASS: 11 build files, 8 hashed image assets, no dev-only or placeholder artifacts.`
- Bundle contains Supabase client (644KB vs prior 438KB demo bundle), including `createClient` / `GoTrueClient`.
- Production deploy live: https://stitchflow-12pv.netlify.app
- Netlify build completed in 7s, 12 files uploaded.

## Verdict

PASS — L9 is fully proven: production Supabase-mode build deployed and verified.

