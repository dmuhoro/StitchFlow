# 2026-11-01 — Deployment (alignment)

## Command / Step

```bash
npx netlify-cli env:set VITE_DATA_MODE demo
npx netlify-cli deploy --prod --build

npm run verify:build
```

## Observed Result

- Netlify CLI authenticated; site `stitchflow-12pv` linked.
- Env pin: `VITE_DATA_MODE=demo` for a working, demo-mode production deploy matching AI Studio.
- Fresh cloud build succeeded; live URL: https://stitchflow-12pv.netlify.app
- Local verify:build passed with `npm run build` (deploy-ready artifact check).
- Bundle contains the required markers (`Nyambura Mwangi`, `Navbar.tsx` `(22)`), and local images are bundled under `dist/assets`.
- Production Supabase mode remains `BLOCKED` on providing `VITE_SUPABASE_*` and access to the StitchFlow project ref `vpathqzkaqdtbykumxeo`.

## Verdict

PASS (alignment, demo live) — white screen resolved.
