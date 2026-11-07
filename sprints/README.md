# Sprint Records

> One record per layer of work. A sprint record states what was planned, what shipped, what was
> proven, and what remains. It is not a marketing document.

## Convention

- File: `sprint-NN-kebab-title.md`.
- Status: `PLANNED`, `IN PROGRESS`, `DONE`, or `BLOCKED`.
- Every "shipped" claim cites a commit or a file.
- Every "proven" claim cites a command, test, or evidence file.
- Remaining work is listed explicitly; silence is not "done".

## Index

| Sprint | Title | Status |
|--------|-------|--------|
| [00](sprint-00-operating-scaffold.md) | Operating scaffold | DONE |
| [01](sprint-01-launch-readiness.md) | Launch readiness v1.0.0 | DONE — demo-first release |
| [00a](sprint-00a-verify-and-decide.md) | Verify and decide (audit) | DONE — Sprint 1 BLOCKED on ADR approval |
| [01a](sprint-01-real-data-real-auth.md) | Real data / real auth | IN PROGRESS |
| [03](sprint-03-booking-engine-db.md) | Booking engine, database layer | IN PROGRESS — local green; CI/tag pending |
