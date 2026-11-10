#!/usr/bin/env bash
# ============================================================================
# BACKUP / RESTORE REHEARSAL
# ----------------------------------------------------------------------------
# Rehearsing a restore is the only way to know a restore works. This script
# performs the whole round trip and refuses to report success on a partial one:
#
#   1. produce a dump (or accept a dump file with SOURCE_DB_URL to compare);
#   2. reject an empty, truncated, or schema-less archive BEFORE restoring;
#   3. restore into a fresh, disposable cluster;
#   4. compare row counts, table by table, against the source;
#   5. run the real RLS isolation suite against the RESTORED database;
#   6. assert RLS is still enabled on every public table.
#
# A rehearsal that can only pass is not a rehearsal. Feed it a truncated dump
# (`SOURCE_DUMP_FILE=tests/fixtures/truncated.sql npm run rehearse:restore`) and
# it must fail at step 2.
#
# Modes
#   local  (default) — source is built from the tracked migration chain plus
#                      seed. Proves the procedure and the RLS suite on restored
#                      data, with no hosted credential.
#   hosted           — set SOURCE_DB_URL to a PostgreSQL connection string. This is
#                      the pilot gate: it proves the *pilot's* data restores.
#                      Requires a database password the owner holds; the script
#                      never prints it.
#   provided         — SOURCE_DUMP_FILE without SOURCE_DB_URL is negative-test
#                      input only. It cannot pass because completeness cannot be
#                      compared with the source.
#
# Exit codes: 0 verified; 1 a check failed; 2 a precondition is missing.
# ============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

DB_USER="postgres"
DB_PASSWORD="stitchflow_restore_local_only"
RESTORE_DB="stitchflow_restore"
# verify-db.sh builds its source container with this database name.
DB_NAME_SOURCE="stitchflow_verify"
TARGET="stitchflow-restore-$$"
DUMP_FILE="$(mktemp -t stitchflow-restore-XXXXXX.sql)"
WORK="$(mktemp -d -t stitchflow-rehearsal-XXXXXX)"
SOURCE_CONTAINER=""

# Tables compared row-for-row after the restore. A dump that silently loses the
# booking store or the audit trail is not a backup.
COMPARED_TABLES=(
  ateliers members lookbook_items orders order_financials order_progress_notes measurements
  appointments feedback audit_log invitations booking_resources resource_availability_rules
  blackout_dates bookings idempotency_keys
)

blocked() {
  printf '\nBLOCKED: %s\n' "$1"
  [[ -n "${2:-}" ]] && printf '  remedy: %s\n' "$2"
  exit 2
}
fail() {
  printf '\nFAIL: %s\n' "$1"
  exit 1
}
step() { printf '\n==> %s\n' "$1"; }

command -v docker >/dev/null 2>&1 || blocked "docker is not installed." "Install Docker Engine."
docker info >/dev/null 2>&1 || blocked "the Docker daemon is not reachable." "Start Docker."

cleanup() {
  local status=$?
  docker rm -f "$TARGET" >/dev/null 2>&1 || true
  if [[ -n "${SOURCE_CONTAINER_KEEP:-}" ]]; then
    docker rm -f "$SOURCE_CONTAINER_KEEP" >/dev/null 2>&1 || true
  fi
  rm -rf "$WORK"
  rm -f "$DUMP_FILE"
  exit "$status"
}
trap cleanup EXIT INT TERM

wait_ready() {
  local container="$1" database="$2"
  local ready=0
  for _ in $(seq 1 90); do
    if docker exec -e PGPASSWORD="$DB_PASSWORD" "$container" \
      psql -q -U "$DB_USER" -d "$database" -c 'select 1' >/dev/null 2>&1; then
      ready=1
      break
    fi
    sleep 1
  done
  [[ "$ready" == "1" ]] || fail "$container did not become ready."
}

start_target() {
  docker run -d --name "$TARGET" \
    -e POSTGRES_PASSWORD="$DB_PASSWORD" \
    -e POSTGRES_DB="$RESTORE_DB" \
    postgres:16 >/dev/null
  wait_ready "$TARGET" "$RESTORE_DB"
}

# --- 1. source --------------------------------------------------------------
MODE="local"
if [[ -n "${SOURCE_DB_URL:-}" ]]; then MODE="hosted"; fi
if [[ -n "${SOURCE_DUMP_FILE:-}" && "$MODE" == "local" ]]; then MODE="provided"; fi

if [[ -n "${SOURCE_DUMP_FILE:-}" ]]; then
  step "using the supplied dump file"
  [[ -f "$SOURCE_DUMP_FILE" ]] || blocked "SOURCE_DUMP_FILE does not exist." "Point it at a .sql archive."
  cp "$SOURCE_DUMP_FILE" "$DUMP_FILE"
