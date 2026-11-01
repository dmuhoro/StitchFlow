# 2026-11-01 — Deployment

## Command / Step

```bash
npx netlify-cli link --id db552225-05b6-4158-895c-7de02c2e5d94
npm run build
npx netlify-cli deploy --prod
```

## Observed Result

- Site linked (`stitchflow-12pv`), Netlify CLI authenticated locally (no secret printed).
- `npm run build` passed (12 files).
- Production deploy live: `https://stitchflow-12pv.netlify.app`.
- Note: build used the default mode (`VITE_DATA_MODE` unset in this environment), so the public
  site is currently a demo-mode deployment. Supabase-backed production build requires env vars
  `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_DATA_MODE=supabase`, and a
  Supabase project with spare capacity (project creation returned a free-tier limit error).

## Verdict

PASS (deployment pipeline + live publish verified) with BLOCKED sub-step noted for production
Supabase-backed mode.
