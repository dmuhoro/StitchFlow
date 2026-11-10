#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Set the operator-only SOURCE_DB_URL, validated before it is written.
# ---------------------------------------------------------------------------
# A free-form hidden prompt is easy to answer wrongly: the Supabase dashboard
# shows an HTTPS API URL next to the Postgres URI, and pasting the wrong one
# produces a file that looks configured but can never connect. This script
# rejects anything that is not a PostgreSQL connection URL, verifies every
# field pg_dump needs, and prints a redacted confirmation.
#
#   npm run ops:set-source-db
#
# The value is typed at a hidden prompt. It never appears in argv, shell
# history, the terminal, or this script's output.
#
# Exit codes: 0 written; 1 the value was rejected (nothing was written);
# 2 the destination could not be prepared.
# ---------------------------------------------------------------------------
set -euo pipefail

if [[ $# -ne 0 ]]; then
  printf 'ERROR: this command takes no arguments; paste the URI at the hidden prompt.\n' >&2
  printf 'Usage: npm run ops:set-source-db\n' >&2
  exit 2
fi

OPS_ENV="${STITCHFLOW_OPS_ENV:-$HOME/.config/stitchflow/ops.env}"

reject() {
  printf 'REJECTED: %s\n' "$1" >&2
  [[ -n "${2:-}" ]] && printf '  %s\n' "$2" >&2
  rm -f "${TMP:-}" 2>/dev/null || true
  exit 1
}

printf 'Paste the PostgreSQL connection URI (input is hidden): '
IFS= read -rsp '' VALUE
printf '\n'
[[ -n "$VALUE" ]] || reject "nothing was entered." "Nothing was written."

case "$VALUE" in
  https://*|http://*)
    reject "that is the HTTPS API URL, not a database connection string." \
      "Use Supabase -> Project Settings -> Database -> Connection string (URI).
  It must start with postgresql:// and contain a user, a password, a host, and a database name."
    ;;
esac

[[ "$VALUE" =~ ^postgres(ql)?:// ]] || reject \
  "the value is not a PostgreSQL connection URL." \
  "It must start with postgresql:// (direct host db.<ref>.supabase.co:5432, or the session pooler on :5432)."

BODY="${VALUE#*://}"
AUTHORITY="${BODY%%/*}"
REST="${BODY#*/}"
DBNAME="${REST%%\?*}"
USERINFO="${AUTHORITY%%@*}"
HOSTPORT="${AUTHORITY#*@}"

[[ "$USERINFO" == *:* ]] || reject "the URL has no password." "Format: postgresql://USER:PASSWORD@HOST:5432/DATABASE"
[[ -n "${USERINFO%%:*}" ]] || reject "the URL has no user."
[[ -n "${HOSTPORT%%:*}" ]] || reject "the URL has no host."
[[ -n "$DBNAME" ]] || reject "the URL has no database name."
case "$HOSTPORT" in
  *:6543) reject "port 6543 is the transaction pooler, which cannot serve pg_dump." "Use the direct host or the session pooler on port 5432." ;;
esac

install -d -m 700 "$(dirname "$OPS_ENV")" || exit 2
TMP="$(umask 077; mktemp "$(dirname "$OPS_ENV")/.ops.env.XXXXXX")" || exit 2
printf 'SOURCE_DB_URL=%s\n' "$VALUE" >"$TMP"
chmod 600 "$TMP"
mv -f "$TMP" "$OPS_ENV"
unset VALUE TMP

printf 'PASS: wrote SOURCE_DB_URL to %s (mode 600).\n' "$OPS_ENV"
printf '      host=%s database=%s user=%s password=***\n' "$HOSTPORT" "$DBNAME" "${USERINFO%%:*}"
case "${HOSTPORT%%:*}" in
  db.*.supabase.co)
    printf '\nNOTE: that is the direct Supabase host, which is IPv6-only.\n'
    printf '      If `npm run rehearse:restore:hosted` reports "Network is unreachable",\n'
    printf '      replace it with the Session pooler URI (port 5432, user postgres.<ref>):\n'
    printf '      Supabase -> Project Settings -> Database -> Connection string -> Session pooler.\n'
    ;;
esac
printf 'Next: npm run preflight && npm run rehearse:restore:hosted\n'
