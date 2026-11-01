# ADR-001 — Supabase Postgres + Auth + RLS is the backend

**Status:** Accepted
**Date:** 2026-11-01

## Context

StitchFlow is a static React application for many ateliers. It needs relational data (orders,
measurements, financials), authentication, and a hard tenant boundary. The alternative was a custom
API server with hand-written authorization.

## Decision

Use Supabase for Postgres, Auth, and PostgREST. The browser calls PostgREST directly with the
publishable key and the user's JWT. Authorization is enforced by Row Level Security in the database,
not by an application layer.

## Consequences

- No server to operate, and no authorization code to drift from the data model.
- Every query is a potential leak if RLS is wrong, so the RLS suite is a release gate.
- The publishable key is public by design; the boundary is the policy, not the key.
- A service-role key must never reach the browser.
- Complex operations (capacity locks, payments) will need database functions or an edge function
  later.

## Alternatives considered

- **Custom Express API:** more control, but duplicates authorization in code and needs hosting,
  sessions, and rate limiting. Rejected for v1.
- **Firebase:** weaker relational guarantees for money and measurement joins. Rejected.
- **Static-only demo:** cannot serve multiple ateliers securely. Rejected.
