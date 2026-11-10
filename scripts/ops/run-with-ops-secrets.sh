#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Run a command with the operator secret file loaded, without ever echoing it.
# ---------------------------------------------------------------------------
# The live dump/restore rehearsal needs SOURCE_DB_URL, a PostgreSQL superuser
# connection string. That credential is held by the repository owner and is
# never committed, never exported in a shell profile, and never placed in CI.
#
# This wrapper is the only sanctioned way to inject it:
#
#   npm run rehearse:restore:hosted
#
# It loads `${STITCHFLOW_OPS_ENV:-$HOME/.config/stitchflow/ops.env}` for the
# duration of the child process only, refuses a file that is not mode 600, and
# fails closed with the exact setup command when the file or the variable is
# absent. Values are never printed.
#
# Exit codes: 0 the child succeeded; 2 a precondition is missing (not a gate
# result); otherwise the child's exit code.
# ---------------------------------------------------------------------------
set -euo pipefail

OPS_ENV="${STITCHFLOW_OPS_ENV:-$HOME/.config/stitchflow/ops.env}"

blocked() {
  printf 'BLOCKED: %s\n' "$1" >&2
  [[ -n "${2:-}" ]] && printf '  %s\n' "$2" >&2
  exit 2
}

if [[ $# -eq 0 ]]; then
  blocked "no command given." "usage: run-with-ops-secrets.sh <command> [args...]"
fi

[[ -f "$OPS_ENV" ]] || blocked \
  "the operator secret file is missing: ${OPS_ENV}" \
  "Run: npm run ops:set-source-db   (validates the value and writes it with mode 600)"

PERMS="$(stat -c '%a' "$OPS_ENV" 2>/dev/null || echo unknown)"
[[ "$PERMS" == "600" ]] || blocked \
  "the operator secret file must be mode 600, found ${PERMS}: ${OPS_ENV}" \
  "chmod 600 '${OPS_ENV}'"

set -a
# shellcheck disable=SC1090
. "$OPS_ENV"
set +a

[[ -n "${SOURCE_DB_URL:-}" ]] || blocked \
  "SOURCE_DB_URL is empty in ${OPS_ENV}." \
  "Re-add it with the setup command printed above."

exec "$@"
