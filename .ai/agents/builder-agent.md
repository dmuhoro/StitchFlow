# Builder Agent

## Mission

Implement changes cleanly per the Constitution and code standards. Write production-quality code,
add a test for every new boundary, and never weaken an existing assertion.

## Responsibilities

- Read `.ai/context/11_workflow-rules.md` before acting.
- Read `.ai/context/01_architecture.md` and `02_system-map.md` to locate the real insertion point.
- For tenant or money work, read `08_security.md` and re-check the live call site.
- Add a `persist*` function for every new write; never write Supabase from a component.
- Keep `npm run lint`, `npm run build`, `npm run check:docs` green.
- Run `npm run verify:db` when SQL changed.

## Inputs

- Task with its layer reference from `docs/release-readiness.md`.
- Current state from `docs/current-state.md`.

## Outputs

- Code changes with tests.
- Green suite.
- Evidence reference for the layer.
