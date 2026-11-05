#!/usr/bin/env bash
# ============================================================================
# Reproduce the StitchFlow database from tracked migrations and prove RLS.
#
#   ./scripts/verify-db.sh docker   # local: disposable postgres:16 container
#   ./scripts/verify-db.sh host     # CI: service container, uses PG* env vars
#
# The chain is applied in filename order to an empty database, then seed.sql,
# then supabase/tests/rls_isolation_test.sql. Any SQL error or failed assertion
# aborts with a non-zero exit code.
# ============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODE="${1:-docker}"
DB_NAME="stitchflow_verify"
DB_USER="postgres"
DB_PASSWORD="stitchflow_local_only"

if [[ "$MODE" == "docker" ]]; then
  command -v docker >/dev/null 2>&1 || { echo "ERROR: docker is required for docker mode."; exit 1; }
  CONTAINER="stitchflow-verify-$$"
  cleanup() { docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; }
  trap cleanup EXIT

  echo "==> starting disposable postgres:16 ($CONTAINER)"
  docker run -d --name "$CONTAINER" \
    -e POSTGRES_PASSWORD="$DB_PASSWORD" \
    -e POSTGRES_DB="$DB_NAME" \
    postgres:16 >/dev/null

  # The entrypoint starts a temporary server during init and shuts it down again.
  # Only a real query against the final server proves readiness.
  ready=0
  for _ in $(seq 1 90); do
    if docker exec -e PGPASSWORD="$DB_PASSWORD" "$CONTAINER" \
      psql -q -U "$DB_USER" -d "$DB_NAME" -c 'select 1' >/dev/null 2>&1; then
      ready=1
      break
    fi
    sleep 1
  done
  if [[ "$ready" != "1" ]]; then
    echo "ERROR: postgres did not become ready."
    docker logs "$CONTAINER" || true
    exit 1
  fi

  PSQL=(docker exec -i -e PGPASSWORD="$DB_PASSWORD" "$CONTAINER" \
    psql -v ON_ERROR_STOP=1 -q -U "$DB_USER" -d "$DB_NAME")
elif [[ "$MODE" == "host" ]]; then
  command -v psql >/dev/null 2>&1 || { echo "ERROR: psql is required for host mode."; exit 1; }
  export PGPASSWORD="${PGPASSWORD:-postgres}"
  PSQL=(psql -v ON_ERROR_STOP=1 -q -U "${PGUSER:-postgres}" -d "${PGDATABASE:-$DB_NAME}")
else
  echo "ERROR: unknown mode '$MODE' (expected docker or host)."
  exit 1
fi

run_file() {
  local file="$1"
  printf '==> %s\n' "${file#"$ROOT"/}"
  "${PSQL[@]}" -f - < "$file"
}

run_file "$ROOT/scripts/db/supabase-shim.sql"

while IFS= read -r migration; do
  run_file "$migration"
done < <(find "$ROOT/supabase/migrations" -maxdepth 1 -name '*.sql' | sort)

run_file "$ROOT/supabase/seed.sql"
run_file "$ROOT/supabase/tests/rls_isolation_test.sql"

echo "==> structural assertions"
"${PSQL[@]}" <<'SQL'
do $$
declare
  unprotected text;
  missing integer;
begin
  select string_agg(tablename, ', ')
    into unprotected
  from pg_tables
  where schemaname = 'public' and not rowsecurity;

  if unprotected is not null then
    raise exception 'RLS is not enabled on: %', unprotected;
  end if;

  select count(*) into missing
  from information_schema.tables
  where table_schema = 'public'
    and table_name in (
      'ateliers', 'members', 'lookbook_items', 'orders', 'order_financials',
      'order_progress_notes', 'measurements', 'appointments', 'feedback',
      'audit_log'
    );

  if missing <> 10 then
    raise exception 'Expected 9 tenant tables, found %', missing;
  end if;

  raise notice 'RLS enabled on every public table; 10 tenant tables present.';
end $$;
SQL

echo "==> database verification passed"