else
  case "$MODE" in
    local)
      step "building the source database from the tracked migration chain"
      CONTAINER_FILE="$WORK/source-container"
      VERIFY_DB_KEEP=1 \
      VERIFY_DB_CONTAINER_NAME="stitchflow-rehearsal-source-$$" \
      VERIFY_DB_CONTAINER_FILE="$CONTAINER_FILE" \
        bash scripts/verify-db.sh docker >"$WORK/source-build.log" 2>&1 \
        || { tail -30 "$WORK/source-build.log"; fail "the source database could not be built."; }
      SOURCE_CONTAINER="$(cat "$CONTAINER_FILE")"
      SOURCE_CONTAINER_KEEP="$SOURCE_CONTAINER"

      step "dumping the source database"
      docker exec "$SOURCE_CONTAINER" \
        pg_dump -U "$DB_USER" -d "$DB_NAME_SOURCE" --no-owner >"$DUMP_FILE" \
        || fail "pg_dump failed."
      ;;
    hosted)
      command -v docker >/dev/null 2>&1 || blocked "docker is required for the hosted dump." ""
      # Reachability and the credential are proven from inside the same
      # container that will run pg_dump. Without this, an unreachable host is
      # reported as "the dump failed" — which reads like a gate rejected the
      # data when nothing about the data was tested.
      step "probing the hosted source from the rehearsal container"
      if ! node scripts/ops/source-db.mjs probe; then
        # The probe classifies network, DNS, TLS, and credential failures,
        # prints the remedy, and exits 2.
        exit 2
      fi

      step "dumping the hosted source named by SOURCE_DB_URL"
      if ! node scripts/ops/source-db.mjs dump >"$DUMP_FILE"; then
        blocked "the source answered the reachability probe but pg_dump failed." \
          "A reachable, authenticated source that cannot be dumped is a privilege or tooling limitation, not a verdict on the data. The pg_dump error above names the cause."
      fi
      ;;
  esac
fi

# --- 1b. self-controls: prove this gate rejects bad archives -----------------
# A rehearsal that has only ever passed is decoration. Before trusting the real
# dump, derive three bad archives from it and assert each is rejected with exit
# code 1 (a gate firing). Exit code 2 would mean a precondition failed, which is
# not evidence that the gate works.
if [[ "${STITCHFLOW_REHEARSAL_SELF_TEST:-1}" == "1" && -z "${SOURCE_DUMP_FILE:-}" ]]; then
  step "self-controls: the archive checks must reject bad input"

  run_control() {
    local label="$1" expected="$2" file="$3" code
    set +e
    STITCHFLOW_REHEARSAL_SELF_TEST=0 SOURCE_DUMP_FILE="$file" \
      bash "${BASH_SOURCE[0]}" >"$WORK/control.log" 2>&1
    code=$?
    set -e
    if [[ "$code" != "$expected" ]]; then
      tail -6 "$WORK/control.log"
      fail "control \"$label\" exited $code, expected $expected."
    fi
    printf '    %-52s rejected (exit %s)\n' "$label" "$code"
  }

  head -c 1000 "$DUMP_FILE" >"$WORK/truncated.sql"
  sed '/CREATE TABLE public.audit_log/,/^);$/d' "$DUMP_FILE" >"$WORK/incomplete.sql"
  sed '0,/CREATE TABLE public.ateliers/s//CREATE TABLE public.ateliers BROKEN/' \
    "$DUMP_FILE" >"$WORK/unreplayable.sql"

  grep -q 'CREATE TABLE public.audit_log' "$WORK/incomplete.sql" \
    && fail "control setup failed: the incomplete archive still has audit_log."
  grep -q 'CREATE TABLE public.ateliers BROKEN' "$WORK/unreplayable.sql" \
    || fail "control setup failed: the unreplayable archive was not corrupted."

  run_control "truncated archive (1 KB)" 1 "$WORK/truncated.sql"
  run_control "archive missing a core table" 1 "$WORK/incomplete.sql"
  run_control "archive with unreplayable SQL" 1 "$WORK/unreplayable.sql"
elif [[ "${STITCHFLOW_REHEARSAL_SELF_TEST:-1}" == "1" ]]; then
  step "skipping derived archive controls for the supplied dump"
fi

# --- 2. validate the archive BEFORE restoring -------------------------------
step "validating the archive"

DUMP_BYTES="$(wc -c <"$DUMP_FILE" | tr -d ' ')"
MIN_BYTES=20000
[[ "$DUMP_BYTES" -ge "$MIN_BYTES" ]] \
  || fail "the dump is $DUMP_BYTES bytes, below the ${MIN_BYTES}-byte floor. It is empty or truncated."

for table in "${COMPARED_TABLES[@]}"; do
  grep -Fq "CREATE TABLE public.$table" "$DUMP_FILE" \
    || fail "the dump does not contain public.$table; it is not a complete StitchFlow archive."
done

for marker in 'ROW LEVEL SECURITY'; do
  grep -q "$marker" "$DUMP_FILE" \
    || fail "the dump does not contain \"$marker\"; it is not a complete StitchFlow archive."
done

if grep -qi 'pg_dump: error' "$DUMP_FILE"; then
  fail "the dump contains a pg_dump error message."
fi

echo "    ${DUMP_BYTES} bytes, structural markers present"

