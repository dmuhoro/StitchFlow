#!/usr/bin/env bash
# ============================================================================
# Prove tenant isolation, onboarding, invitations and audit against the LINKED
# hosted Supabase project.
#
#   STITCHFLOW_ALLOW_HOSTED_VERIFY=1 npm run verify:hosted
#
# The proof file is self-contained, runs inside BEGIN … ROLLBACK, and asserts
# its own fixtures. It never depends on seed data and never leaves rows behind.
#
# Refuses to run unless:
#   - the explicit opt-in variable is set (a hosted database is production), and
#   - the repository is linked to a project ref.
# ============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROOF="$ROOT/supabase/tests/hosted_rls_e2e.sql"

if [[ "${STITCHFLOW_ALLOW_HOSTED_VERIFY:-}" != "1" ]]; then
  cat >&2 <<'EOF'
ERROR: Refusing to run against a hosted database without explicit opt-in.

A hosted project is production. Set the opt-in variable for this command only:

  STITCHFLOW_ALLOW_HOSTED_VERIFY=1 npm run verify:hosted

The proof file runs inside BEGIN … ROLLBACK, but the opt-in makes the target
deliberate rather than accidental.
EOF
  exit 1
fi

[[ -f "$PROOF" ]] || { echo "ERROR: missing $PROOF" >&2; exit 1; }

REF="$(cat "$ROOT/supabase/.temp/project-ref" 2>/dev/null || true)"
if [[ -z "$REF" ]]; then
  echo "ERROR: no linked Supabase project. Run 'npx supabase link --project-ref <ref>' first." >&2
  exit 1
fi

echo "==> hosted target: $REF"
echo "==> pre-run row counts (must be visible to a read-only role)"

npx supabase db query --remote --read-only \
  "select (select count(*) from public.ateliers) as ateliers,
          (select count(*) from public.members) as members,
          (select count(*) from public.audit_log) as audit_rows,
          (select count(*) from public.invitations) as invitations;" 2>&1 | tail -20

echo "==> running self-contained proof (BEGIN … ROLLBACK)"

npx supabase db query --remote --yes --file "$PROOF" 2>&1 | tail -30

echo "==> post-run row counts (rollback must leave them unchanged)"

npx supabase db query --remote --read-only \
  "select (select count(*) from public.ateliers) as ateliers,
          (select count(*) from public.members) as members,
          (select count(*) from public.audit_log) as audit_rows,
          (select count(*) from public.invitations) as invitations;" 2>&1 | tail -20

echo "==> hosted verification complete"
