# 2026-11-01 — Build artifacts and bundle assertions

## Command / Step

```bash
npm run lint
npm run build
npm run verify:build
```

## Observed Result

```
> tsc --noEmit
(no output — clean)

vite v8.3.5 building client environment for production...
✓ 1729 modules transformed.
dist/index.html                                                    1.80 kB │ gzip:   0.77 kB
dist/assets/senator_suit_kaftan_1793438763426--VFKTLUj.jpg       693.39 kB
dist/assets/bonwire_kente_regalia_1793438764736-CLI6nfWU.jpg     725.32 kB
dist/assets/kenyan_kikoy_modern_1793438766233-KFJWaNav.jpg       748.52 kB
dist/assets/agbada_aso_oke_1793438762681-CRZIoIHj.jpg            821.30 kB
dist/assets/swahili_lamu_kanzu_1793438765918-BY38TPt4.jpg         874.14 kB
dist/assets/kenyan_tribal_kikuyu_1793438766135-D-cbI38B.jpg      903.45 kB
dist/assets/kenyan_tribal_maasai_1793438766637-BRpdk1II.jpg       916.63 kB
dist/assets/kitenge_ruracio_bridal_1793438764201-C1thNxDA.jpg  1,059.87 kB
dist/assets/index-CWpEHtwL.css                                    53.07 kB │ gzip:  10.10 kB
dist/assets/index-D044CrtP.js                                    431.94 kB │ gzip: 116.15 kB
✓ built in 1.58s

> node scripts/ci/verify-build.mjs
PASS: 11 build files, 8 hashed image assets, no dev-only or placeholder artifacts.
```

### Defect found and fixed

Every local lookbook image was referenced as a literal
`/src/assets/images/<file>.jpg` string. That path only exists in the dev server; a production build
hashes and emits assets under `dist/assets/`, so all eight images 404'd in production.

Fixed by importing each image as a module in `src/data/initialData.ts` and
`src/components/PublicPortfolio.tsx`, per ADR-006. Vite now emits eight hashed image assets, proven
by the listing above and by the artifact assertion.

### What the artifact check proves

- `dist/index.html` references a hashed JavaScript asset.
- The bundle contains no literal `/src/assets/` path.
- No placeholder Supabase host (`your-project-ref`) and no placeholder key.
- No `service_role` marker anywhere in the output.
- At least one bundled image asset is emitted (8 found).

## Verdict

**PASS** — L3 is proven: local imagery is bundled and served from hashed URLs.
