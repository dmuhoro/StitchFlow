#!/usr/bin/env bash
# ============================================================================
# Booking concurrency proof: 200 simultaneous attempts on one exclusive slot.
#
# Invoked by scripts/verify-db.sh after the migration chain, seed, and
# supabase/tests/booking_engine_test.sql. It runs against the same database,
# using xargs -P 50 for real process-level parallelism.
#
# Expected result: exactly one held booking, 199 `slot_unavailable`, and zero
# duplicate live rows. The GiST exclusion constraint is the final authority.
# ============================================================================
set -euo pipefail

MODE="${VERIFY_DB_MODE:-host}"
CONTAINER="${VERIFY_DB_CONTAINER:-}"
DB_USER="${VERIFY_DB_USER:-postgres}"
DB_NAME="${VERIFY_DB_NAME:-stitchflow_verify}"
DB_PASSWORD="${VERIFY_DB_PASSWORD:-stitchflow_local_only}"
HOST_USER="${VERIFY_PGUSER:-postgres}"
HOST_DATABASE="${VERIFY_PGDATABASE:-stitchflow_verify}"
HOST_PASSWORD="${PGPASSWORD:-postgres}"

RESOURCE_ID="c0000001-0001-4001-8001-000000000001"
ATELIER_ID="11111111-1111-1111-1111-111111111111"
CLIENT_ID="a3333333-3333-3333-3333-333333333333"
SLOT_START="2027-06-01 10:00+00"
SLOT_END="2027-06-01 11:00+00"
ATTEMPTS=200
PARALLEL=50

run_psql() {
  if [[ "$MODE" == "docker" ]]; then
    if [[ -z "$CONTAINER" ]]; then
      echo "ERROR: docker mode requires VERIFY_DB_CONTAINER." >&2
      return 1
    fi
    docker exec -i -e PGPASSWORD="$DB_PASSWORD" "$CONTAINER" \
      psql -v ON_ERROR_STOP=1 -q -At -U "$DB_USER" -d "$DB_NAME" "$@"
  else
    PGPASSWORD="$HOST_PASSWORD" psql -v ON_ERROR_STOP=1 -q -At \
      -U "$HOST_USER" -d "$HOST_DATABASE" "$@"
  fi
}

OUT="$(mktemp)"
ERR="$(mktemp)"

cleanup() {
  run_psql -c "delete from public.booking_resources where id = '$RESOURCE_ID';" \
    >/dev/null 2>&1 || true
  rm -f "$OUT" "$ERR"
}
trap cleanup EXIT

echo "==> concurrency fixture (resource $RESOURCE_ID)"
run_psql <<SQL
insert into public.booking_resources (
  id, atelier_id, kind, display_name, capacity, timezone, active
) values (
  '$RESOURCE_ID', '$ATELIER_ID', 'cutter', 'Concurrency Proof Cutter', 1, 'UTC', true
)
on conflict (id) do update set active = true;

insert into public.resource_availability_rules (
  atelier_id, resource_id, weekday, starts_at, ends_at
)
select '$ATELIER_ID', '$RESOURCE_ID', w, '00:00'::time, '23:59'::time
from generate_series(0, 6) as w
where not exists (
  select 1 from public.resource_availability_rules r
  where r.resource_id = '$RESOURCE_ID'
    and r.weekday = w
    and r.starts_at = '00:00'::time
    and r.ends_at = '23:59'::time
);
SQL

VERIFY_HOLD_SQL="
begin;
set local role authenticated;
set local \"request.jwt.claims\" = '{\"sub\": \"$CLIENT_ID\", \"role\": \"authenticated\"}';
select public.hold_slot(
  '$ATELIER_ID',
  '$RESOURCE_ID',
  tstzrange('$SLOT_START', '$SLOT_END', '[)'),
  'fitting',
  '$CLIENT_ID'
);
commit;
"
export VERIFY_HOLD_SQL
export MODE CONTAINER DB_USER DB_NAME DB_PASSWORD HOST_USER HOST_DATABASE HOST_PASSWORD
export -f run_psql

echo "==> $ATTEMPTS attempts, $PARALLEL in flight"
if ! seq 1 "$ATTEMPTS" | xargs -P "$PARALLEL" -I{} bash -c 'run_psql -c "$VERIFY_HOLD_SQL"' >"$OUT" 2>"$ERR"; then
  echo "ERROR: a concurrent psql attempt failed." >&2
  cat "$ERR" >&2
  exit 1
fi

TOTAL="$(wc -l < "$OUT" | tr -d ' ')"
SUCCESS="$(grep -c '"booking_id"' "$OUT" || true)"
UNAVAILABLE="$(grep -c 'slot_unavailable' "$OUT" || true)"
OTHER=$((TOTAL - SUCCESS - UNAVAILABLE))

echo "attempts=$TOTAL success=$SUCCESS slot_unavailable=$UNAVAILABLE other=$OTHER"

[[ "$TOTAL" == "$ATTEMPTS" ]] || { echo "ERROR: expected $ATTEMPTS outputs, got $TOTAL" >&2; exit 1; }
[[ "$SUCCESS" == "1" ]] || { echo "ERROR: expected exactly 1 success, got $SUCCESS" >&2; exit 1; }
[[ "$UNAVAILABLE" == "$((ATTEMPTS - 1))" ]] || {
  echo "ERROR: expected $((ATTEMPTS - 1)) slot_unavailable, got $UNAVAILABLE" >&2
  exit 1
}
[[ "$OTHER" == "0" ]] || { echo "ERROR: unexpected result kinds: $OTHER" >&2; exit 1; }

LIVE_ROWS="$(run_psql -c "
  select count(*) from public.bookings
  where resource_id = '$RESOURCE_ID'
    and status in ('held', 'confirmed')
    and during && tstzrange('$SLOT_START', '$SLOT_END', '[)');
")"
TOTAL_ROWS="$(run_psql -c "
  select count(*) from public.bookings where resource_id = '$RESOURCE_ID';
")"

[[ "$LIVE_ROWS" == "1" ]] || {
  echo "ERROR: expected 1 live row for the slot, got $LIVE_ROWS" >&2
  exit 1
}
[[ "$TOTAL_ROWS" == "1" ]] || {
  echo "ERROR: expected 1 persisted booking row, got $TOTAL_ROWS" >&2
  exit 1
}

echo "PASS [booking] concurrency: attempts=$ATTEMPTS success=$SUCCESS slot_unavailable=$UNAVAILABLE live_rows=$LIVE_ROWS duplicates=0"