# --- 3. restore -------------------------------------------------------------
step "restoring into a disposable cluster"
start_target

docker exec -i -e PGPASSWORD="$DB_PASSWORD" "$TARGET" \
  psql -v ON_ERROR_STOP=1 -q -U "$DB_USER" -d "$RESTORE_DB" -f - \
  < scripts/db/restore-prerequisites.sql >/dev/null \
  || fail "could not create the Supabase API roles on the restore target."

if ! docker exec -i -e PGPASSWORD="$DB_PASSWORD" "$TARGET" \
  psql -v ON_ERROR_STOP=1 -q -U "$DB_USER" -d "$RESTORE_DB" -f - \
  <"$DUMP_FILE" >"$WORK/restore.log" 2>&1; then
  tail -20 "$WORK/restore.log"
  fail "psql restore exited non-zero; the archive does not replay cleanly."
fi

# --- 4. row-count comparison ------------------------------------------------
if [[ "$MODE" == "provided" ]]; then
  blocked "a supplied full dump cannot prove source/restore completeness without SOURCE_DB_URL." \
    "Set SOURCE_DB_URL for read-only source row-count comparison."
fi

step "comparing row counts against the source"
if [[ "$MODE" == "hosted" ]]; then
  step "reading source row counts without modifying the source"
  SOURCE_COUNTS="$(node scripts/ops/source-db.mjs counts)" \
    || fail "could not compare the restored rows with the source database."
fi

if [[ "$MODE" == "local" || "$MODE" == "hosted" ]]; then
  SOURCE_CONTAINER="${SOURCE_CONTAINER:-}"
  if [[ "$MODE" == "local" ]]; then
    [[ -n "$SOURCE_CONTAINER" ]] || fail "internal error: the source container name was not captured."
  fi
  for table in "${COMPARED_TABLES[@]}"; do
    if [[ "$MODE" == "local" ]]; then
      source_count="$(docker exec -e PGPASSWORD="$DB_PASSWORD" "$SOURCE_CONTAINER" \
        psql -tAq -U "$DB_USER" -d "$DB_NAME_SOURCE" -c "select count(*) from public.$table")"
    else
      source_count="$(awk -F'|' -v table="$table" '$1 == table { print $2 }' <<<"$SOURCE_COUNTS")"
    fi
    restored_count="$(docker exec -e PGPASSWORD="$DB_PASSWORD" "$TARGET" \
      psql -tAq -U "$DB_USER" -d "$RESTORE_DB" -c "select count(*) from public.$table")"
    [[ -n "$source_count" ]] || fail "source row count for public.$table was missing."
    [[ "$source_count" == "$restored_count" ]] \
      || fail "row count mismatch for public.$table (source $source_count, restored $restored_count)."
    printf '    %-20s %s\n' "$table" "$restored_count"
  done
fi

# --- 5. RLS suite on the restored database ----------------------------------
step "running the RLS isolation suite against the restored database"
docker exec -i -e PGPASSWORD="$DB_PASSWORD" "$TARGET" \
  psql -v ON_ERROR_STOP=1 -q -U "$DB_USER" -d "$RESTORE_DB" -f - \
  < supabase/tests/rls_isolation_test.sql >"$WORK/rls.log" 2>&1 \
  || { tail -25 "$WORK/rls.log"; fail "the RLS isolation suite failed on restored data."; }
echo "    RLS isolation suite passed"

# --- 6. structural check ----------------------------------------------------
step "asserting the restored schema is complete and RLS is enabled"
docker exec -i -e PGPASSWORD="$DB_PASSWORD" "$TARGET" \
  psql -v ON_ERROR_STOP=1 -q -U "$DB_USER" -d "$RESTORE_DB" <<'SQL' >"$WORK/structure.log" 2>&1 \
  || { tail -20 "$WORK/structure.log"; fail "the restored schema is missing RLS coverage."; }
do $$
declare
  unprotected text;
  missing text;
  expected_tables text[] := array[
    'ateliers', 'members', 'lookbook_items', 'orders', 'order_financials',
    'order_progress_notes', 'measurements', 'appointments', 'feedback', 'audit_log',
    'invitations', 'booking_resources', 'resource_availability_rules', 'blackout_dates',
    'bookings', 'idempotency_keys'
  ];
begin
  select string_agg(required.table_name, ', ')
    into missing
  from unnest(expected_tables) as required(table_name)
  where not exists (
    select 1
    from information_schema.tables t
    where t.table_schema = 'public'
      and t.table_type = 'BASE TABLE'
      and t.table_name = required.table_name
  );
  if missing is not null then
    raise exception 'restored schema is missing public tables: %', missing;
  end if;

  select string_agg(tablename, ', ') into unprotected
  from pg_tables where schemaname = 'public' and not rowsecurity;
  if unprotected is not null then
    raise exception 'RLS is not enabled on restored tables: %', unprotected;
  end if;
  raise notice 'RLS enabled on every restored public table.';
end $$;
SQL
echo "    structural check passed"

printf '\nPASS: backup -> restore -> RLS rehearsal verified (%s source).\n' "$MODE"
