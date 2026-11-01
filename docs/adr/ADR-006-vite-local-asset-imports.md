# ADR-006 — Local imagery is imported through Vite

**Status:** Accepted
**Date:** 2026-11-01

## Context

The lookbook referenced bundled imagery as literal strings such as
`/src/assets/images/agbada_aso_oke_1793438762681.jpg`. That path exists only in the dev server. A
production build hashes and emits assets under `dist/assets/`, so every literal reference 404s.

## Decision

Import each local image as a module and store the resolved URL in the data:

```ts
import agbadaAsoOke from '../assets/images/agbada_aso_oke_1793438762681.jpg';
```

Vite then emits the file with a content hash and the import returns the correct URL in both dev and
production. Remote Unsplash URLs remain strings.

## Consequences

- Lookbook and portfolio imagery render in production.
- The artifact check can assert that `dist/` contains no `/src/assets/` literal.
- Adding an image creates a build-time dependency; a missing file fails the build, which is correct.
- Bundle size grows with the number of bundled images; larger media should move to storage later.

## Alternatives considered

- **Move images to `public/` and reference `/images/...`:** works, but loses content hashing and
  cache-busting. Rejected.
- **Base64 inline everything:** bloats the JS bundle. Rejected.
- **Remote CDN only:** adds a runtime dependency and loses offline preview fidelity. Rejected for the
  pilot.
